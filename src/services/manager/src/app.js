/**
 * Application Express - Service Manager
 */

require('dotenv').config({ path: '../../../.env' });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { connectMongo } = require('./config/mongodb');
const instanceRoutes = require('./routes/instance.routes');
const errorHandler = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.MANAGER_SERVICE_PORT || 3000;

// === MIDDLEWARES SECURITE ===
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost'],
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Trop de requetes, reessayez dans 15 minutes'
});
app.use(limiter);

// Logging
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// === ROUTES ===
app.use('/', instanceRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route non trouvee' });
});

// Erreurs
app.use(errorHandler);

// === DEMARRAGE ===
const startServer = async () => {
  try {
    await connectMongo();
    app.listen(PORT, () => {
      logger.info(`[Manager Service] Port ${PORT} - ${process.env.NODE_ENV || 'dev'}`);
    });
  } catch (error) {
    logger.error(`[Manager Service] Erreur demarrage: ${error.message}`);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', () => {
  logger.info('[Manager Service] Arret gracieux...');
  process.exit(0);
});

module.exports = app;
