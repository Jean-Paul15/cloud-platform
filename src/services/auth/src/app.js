/**
 * Application Express - Service d'Authentification
 */

require('dotenv').config({ path: '../../../.env' });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const adminRoutes = require('./routes/admin.routes');
const errorHandler = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3000;

// === MIDDLEWARES SECURITE ===
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost'],
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));

// Rate limiting: 100 req / 15 min
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Trop de requetes, reessayez dans 15 minutes'
});
app.use('/register', limiter);
app.use('/login', limiter);

// Logging
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// === ROUTES ===
app.use('/', authRoutes);
app.use('/projects', projectRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route non trouvee' });
});

// Erreurs
app.use(errorHandler);

// === DEMARRAGE ===
app.listen(PORT, () => {
  logger.info(`[Auth Service] Port ${PORT} - ${process.env.NODE_ENV || 'dev'}`);
});

process.on('SIGTERM', () => {
  logger.info('[Auth Service] Arret gracieux...');
  process.exit(0);
});

module.exports = app;
