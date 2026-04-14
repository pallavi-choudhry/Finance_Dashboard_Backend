const Transaction = require('../models/Transaction');

// @desc    Get dashboard data
// @route   GET /api/dashboard
// @access  Private (Viewer, Analyst, Admin)
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all transactions
    const transactions = await Transaction.find({ createdBy: userId });
    
    // Calculate totals
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryTotals = {};
    
    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount;
      } else {
        totalExpenses += transaction.amount;
      }
      
      if (!categoryTotals[transaction.category]) {
        categoryTotals[transaction.category] = { income: 0, expense: 0 };
      }
      if (transaction.type === 'income') {
        categoryTotals[transaction.category].income += transaction.amount;
      } else {
        categoryTotals[transaction.category].expense += transaction.amount;
      }
    });
    
    const netBalance = totalIncome - totalExpenses;
    
    // Prepare category totals
    const categoryTotalsArray = Object.entries(categoryTotals).map(([category, amounts]) => ({
      category,
      type: amounts.income > amounts.expense ? 'Income' : 'Expense',
      total: amounts.income > amounts.expense ? amounts.income : amounts.expense
    }));
    
    // Get recent activity (last 5 transactions)
    const recentActivity = await Transaction.find({ createdBy: userId })
      .sort({ date: -1 })
      .limit(5);
    
    // Get monthly trends (last 12 months) + yearly rollup
    const trends = await getMonthlyTrends(userId);
    const yearlyTrends = buildYearlyTrends(trends);
    
    res.status(200).json({
      success: true,
      data: {
        totals: {
          totalIncome: totalIncome.toFixed(2),
          totalExpenses: totalExpenses.toFixed(2),
          netBalance: netBalance.toFixed(2)
        },
        categoryTotals: categoryTotalsArray,
        recentActivity,
        trends,
        yearlyTrends
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

async function getMonthlyTrends(userId) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  
  const transactions = await Transaction.find({
    createdBy: userId,
    date: { $gte: twelveMonthsAgo }
  }).sort({ date: 1 });
  
  const monthlyData = {};
  
  transactions.forEach(transaction => {
    const year = transaction.date.getFullYear();
    const month = transaction.date.getMonth() + 1;
    const key = `${year}-${month.toString().padStart(2, '0')}`;
    
    if (!monthlyData[key]) {
      monthlyData[key] = { income: 0, expense: 0, month, year };
    }
    
    if (transaction.type === 'income') {
      monthlyData[key].income += transaction.amount;
    } else {
      monthlyData[key].expense += transaction.amount;
    }
  });
  
  return Object.entries(monthlyData).map(([period, data]) => ({
    period,
    income: data.income.toFixed(2),
    expense: data.expense.toFixed(2),
    net: (data.income - data.expense).toFixed(2),
    month: data.month,
    year: data.year
  })).reverse();
}

function buildYearlyTrends(monthlyTrends) {
  const yearly = {};

  monthlyTrends.forEach((trend) => {
    if (!yearly[trend.year]) {
      yearly[trend.year] = { year: trend.year, income: 0, expense: 0 };
    }
    yearly[trend.year].income += Number(trend.income);
    yearly[trend.year].expense += Number(trend.expense);
  });

  return Object.values(yearly).map((item) => ({
    year: item.year,
    period: String(item.year),
    income: item.income.toFixed(2),
    expense: item.expense.toFixed(2),
    net: (item.income - item.expense).toFixed(2)
  }));
}