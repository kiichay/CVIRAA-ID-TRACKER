// Load environment variables first
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from uploads directory
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Serve design assets (e.g. ID card background) from backend/uploads/assets
const bundledAssetsDir = path.join(__dirname, 'uploads', 'assets');
app.use('/assets', express.static(bundledAssetsDir));

// Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API: http://localhost:${PORT}/api`);
});

