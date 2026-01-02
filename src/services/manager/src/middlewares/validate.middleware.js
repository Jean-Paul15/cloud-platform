/**
 * Middleware de validation Zod
 * Identique à celui du auth-service pour cohérence
 */

const logger = require('../utils/logger');

/**
 * Middleware factory pour valider les données avec Zod
 * @param {ZodSchema} schema - Schéma Zod pour la validation
 * @returns {Function} Middleware Express
 */
const validate = (schema) => {
  return async (req, res, next) => {
    try {
      // Valider le corps de la requête
      const validatedData = await schema.parseAsync(req.body);
      
      // Remplacer req.body par les données validées et nettoyées
      req.body = validatedData;
      
      next();
    } catch (error) {
      // Erreurs de validation Zod
      if (error.name === 'ZodError') {
        const formattedErrors = error.errors.map(err => ({
          champ: err.path.join('.'),
          message: err.message
        }));

        logger.warn(`[Validation] Échec de validation: ${JSON.stringify(formattedErrors)}`);

        return res.status(400).json({
          success: false,
          message: 'Erreur de validation',
          errors: formattedErrors
        });
      }

      // Autres erreurs
      next(error);
    }
  };
};

module.exports = validate;
