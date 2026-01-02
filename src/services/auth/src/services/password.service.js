/**
 * Service de hachage des mots de passe
 * Utilise bcrypt avec 12 rounds
 */

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

/**
 * Hacher un mot de passe
 * @param {string} password
 * @returns {Promise<string>}
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Vérifier un mot de passe contre son hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  verifyPassword
};
