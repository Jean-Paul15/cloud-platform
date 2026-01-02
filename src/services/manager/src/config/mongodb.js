// Configuration MongoDB - Manager Service

const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

// URI sans auth par défaut - le cluster sharded n'utilise pas d'authentification
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo-router:27017';
const DB_NAME = 'userdata';

let client;
let db;

async function connectMongo() {
  try {
    client = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000
    });

    await client.connect();
    db =client.db(DB_NAME);

    logger.info('[MongoDB] Connexion établie au cluster');
    return db;
  } catch (error) {
    logger.error(`[MongoDB] Erreur de connexion: ${error.message}`);
    throw error;
  }
}

async function getDatabase() {
  if (!db) {
    return await connectMongo();
  }
  return db;
}

process.on('SIGINT', async () => {
  if (client) {
    await client.close();
  }
});

module.exports = { connectMongo, getDatabase };
