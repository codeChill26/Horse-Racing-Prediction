# Socket.IO + Backend Guide

## Kiến trúc tổng quan

```
Client (React/App)                    Server (Express + Socket.IO)
        │                                      │
        │  connect /notifications              │ initSocket(server)
        ├─────────────────────────────────────►│
        │                                      │
        │  emit: authenticate(token)           │ verify JWT → join room
        ├─────────────────────────────────────►│
        │                                      │
        │  receive: entry:status_changed       │ service emitToUser()
        │◄─────────────────────────────────────┤
        │                                      │
        │  receive: race:gate_opened           │ service emitToAll()
        │◄─────────────────────────────────────┤
```

## File structure

```
backend/src/socket/
├── index.js          — Khởi tạo Socket.IO server, auth middleware, namespace
├── emitter.js        — Helper để emit event từ services (tránh circular dependency)
└── handlers/         — (Tuỳ chọn) Xử lý event từ client → server
```

## Cách hoạt động

### 1. Khởi tạo (`bin/www`)

```js
const { initSocket } = require('../src/socket');
var server = http.createServer(app);
initSocket(server);   // Gắn Socket.IO vào HTTP server
server.listen(port);
```

### 2. Xác thực (`socket/index.js`)

- Client gửi token qua `handshake.auth.token` hoặc `handshake.query.token`
- Server dùng `jsonwebtoken` verify → lấy `userId`, `role`
- Tự động join rooms:
  - `user:{userId}` — nhận notif riêng
  - `admin` — nếu role = ADMIN

### 3. Emit từ service (`socket/emitter.js`)

Có 4 helper function để emit từ bất kỳ service nào:

```js
const { emitToUser, emitToAdmin, emitToRace, emitToAll } = require('../socket/emitter');

// Gửi cho 1 user cụ thể
emitToUser(userId, 'entry:status_changed', { entryId, status });

// Gửi cho tất cả admin (room 'admin')
emitToAdmin('entry:created', { entry });

// Gửi cho những ai đang subscribe race đó (room 'race:{raceId}')
emitToRace(raceId, 'odds:updated', { raceId });

// Gửi cho tất cả connected clients
emitToAll('race:gate_opened', { raceId });
```

### 4. Client subscribe race

```js
const socket = io('http://localhost:3000/notifications', {
  auth: { token: 'jwt...' }
});

// Khi muốn nhận odds update cho race cụ thể
socket.emit('subscribe:race', 1);

// Khi không còn cần
socket.emit('unsubscribe:race', 1);
```

## Danh sách sự kiện

### Server → Client

| Event | Khi nào | Payload | Ai nhận |
|-------|---------|---------|---------|
| `entry:created` | Owner tạo entry hoặc confirm jockey | `{ entry }` | Admin + Jockey (nếu có) |
| `entry:status_changed` | Admin duyệt/từ chối entry | `{ entryId, raceId, status, reason }` | Chủ ngựa |
| `race:gate_opened` | Admin mở cổng đăng ký | `{ raceId }` | Tất cả |
| `race:gate_closed` | Admin đóng cổng | `{ raceId, autoRejectedCount }` | Tất cả |
| `race:results_published` | Admin publish kết quả | `{ raceId, settledCount }` | Tất cả |
| `race:results_unpublished` | Admin unpublish | `{ raceId, rolledBackCount }` | Tất cả |
| `odds:updated` | Tính odds sau khi đóng gate | `{ raceId }` | Những ai subscribe race |
| `invitation:received` | Owner gửi lời mời | `{ invitation }` | Jockey |
| `invitation:accepted` | Jockey chấp nhận | `{ invitation }` | Owner |
| `invitation:declined` | Jockey từ chối | `{ invitation }` | Owner |
| `invitation:confirmed` | Owner confirm (xong) | `{ invitationId, entry }` | Jockey |

## Cách tự implement Socket.IO cho dự án mới (Step by step)

### Bước 1: Cài đặt

```
npm install socket.io
```

### Bước 2: Tạo `socket/index.js`

```js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: '*' } });

  const nsp = io.of('/notifications');

  // Auth middleware
  nsp.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = Number(decoded.sub);
      socket.userRole = decoded.role;
      next();
    } catch (e) {
      next(new Error('Invalid token'));
    }
  });

  nsp.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    if (socket.userRole === 'ADMIN') socket.join('admin');

    socket.on('subscribe:race', (id) => id && socket.join(`race:${id}`));
    socket.on('unsubscribe:race', (id) => id && socket.leave(`race:${id}`));
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket not initialized');
  return io;
}

module.exports = { initSocket, getIO };
```

### Bước 3: Tạo `socket/emitter.js`

```js
const { getIO } = require('./index');

function emitToUser(userId, event, data) {
  try { getIO().of('/notifications').to(`user:${userId}`).emit(event, data); } catch (e) {}
}

function emitToAll(event, data) {
  try { getIO().of('/notifications').emit(event, data); } catch (e) {}
}

module.exports = { emitToUser, emitToAll };
```

### Bước 4: Gắn vào server (thường là `bin/www`)

```js
var { initSocket } = require('../src/socket');
var server = http.createServer(app);
initSocket(server);
server.listen(port);
```

### Bước 5: Emit từ service

```js
const { emitToUser } = require('../socket/emitter');

class SomeService {
  async doSomething(userId) {
    // ... logic ...
    emitToUser(userId, 'event:name', { data: 'hello' });
  }
}
```

### Bước 6: Client kết nối

```js
// React/Vue/vanilla JS
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/notifications', {
  auth: { token: localStorage.getItem('accessToken') }
});

socket.on('entry:status_changed', (data) => {
  console.log('Entry updated:', data);
  // Cập nhật UI
});
```

## Lưu ý

1. **Không await emit** — Socket.IO emit là fire-and-forget, không cần await
2. **Emit sau transaction** — Luôn emit event SAU KHI transaction thành công, không emit bên trong callback
3. **Try/catch emitter** — Helper luôn có try/catch để không crash app nếu socket chưa init (VD: testing)
4. **Namespace** — Dùng namespace `/notifications` để tách biệt với các loại socket khác sau này
5. **JWT tái sử dụng** — Dùng chung access token với REST API, không cần tạo riêng
