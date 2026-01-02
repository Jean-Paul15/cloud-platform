# Politique de Sécurité : Projet DBaaS

## Introduction
La sécurité est la priorité absolue de ce projet. Compte tenu de la nature sensible des données stockées (Big Data), une approche "Security by Design" est appliquée à tous les niveaux.

## 1. Sécurité Réseau

### 1.1 Segmentation (Docker Networks)
*   **Zone Publique (`public-net`)** : Seul l'API Gateway Nginx est exposé (Ports 80/443).
*   **Zone Privée (`private-net`)** : Les microservices (Auth, Manager) et PostgreSQL résident dans un réseau interne.
*   **Zone de Données (`data-net`)** : Le cluster MongoDB est isolé. Seul le service Manager peut y accéder.

### 1.2 Pare-feu et Filtrage
*   Utilisation de `internal: true` sur les réseaux Docker pour bloquer l'accès externe.
*   Seuls les ports 80 et 443 sont exposés à l'hôte.

## 2. Sécurité des Données

### 2.1 Chiffrement en Transit (Implémenté)
*   **HTTPS obligatoire** : Nginx écoute sur le port 443 avec TLS 1.2/1.3.
*   **Certificats SSL** : Script `generate-ssl-certs.sh` pour générer des certificats auto-signés (développement).
*   **Redirection HTTP → HTTPS** : Toutes les requêtes HTTP sont redirigées vers HTTPS.
*   **HSTS** : Header `Strict-Transport-Security` pour forcer HTTPS côté navigateur.

### 2.2 Configuration TLS
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
```

### 2.3 Chiffrement au Repos
*   Les volumes Docker peuvent être chiffrés au niveau de l'hôte.
*   En production : utiliser des solutions comme LUKS ou des volumes cloud chiffrés.

### 2.4 Sauvegardes (Implémenté)
*   Script `backup.sh` pour sauvegardes automatiques PostgreSQL + MongoDB.
*   Compression et rotation (7 jours de rétention).

## 3. Gestion des Identités et Accès (IAM)

### 3.1 Authentification (Implémenté)
*   **JWT (JSON Web Tokens)** : Tokens d'accès avec durée de vie courte (15 minutes).
*   **Refresh Tokens** : Stockés en base PostgreSQL, durée 7 jours, avec rotation.
*   **Rotation des tokens** : À chaque refresh, l'ancien token est invalidé.
*   **Hachage bcrypt** : 12 rounds pour les mots de passe.

### 3.2 Flux d'Authentification
```
1. POST /auth/login → accessToken (15min) + refreshToken (7j)
2. Requêtes API avec Authorization: Bearer <accessToken>
3. Si 401 (expiré) → POST /auth/refresh → nouveaux tokens
4. POST /auth/logout → suppression du refreshToken
```

### 3.3 Autorisation RBAC (Implémenté)
*   Rôles disponibles : `ADMIN`, `DEVELOPER`, `VIEWER`
*   Chaque utilisateur a un rôle par défaut (`DEVELOPER`)
*   Les projets et instances sont liés à l'utilisateur propriétaire

### 3.4 Principe du Moindre Privilège
*   Les instances ne sont accessibles qu'à leur propriétaire
*   Vérification de `user_id` sur chaque opération

## 4. Sécurité Applicative

### 4.1 Validation des Entrées (Implémenté)
*   **Zod** pour la validation stricte des schémas JSON
*   Règles de mot de passe :
    *   Minimum 12 caractères
    *   Au moins 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
*   Sanitisation des emails (lowercase, trim)
*   Validation des UUIDs

### 4.2 Protection contre les Injections
*   **Prisma ORM** : Requêtes paramétrées, pas d'injection SQL possible
*   **MongoDB** : Pas de construction de requêtes avec des strings

### 4.3 Rate Limiting (Implémenté)
| Niveau | Configuration |
|--------|---------------|
| Nginx (Gateway) | 10 req/s par IP, burst 20 |
| Express (Auth) | 100 req/15 min sur /login et /register |

### 4.4 Headers de Sécurité HTTP (Implémenté)
```nginx
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### 4.5 Gestion des Erreurs (Implémenté)
*   Messages d'erreur génériques pour le client
*   Pas de stack traces exposées
*   Logging détaillé côté serveur (Winston)

### 4.6 Logs et Audit (Implémenté)
*   Winston logger avec niveaux (error, warn, info, http, debug)
*   Traçabilité des actions : inscription, connexion, création d'instance
*   Logs des requêtes HTTP (méthode, path, IP)

## 5. Sécurité des Conteneurs

### 5.1 Images Docker
*   Utilisation d'images officielles et légères (Alpine quand disponible)
*   Version fixée (ex: `mongo:5.0`, `postgres:13-alpine`)

### 5.2 Health Checks (Implémenté)
*   Tous les services ont des health checks configurés
*   Redémarrage automatique (`restart: unless-stopped`)

### 5.3 Limites de Ressources (Recommandé en production)
```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
```

## 6. Résumé des Mesures de Sécurité

| Catégorie | Mesure | Statut |
|-----------|--------|--------|
| Réseau | Segmentation 3 zones |  Implémenté |
| Transit | HTTPS TLS 1.2/1.3 |  Implémenté |
| Transit | HSTS |  Implémenté |
| Auth | JWT + Refresh Tokens |  Implémenté |
| Auth | Rotation des tokens |  Implémenté |
| Auth | bcrypt (12 rounds) |  Implémenté |
| Accès | RBAC |  Implémenté |
| Validation | Zod schemas |  Implémenté |
| Rate Limit | Nginx + Express |  Implémenté |
| Headers | Sécurité HTTP |  Implémenté |
| Logs | Winston |  Implémenté |
| Backup | PostgreSQL + MongoDB |  Implémenté |
| Repos | Chiffrement disque | � À configurer sur l'hôte |
| MFA | Authentification 2 facteurs | � Non implémenté |
