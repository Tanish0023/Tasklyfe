const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed password save karenge
  avatar: { type: String, default: '' },
  workspaces: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);