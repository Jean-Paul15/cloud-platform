/**
 * Schémas de validation Zod pour les instances de base de données
 * Validation stricte des entrées utilisateur
 */

const { z } = require('zod');

// Schéma pour créer une instance
const createInstanceSchema = z.object({
  name: z
    .string()
    .min(3, { message: 'Le nom doit contenir au moins 3 caractères' })
    .max(50, { message: 'Le nom ne peut pas dépasser 50 caractères' })
    .regex(/^[a-zA-Z0-9-_]+$/, {
      message: 'Le nom ne peut contenir que des lettres, chiffres, tirets et underscores'
    }),

  projectId: z
    .string()
    .uuid({ message: 'L\'ID du projet doit être un UUID valide' })
});

// Schéma pour mettre à jour une instance
const updateInstanceSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9-_]+$/)
    .optional(),

  status: z
    .enum(['PROVISIONING', 'RUNNING', 'STOPPED', 'ERROR'])
    .optional()
});

// Schéma pour les paramètres d'URL
const instanceIdSchema = z.object({
  id: z
    .string()
    .uuid({ message: 'ID invalide' })
});

// Schéma pour filtrer par projet
const projectIdQuerySchema = z.object({
  projectId: z
    .string()
    .uuid({ message: 'L\'ID du projet doit être un UUID valide' })
    .optional()
});

module.exports = {
  createInstanceSchema,
  updateInstanceSchema,
  instanceIdSchema,
  projectIdQuerySchema
};
