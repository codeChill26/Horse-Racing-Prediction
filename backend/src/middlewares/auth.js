// backend/src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis'); // Nạp instance kết nối Redis Docker đã tạo

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1]; // Trích xuất chuỗi token vật lý
    
    // 1. Kiểm tra chữ ký số bằng thuật toán toán học (Stateless check)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 2. Kiểm tra sự tồn tại vật lý trong bộ nhớ RAM của Redis Docker (Stateful check)
    // Cấu trúc key phải khớp chính xác với cấu trúc lúc ta lưu ở hàm login của tầng Service
    const redisKey = `accessToken:${decoded.sub}:${token}`;
    const tokenStatus = await redisClient.get(redisKey);
    
    if (!tokenStatus) {
      // Nếu không tìm thấy key, chứng tỏ người dùng đã Logout hoặc đã bị hủy phiên từ xa
      return res.status(401).json({ error: 'Token has been revoked or logged out. Access denied.' });
    }

    // Đính kèm ngược thông tin payload và token vào đối tượng req để các Controller phía sau sử dụng
    req.user = decoded;
    req.token = token; 

    return next(); // Mở cửa cho request đi tiếp vào tầng Controller xử lý nghiệp vụ
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired access token.' });
  }
};