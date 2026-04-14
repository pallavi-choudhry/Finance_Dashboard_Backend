const Record = require('../models/Record');

// @desc    Get all records
// @route   GET /api/records
// @access  Private (Viewer+, Analyst+, Admin)
exports.getRecords = async (req, res) => {
  try {
    let query;
    
    // If user is not admin, only show their records
    if (req.user.role.name !== 'admin') {
      query = Record.find({ createdBy: req.user.id });
    } else {
      query = Record.find();
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Record.countDocuments(query);

    query = query.skip(startIndex).limit(limit).sort('-createdAt');

    // Execute query
    const records = await query.populate('createdBy', 'name email');

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: records.length,
      total,
      pagination,
      data: records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single record
// @route   GET /api/records/:id
// @access  Private
exports.getRecord = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).populate('createdBy', 'name email');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    // Check ownership or admin
    if (record.createdBy._id.toString() !== req.user.id && req.user.role.name !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this record'
      });
    }

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create record
// @route   POST /api/records
// @access  Private (Analyst+, Admin)
exports.createRecord = async (req, res) => {
  try {
    // Add user to req.body
    req.body.createdBy = req.user.id;

    const record = await Record.create(req.body);

    res.status(201).json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update record
// @route   PUT /api/records/:id
// @access  Private (Analyst+ for own records, Admin for all)
exports.updateRecord = async (req, res) => {
  try {
    let record = await Record.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    // Check ownership or admin
    if (record.createdBy.toString() !== req.user.id && req.user.role.name !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this record'
      });
    }

    // Add updated by user
    req.body.updatedBy = req.user.id;

    record = await Record.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete record
// @route   DELETE /api/records/:id
// @access  Private (Admin only)
exports.deleteRecord = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    // Check if admin
    if (req.user.role.name !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete records'
      });
    }

    await record.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/records/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    let query;
    
    if (req.user.role.name !== 'admin') {
      query = { createdBy: req.user.id };
    } else {
      query = {};
    }

    const totalRecords = await Record.countDocuments(query);
    const totalIncome = await Record.aggregate([
      { $match: { ...query, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpense = await Record.aggregate([
      { $match: { ...query, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const recentRecords = await Record.find(query)
      .sort('-createdAt')
      .limit(5)
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      data: {
        totalRecords,
        totalIncome: totalIncome[0]?.total || 0,
        totalExpense: totalExpense[0]?.total || 0,
        balance: (totalIncome[0]?.total || 0) - (totalExpense[0]?.total || 0),
        recentRecords
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};