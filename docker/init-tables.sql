-- Script d'Initialisation des Tables PostgreSQL
-- Base de données: admin (défaut)

-- Créer le type ENUM pour les rôles
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DEVELOPER', 'VIEWER');

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" DEFAULT 'DEVELOPER' NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- Table des projets
CREATE TABLE IF NOT EXISTS "projects" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Table des refresh tokens
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token" TEXT UNIQUE NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS "projects_user_id_idx" ON "projects"("user_id");
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
