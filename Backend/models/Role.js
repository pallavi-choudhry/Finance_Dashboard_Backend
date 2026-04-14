const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['viewer', 'analyst', 'admin']
  },
  permissions: {
    viewDashboard: { type: Boolean, default: false },
    viewRecords: { type: Boolean, default: false },
    createRecords: { type: Boolean, default: false },
    updateRecords: { type: Boolean, default: false },
    deleteRecords: { type: Boolean, default: false },
    manageUsers: { type: Boolean, default: false },
    accessInsights: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Role', roleSchema);