#!/bin/bash

# Script de Backup Automatisé DBaaS
# Sauvegarde PostgreSQL et MongoDB

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "[INFO] Démarrage du backup à $(date)"

# Backup PostgreSQL
echo "[INFO] Backup PostgreSQL..."
docker exec dbaas-postgres-sys pg_dumpall -U admin > "$BACKUP_DIR/postgres_$DATE.sql"

# Backup MongoDB
echo "[INFO] Backup MongoDB..."
docker exec mongo-router mongodump --out="/tmp/mongo_backup_$DATE"
docker cp mongo-router:/tmp/mongo_backup_$DATE "$BACKUP_DIR/"

# Compression
echo "[INFO] Compression des backups..."
cd "$BACKUP_DIR"
tar -czf "backup_$DATE.tar.gz" postgres_$DATE.sql mongo_backup_$DATE
rm -rf postgres_$DATE.sql mongo_backup_$DATE

# Rotation (garder seulement les 7 derniers)
ls -t backup_*.tar.gz | tail -n +8 | xargs -r rm

echo "[SUCCESS] Backup terminé: backup_$DATE.tar.gz"
echo "[INFO] Taille: $(du -h backup_$DATE.tar.gz | cut -f1)"
