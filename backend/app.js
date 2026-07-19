// backend/app.js

// Fix: prisma trả về BigInt cho cột BIGINT (WalletTransaction.referenceId).
// Express res.json() gọi JSON.stringify mà BigInt không có toJSON mặc định →
// throw "Do not know how to serialize a BigInt", phá response của admin &
// spectator wallet transactions. Ta đăng ký global ngay tại entry để áp dụng
// cho MỌI response kể cả các module require sau này.
BigInt.prototype.toJSON = function () {
  // Trả về string để giữ nguyên độ chính xác (không mất precision khi >2^53).
  // Mobile/frontend dùng num.tryParse / int.tryParse đều đọc được.
  return this.toString();
};

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var swaggerUi = require('swagger-ui-express');
var openapiSpec = require('./src/openapi');

// Khai báo các bộ định tuyến (Routers)
var indexRouter = require('./src/routes/index');
var usersRouter = require('./src/routes/users');
var authRouter = require('./src/routes/auth'); 
var adminUsersRouter = require('./src/routes/admin/users');
var adminTournamentsRouter = require('./src/routes/admin/tournaments');
var adminHorsesRouter = require('./src/routes/admin/horses');
var adminRacesRouter = require('./src/routes/admin/races');
var adminSettlementRouter = require('./src/routes/admin/settlement');
var tournamentsRouter = require('./src/routes/tournaments');
var horsesRouter = require('./src/routes/horses');
var raceEntriesRouter = require('./src/routes/raceEntries');
var invitationsRouter = require('./src/routes/invitations');
var ownerEntriesRouter = require('./src/routes/owner/entries');
var ownerNotificationsRouter = require('./src/routes/owner/notifications');
var publicRacesRouter = require('./src/routes/races');
var predictionsRouter = require('./src/routes/predictions');
var walletRouter = require('./src/routes/wallet');
var adminWalletsRouter = require('./src/routes/admin/wallets');
var adminHouseRevenueRouter = require('./src/routes/admin/houseRevenue');
var refereeRouter = require('./src/routes/referee');
var adminViolationsRouter = require('./src/routes/admin/violations');
var adminDeviationsRouter = require('./src/routes/admin/deviations');
var jockeyRouter = require('./src/routes/jockey');
var raceResultsRouter = require('./src/routes/raceResults');

var app = express();

// Cấu hình View Engine Setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Đăng ký các Middleware nền tảng
app.use(logger('dev'));
app.use(express.json()); 
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Tích hợp giao diện tài liệu Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Đăng ký phân hệ định tuyến gốc và xác thực tài khoản
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/auth', authRouter); 

// Phân hệ Hồ sơ cá nhân người dùng (Mục HIGH-16)
app.use('/api/me', usersRouter); // Sử dụng usersRouter làm meRouter sạch để bóc tách /violations

// Phân hệ quản trị dành riêng cho ADMIN APIs
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/tournaments', adminTournamentsRouter);
app.use('/api/admin/horses', adminHorsesRouter);
app.use('/api/admin/wallets', adminWalletsRouter);
app.use('/api/admin/house-revenue', adminHouseRevenueRouter);
app.use('/api/admin/deviations', adminDeviationsRouter);

// Gắn kết luồng quyết toán dòng tiền (Publish & Unpublish) lên TRƯỚC để tránh nuốt tham số
app.use('/api/admin/races', adminSettlementRouter);
app.use('/api/admin/races', adminRacesRouter);
app.use('/api/admin/tournaments/:tournamentId/races', adminRacesRouter);

// Quản lý Vi phạm (Violations Module - Mục CRITICAL-10)
app.use('/api/admin/violations', adminViolationsRouter);

// Phân hệ điều hành dành riêng cho TRỌNG TÀI (REFEREES MODULE)
app.use('/api/referee', refereeRouter);
app.use('/api/referees', refereeRouter);

// Phân hệ dành riêng cho JOCKEY (Kỵ sĩ)
app.use('/api/jockey', jockeyRouter);

// Phân hệ dành riêng cho CHỦ NGỰA (HORSE OWNER MODULE)
app.use('/api/owner/entries', ownerEntriesRouter);
app.use('/api/horse-owner', ownerNotificationsRouter);

// Các hệ thống API công khai (Public APIs)
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/horses', horsesRouter);
app.use('/api/races', publicRacesRouter);
app.use('/api/public', raceResultsRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/wallet', walletRouter);

// Khớp nối các cấu trúc bảng lồng chéo (Sub-resources mapping)
app.use('/api/entries', raceEntriesRouter);
app.use('/api/races/:raceId/entries', raceEntriesRouter);

// Bắt lỗi 404 và chuyển tiếp tới Error Handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Trình xử lý ngoại lệ trung tâm (Error Handler)
app.use(function(err, req, res, next) {
  // Nếu là API route → trả JSON
  if (req.path.startsWith('/api/')) {
    return res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  }

  // Web routes → render HTML error page
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;