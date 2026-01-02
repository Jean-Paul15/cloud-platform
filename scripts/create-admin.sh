#!/bin/bash

# Script pour créer un compte administrateur

# Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='...' ./create-admin.sh
# Si ADMIN_PASSWORD n'est pas défini, un mot de passe aléatoire est généré.
EMAIL="${ADMIN_EMAIL:-admin@example.com}"
PASSWORD="${ADMIN_PASSWORD:-$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)}"

echo "==============================================="
echo "  CRÉATION D'UN COMPTE ADMINISTRATEUR"
echo "==============================================="
echo ""
echo "Email: $EMAIL"
echo "Mot de passe: $PASSWORD"
echo ""

# Créer l'admin via l'API
echo "[INFO] Inscription de l'administrateur..."
RESPONSE=$(curl -k -s -X POST https://localhost/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Extraire l'ID utilisateur
USER_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
    echo "[ERROR] Échec de création du compte"
    echo "$RESPONSE"
    exit 1
fi

echo "[INFO] Utilisateur créé avec ID: $USER_ID"

# Promouvoir en ADMIN dans PostgreSQL
echo "[INFO] Promotion en ADMIN..."
docker exec -i dbaas-postgres-sys psql -U admin -d dbaas_system <<EOF
UPDATE users SET role = 'ADMIN' WHERE id = '$USER_ID';
SELECT id, email, role FROM users WHERE id = '$USER_ID';
EOF

echo ""
echo "==============================================="
echo "   ADMIN CRÉÉ AVEC SUCCÈS"
echo "==============================================="
echo ""
echo "Connexion:"
echo "  Email:    $EMAIL"
echo "  Password: $PASSWORD"
echo "  Role:     ADMIN"
echo ""
echo "Test de connexion:"
echo "  curl -k -X POST https://localhost/auth/login \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d \"{\\\"email\\\":\\\"$EMAIL\\\",\\\"password\\\":\\\"$PASSWORD\\\"}\""
echo ""
