const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        default: 'Editor' // Custom roles allowed here
      }
    }
  ],
  files: [
    {
      name: String,
      url: String,
      type: { 
        type: String, 
        enum: ['document', 'image', 'link'] 
      },
      sender: String,
      createdAt: { 
        type: Date, 
        default: Date.now 
      }
    }
  ],
  notices: [
    {
      text: { 
        type: String, 
        required: true 
      },
      author: { 
        type: String, 
        required: true 
      },
      createdAt: { 
        type: Date, 
        default: Date.now 
      }
    }
  ],
  // 🔔 ✅ FIXED SECTION: Activity Radar Log
  activityLog: [
    {
      action: { type: String },   // e.g., "completed a task"
      userName: { type: String }, // e.g., "Aman"
      type: { type: String },     // 🐛 BUG FIXED HERE: Mongoose ab isko error nahi dega
      createdAt: { 
        type: Date, 
        default: Date.now 
      }
    }
  ],
  noteContent: {
    type: String,
    default: ''
  },
  chatMessages: [
    {
      messageId: String,
      sender: String,
      text: String,
      fileUrl: String,
      fileType: String,
      deletedFor: [String],
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Workspace', workspaceSchema);