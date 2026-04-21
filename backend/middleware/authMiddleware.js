const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Header se token get karo
  const token = req.header('Authorization');

  // Check agar token nahi hai
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Token verify karo (Format: "Bearer <token>")
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    
    // User ID request object mein daal do aage use karne ke liye
    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};