/**
 * Configuration de la base de données PostgreSQL
 * Utilise Prisma ORM pour les requêtes
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Instance unique de Prisma Client (Singleton Pattern)
const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' }
  ]
});

// Gestion des logs Prisma vers Winston
prisma.$on('warn', (e) => {
  logger.warn(`[Prisma] ${e.message}`);
});

prisma.$on('error', (e) => {
  logger.error(`[Prisma] ${e.message}`);
});

// Gestion gracieuse de la fermeture
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
