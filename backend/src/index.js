require('dotenv').config();

// Fail fast — never run with an insecure fallback secret
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env — refusing to start.');
  process.exit(1);
}

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const rfqRoutes = require('./routes/rfq.routes');
const authRoutes = require('./routes/auth.routes');
const supplierRoutes = require('./routes/supplier.routes');
const { startScheduler } = require('./services/scheduler');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow any origin in production if CLIENT_URL is not strictly set
    if (!process.env.CLIENT_URL) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json());

// Store io globally for use in routes
app.set('io', io);

io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);
  socket.on('join_rfq', (rfqId) => {
    socket.join('rfq:' + rfqId);
    console.log(`[Socket] ${socket.id} joined rfq:${rfqId}`);
  });
  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/rfq', rfqRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// If frontend build exists, serve static assets for single-service deployment
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexHtml = path.join(frontendDist, 'index.html');
    return res.sendFile(indexHtml, (err) => {
      if (err) next();
    });
  }
  next();
});

startScheduler(io);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
