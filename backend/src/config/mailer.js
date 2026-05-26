// backend/src/config/mailer.js
const nodemailer = require('nodemailer');
require('dotenv/config');

// Khởi tạo bộ cấu hình kết nối SMTP Server
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // Sử dụng TLS (cổng 587)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Kiểm tra kết nối SMTP khi server khởi động
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Mailer Connection Error:', error.message);
  } else {
    console.log('✔ Connected successfully to SMTP Mail Server');
  }
});

module.exports = transporter;