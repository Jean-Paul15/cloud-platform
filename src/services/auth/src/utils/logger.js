/**
 * Logger centralisé utilisant Winston
 * Logs dans la console et dans des fichiers rotatifs
 */

const winston = require('winston');
const path = require('path');

// Niveaux de logs personnalisés
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Couleurs pour la console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(colors);

// Format personnalisé
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Transports (destinations des logs)
const transports = [
  // Console
  new winston.transports.Console(),
  
  // Fichier pour les erreurs uniquement
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error'
  }),
  
  // Fichier pour tous les logs
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log')
  })
];

// Création du logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports
});

module.exports = logger;
