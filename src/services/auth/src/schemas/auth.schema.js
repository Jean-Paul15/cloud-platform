/**
 * Schémas de validation Zod pour l'authentification
 * Validation stricte des entrées utilisateur
 */

const { z } = require('zod');

// Schéma pour l'inscription
const registerSchema = z.object({
  email: z
    .string()
    .email({ message: 'Email invalide' })
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(12, { message: 'Le mot de passe doit contenir au moins 12 caractères' })
    .regex(/[A-Z]/, { message: 'Le mot de passe doit contenir au moins une majuscule' })
    .regex(/[a-z]/, { message: 'Le mot de passe doit contenir au moins une minuscule' })
    .regex(/[0-9]/, { message: 'Le mot de passe doit contenir au moins un chiffre' })
    .regex(/[^A-Za-z0-9]/, { message: 'Le mot de passe doit contenir au moins un caractère spécial' })
});

// Schéma pour la connexion
const loginSchema = z.object({
  email: z
    .string()
    .email({ message: 'Email invalide' })
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(1, { message: 'Le mot de passe est requis' })
});

// Schéma pour la vérification de token
const verifyTokenSchema = z.object({
  token: z
    .string()
    .min(1, { message: 'Le token est requis' })
});

// Schéma pour le refresh token
const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, { message: 'Le refresh token est requis' })
});

// Schéma pour la création de projet
const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Le nom du projet est requis' })
    .max(100, { message: 'Le nom du projet ne doit pas dépasser 100 caractères' })
    .trim()
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyTokenSchema,
  refreshTokenSchema,
  createProjectSchema
};
