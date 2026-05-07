require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { getDb } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

// API routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/projects',  require('./routes/projects'));
app.use('/api/tasks',     require('./routes/tasks'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// SPA fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/index.html')));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

getDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Task Manager API → http://localhost:${PORT}`);
    console.log(`📊 Open app      → http://localhost:${PORT}`);
    console.log(`💡 API health    → http://localhost:${PORT}/api/health\n`);
  });
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });

module.exports = app;
