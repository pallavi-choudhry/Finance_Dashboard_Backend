const Transaction = require('../models/Transaction');

// GET ALL TRANSACTIONS
exports.getTransactions = async (req, res) => {
  try {
    const { type, category, startDate, endDate } = req.query;

    const filter = { createdBy: req.user._id };

    if (type && type !== 'all') filter.type = type;
    if (category && category !== 'all') filter.category = category;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// CREATE TRANSACTION
exports.createTransaction = async (req, res) => {
  try {
    const { amount, type, category, date, description } = req.body;

    if (!amount || !type) {
      return res.status(400).json({
        success: false,
        message: "Amount and type are required"
      });
    }

    const transaction = await Transaction.create({
      amount: Number(amount),
      type,
      category,
      date: date ? new Date(date) : new Date(),
      description,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: transaction
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// UPDATE TRANSACTION
exports.updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    res.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE TRANSACTION
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    res.json({
      success: true,
      message: "Deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};