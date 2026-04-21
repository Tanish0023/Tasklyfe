const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' }, // ✅ Tune description add kiya
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: { type: Date }, // ✅ Date field
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  
  // ✅ EXACT SYNC WITH YOUR FRONTEND: subTasks (title, isCompleted)
  subTasks: [{
    title: String,
    isCompleted: { type: Boolean, default: false }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);