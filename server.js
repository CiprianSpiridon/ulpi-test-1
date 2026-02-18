const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const apiRoutes = require('./routes/api');
const { initializeDatabase } = require('./database/db');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
initializeDatabase();

// Routes
app.use('/api', apiRoutes);

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle URL redirection (must be last route)
app.get('/:shortCode', async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const urlService = require('./services/urlService');

    const result = await urlService.getOriginalUrl(shortCode);
    if (result) {
      // Increment click count and redirect
      await urlService.incrementClickCount(shortCode);
      return res.redirect(result.original_url);
    } else {
      return res.status(404).json({ error: 'Short URL not found' });
    }
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 URL Shortener server running on http://localhost:${PORT}`);
});

module.exports = app;