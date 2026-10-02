const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const accountsRoutes = require('./routes/accounts');
const beneficiariesRoutes = require('./routes/beneficiaries');
const transfersRoutes = require('./routes/transfers');
const notificationsRoutes = require('./routes/notifications');
const branchesRoutes = require('./routes/branches');
const staffRoutes = require('./routes/staff');
const adminRoutes = require('./routes/admin');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Root & Health check endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Fraud Bank API',
    version: '1.0.0',
    health: '/health',
    endpoints: [
      '/auth',
      '/accounts',
      '/transfers',
      '/beneficiaries',
      '/notifications',
      '/branches',
      '/staff',
      '/admin'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Fraud Bank API is healthy', timestamp: new Date() });
});

// Mount Routes
app.use('/auth', authRoutes);
app.use('/accounts', accountsRoutes);
app.use('/beneficiaries', beneficiariesRoutes);
app.use('/transfers', transfersRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/branches', branchesRoutes);
app.use('/staff', staffRoutes);
app.use('/admin', adminRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const message = err.message || 'Internal Server Error';

  if (statusCode === 500) {
    console.error('[Unhandled Server Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message
  });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Fraud Bank Server] Running on http://localhost:${PORT}`);
  });
}

module.exports = app;
