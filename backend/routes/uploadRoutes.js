const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // ✅ NAYA: File System import kiya

// ✅ NAYA LOGIC: Check karo ki 'uploads' folder hai ya nahi. Agar nahi hai toh auto-create kar do.
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 'uploads' directory created automatically!");
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // ✅ SAFETY FIX: File ke naam mein agar spaces honge toh unko dash (-) se replace kar dega
    // Isse Frontend pe image load hone mein kabhi error nahi aayega
    const safeOriginalName = file.originalname.replace(/\s+/g, '-');
    cb(null, Date.now() + '-' + safeOriginalName);
  }
});

const upload = multer({ storage: storage });

// Upload Endpoint
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const baseUrl = process.env.SERVER_URL || 'http://localhost:5000';
  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
  const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'document';

  res.status(200).json({
    message: 'File uploaded successfully',
    fileUrl: fileUrl,
    fileName: req.file.originalname,
    fileType: fileType
  });
});

module.exports = router;