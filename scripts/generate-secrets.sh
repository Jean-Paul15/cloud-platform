#!/bin/bash

# Script de Génération de Secrets Cryptographiques
# Usage: ./generate-secrets.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

echo "[INFO] Génération des secrets cryptographiques..."

# Fonction de génération de secret aléatoire (32 bytes en base64)
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-43
}

# Vérifier si .env existe déjà
if [ -f "$ENV_FILE" ]; then
    echo "[WARNING] Le fichier .env existe déjà."
    read -p "Voulez-vous le remplacer ? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "[INFO] Opération annulée."
        exit 0
    fi
    mv "$ENV_FILE" "$ENV_FILE.backup"
    echo "[INFO] Ancien fichier sauvegardé en .env.backup"
fi

# Générer les secrets
JWT_SECRET=$(generate_secret)
POSTGRES_PASSWORD=$(generate_secret)

# Créer le fichier .env
cat > "$ENV_FILE" << EOF
# Configuration générée automatiquement le $(date)
# NE PAS committer ce fichier

# Service d'Authentification
JWT_SECRET=$JWT_SECRET
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Base de Données Système (PostgreSQL)
POSTGRES_USER=admin
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=dbaas_system
POSTGRES_HOST=postgres-sys
POSTGRES_PORT=5432
DATABASE_URL=postgresql://admin:$POSTGRES_PASSWORD@postgres-sys:5432/dbaas_system?schema=public

# Cluster MongoDB (sans authentification pour le cluster shardé)
# Note: L'authentification MongoDB peut être activée ultérieurement si nécessaire
MONGO_URI=mongodb://mongo-router:27017

# Configuration Réseau
GATEWAY_PORT=80
AUTH_SERVICE_PORT=3000
MANAGER_SERVICE_PORT=3000

# Logs et Debug
NODE_ENV=production
LOG_LEVEL=info
EOF

chmod 600 "$ENV_FILE"

echo "[SUCCESS] Fichier .env créé avec succès."
echo "[INFO] Les secrets ont été générés de manière sécurisée."
echo "[SECURITY] Permissions du fichier restreintes à 600 (lecture/écriture propriétaire uniquement)."
