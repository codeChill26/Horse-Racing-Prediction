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

// KHÔNG gọi transporter.verify() lúc khởi động: nó mở kết nối SMTP ngay khi nạp
// module, chỉ để ghi log chứ không chặn gì. Ở môi trường không có SMTP (CI, test,
// máy dev) nó spam "ECONNREFUSED" gây hiểu nhầm là app hỏng. Lỗi gửi mail thật
// vẫn được bắt tại chỗ gọi sendMail (xem services/auth.js).

module.exports = transporter;