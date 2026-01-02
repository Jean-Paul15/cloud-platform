#!/bin/bash

# Script de Tests d'Intégration API
# Teste le workflow complet : register → login → create instance → list → delete

set -e

BASE_URL="http://localhost"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "Tests d'Intégration API DBaaS"
echo "=========================================="
echo ""

# Générer un email unique pour éviter les conflits
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-${TIMESTAMP}@example.com"
TEST_PASSWORD="${TEST_PASSWORD:-$(openssl rand -base64 18 | tr -d "=+/")Aa1!}"

echo "Email de test: $TEST_EMAIL"
echo ""

# Test 1: Inscription
echo "[1/6] Test Inscription..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
  echo -e "${GREEN}✓ Inscription réussie${NC}"
  TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
  echo -e "${RED}✗ Échec d'inscription${NC}"
  echo "$REGISTER_RESPONSE"
  exit 1
fi
echo ""

# Test 2: Login
echo "[2/6] Test Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "success.*true"; then
  echo -e "${GREEN}✓ Login réussi${NC}"
else
  echo -e "${RED}✗ Échec de login${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi
echo ""

# Test 3: Vérification token
echo "[3/6] Test Vérification Token..."
VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/verify" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\"}")

if echo "$VERIFY_RESPONSE" | grep -q "success.*true"; then
  echo -e "${GREEN}✓ Token valide${NC}"
else
  echo -e "${RED}✗ Token invalide${NC}"
  echo "$VERIFY_RESPONSE"
  exit 1
fi
echo ""

# Test 4: Création d'instance
echo "[4/6] Test Création Instance..."
CREATE_INSTANCE=$(curl -s -X POST "$BASE_URL/api/instances" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"test-db-${TIMESTAMP}\",\"userId\":\"user-test-123\"}")

if echo "$CREATE_INSTANCE" | grep -q "success.*true"; then
  echo -e "${GREEN}✓ Instance créée${NC}"
  INSTANCE_ID=$(echo "$CREATE_INSTANCE" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
else
  echo -e "${RED}✗ Échec création instance${NC}"
  echo "$CREATE_INSTANCE"
  exit 1
fi
echo ""

# Test 5: Liste des instances
echo "[5/6] Test Liste Instances..."
LIST_INSTANCES=$(curl -s "$BASE_URL/api/instances?userId=user-test-123")

if echo "$LIST_INSTANCES" | grep -q "success.*true"; then
  echo -e "${GREEN}✓ Liste récupérée${NC}"
  COUNT=$(echo "$LIST_INSTANCES" | grep -o '"count":[0-9]*' | cut -d':' -f2)
  echo "  Nombre d'instances: $COUNT"
else
  echo -e "${RED}✗ Échec liste instances${NC}"
  echo "$LIST_INSTANCES"
  exit 1
fi
echo ""

# Test 6: Suppression d'instance
echo "[6/6] Test Suppression Instance..."
DELETE_INSTANCE=$(curl -s -X DELETE "$BASE_URL/api/instances/$INSTANCE_ID?userId=user-test-123")

if echo "$DELETE_INSTANCE" | grep -q "success.*true"; then
  echo -e "${GREEN}✓ Instance supprimée${NC}"
else
  echo -e "${RED}✗ Échec suppression${NC}"
  echo "$DELETE_INSTANCE"
  exit 1
fi
echo ""

echo "=========================================="
echo -e "${GREEN}✓ TOUS LES TESTS PASSÉS${NC}"
echo "=========================================="
