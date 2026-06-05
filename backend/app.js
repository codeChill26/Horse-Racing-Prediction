// backend/app.js
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var swaggerUi = require('swagger-ui-express');
var openapiSpec = require('./src/openapi');

var indexRouter = require('./src/routes/index');
var usersRouter = require('./src/routes/users');
// 1. BỔ SUNG: Khai báo file định tuyến Router của cụm Auth
var authRouter = require('./src/routes/auth'); 
var adminUsersRouter = require('./src/routes/admin/users');
var adminTournamentsRouter = require('./src/routes/admin/tournaments');
var adminHorsesRouter = require('./src/routes/admin/horses');
var adminRacesRouter = require('./src/routes/admin/races');
var tournamentsRouter = require('./src/routes/tournaments');
var horsesRouter = require('./src/routes/horses');
var raceEntriesRouter = require('./src/routes/raceEntries');
var invitationsRouter = require('./src/routes/invitations');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json()); // Đã có sẵn để phân tích req.body từ tab Body của Postman
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use('/', indexRouter);
app.use('/users', usersRouter);
// 2. BỔ SUNG: Kích hoạt tiền tố phân vùng URL mạng cho API Auth của bạn
app.use('/api/auth', authRouter); 

// Admin APIs
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/tournaments', adminTournamentsRouter);
app.use('/api/admin/horses', adminHorsesRouter);
app.use('/api/admin/races', adminRacesRouter);

// Public APIs
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/horses', horsesRouter);
app.use('/api/entries', raceEntriesRouter);
app.use('/api/races/:raceId/entries', raceEntriesRouter);

app.use('/api/invitations', invitationsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



module.exports = app;
