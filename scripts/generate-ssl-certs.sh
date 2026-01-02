#!/bin/bash

# Script de génération de certificats SSL auto-signés pour le développement local
# Ces certificats NE DOIVENT PAS être utilisés en production

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSL_DIR="$SCRIPT_DIR/../docker/ssl"

echo "=============================================="
echo " Génération de certificats SSL auto-signés"
echo " (Développement local uniquement)"
echo "=============================================="

# Créer le dossier SSL s'il n'existe pas
mkdir -p "$SSL_DIR"

# Vérifier si les certificats existent déjà
if [ -f "$SSL_DIR/server.crt" ] && [ -f "$SSL_DIR/server.key" ]; then
    echo "[INFO] Des certificats existent déjà dans $SSL_DIR"
    read -p "Voulez-vous les régénérer? (o/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Oo]$ ]]; then
        echo "[INFO] Conservation des certificats existants."
        exit 0
    fi
fi

echo "[INFO] Génération de la clé privée RSA 2048 bits..."
openssl genrsa -out "$SSL_DIR/server.key" 2048

echo "[INFO] Génération du certificat auto-signé (validité: 365 jours)..."
openssl req -new -x509 \
    -key "$SSL_DIR/server.key" \
    -out "$SSL_DIR/server.crt" \
    -days 365 \
    -subj "/C=FR/ST=France/L=Paris/O=DBaaS-Dev/OU=Development/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:dbaas-gateway,IP:127.0.0.1"

# Définir les permissions appropriées
chmod 600 "$SSL_DIR/server.key"
chmod 644 "$SSL_DIR/server.crt"

echo ""
echo "=============================================="
echo " Certificats générés avec succès!"
echo "=============================================="
echo " Clé privée : $SSL_DIR/server.key"
echo " Certificat : $SSL_DIR/server.crt"
echo ""
echo " [ATTENTION] Ces certificats sont auto-signés."
echo " Votre navigateur affichera un avertissement de sécurité."
echo " C'est normal en développement local."
echo "=============================================="
