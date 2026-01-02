# API Admin - Documentation Complète

## Vue d'ensemble

L'API Admin permet la gestion complète de la plateforme DBaaS. Toutes les routes nécessitent :
- Un token JWT valide (Authorization: Bearer <token>)
- Le rôle **ADMIN**

## Base URL

```
https://localhost/auth/admin
```

---

## Gestion des Utilisateurs

### 1. Lister tous les utilisateurs

**Endpoint :** `GET /admin/users`

**Headers :**
```
Authorization: Bearer <admin_token>
```

**Réponse (200 OK) :**
```json
{
  "users": [
    {
      "id": "uuid-123...",
      "email": "alice@example.com",
      "role": "DEVELOPER",
      "createdAt": "2026-01-02T...",
      "projectCount": 3
    }
  ],
  "total": 1
}
```

---

### 2. Voir les détails d'un utilisateur

**Endpoint :** `GET /admin/users/:id`

**Headers :**
```
Authorization: Bearer <admin_token>
```

**Réponse (200 OK) :**
```json
{
  "user": {
    "id": "uuid-123...",
    "email": "alice@example.com",
    "role": "DEVELOPER",
    "createdAt": "2026-01-02T...",
    "updatedAt": "2026-01-02T...",
    "projects": [
      {
        "id": "project-uuid-456...",
        "name": "MyShop E-commerce",
        "createdAt": "2026-01-02T..."
      }
    ]
  }
}
```

**Erreur (404) :**
```json
{
  "success": false,
  "message": "Utilisateur non trouvé"
}
```

---

### 3. Changer le rôle d'un utilisateur

**Endpoint :** `PATCH /admin/users/:id/role`

**Headers :**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body :**
```json
{
  "role": "ADMIN"
}
```

**Valeurs possibles :** `ADMIN`, `DEVELOPER`, `VIEWER`

**Réponse (200 OK) :**
```json
{
  "success": true,
  "message": "Rôle mis à jour",
  "user": {
    "id": "uuid-123...",
    "email": "alice@example.com",
    "role": "ADMIN",
    "updatedAt": "2026-01-02T..."
  }
}
```

**Erreur (400) :**
```json
{
  "success": false,
  "message": "Rôle invalide. Valeurs autorisées : ADMIN, DEVELOPER, VIEWER"
}
```

---

### 4. Réinitialiser le mot de passe d'un utilisateur

**Endpoint :** `PATCH /admin/users/:id/reset-password`

**Headers :**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body :**
```json
{
  "newPassword": "<nouveau_mot_de_passe>"
}
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "message": "Mot de passe réinitialisé et tous les tokens révoqués"
}
```

**Note :** Cette action :
1. Change le mot de passe de l'utilisateur
2. Révoque tous les refresh tokens existants
3. Force la reconnexion de l'utilisateur

---

### 5. Supprimer un utilisateur

**Endpoint :** `DELETE /admin/users/:id`

**Headers :**
```
Authorization: Bearer <admin_token>
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "message": "Utilisateur supprimé (cascade : 3 projets, 2 tokens)"
}
```

**Note :** Cette action supprime en cascade :
- L'utilisateur
- Tous ses projets
- Tous ses refresh tokens
- (Les instances MongoDB associées doivent être supprimées manuellement via le manager-service)

---

## Gestion des Projets

### 6. Lister tous les projets

**Endpoint :** `GET /admin/projects`

**Headers :**
```
Authorization: Bearer <admin_token>
```

**Réponse (200 OK) :**
```json
{
  "projects": [
    {
      "id": "project-uuid-456...",
      "name": "MyShop E-commerce",
      "userId": "uuid-123...",
      "user": {
        "email": "alice@example.com",
        "role": "DEVELOPER"
      },
      "createdAt": "2026-01-02T..."
    }
  ],
  "total": 1
}
```

---

### 7. Supprimer un projet

**Endpoint :** `DELETE /admin/projects/:id`

**Headers :**
```
Authorization: Bearer <admin_token>
```

**Réponse (200 OK) :**
```json
{
  "success": true,
  "message": "Projet supprimé"
}
```

**Erreur (404) :**
```json
{
  "success": false,
  "message": "Projet non trouvé"
}
```

---

## Monitoring et Statistiques

### 8. Statistiques globales

**Endpoint :** `GET /admin/stats`

**Headers :**
```
Authorization: Bearer <admin_token>
```

**Réponse (200 OK) :**
```json
{
  "stats": {
    "totalUsers": 15,
    "totalProjects": 42,
    "usersByRole": {
      "ADMIN": 2,
      "DEVELOPER": 12,
      "VIEWER": 1
    },
    "recentSignups": [
      {
        "id": "uuid-789...",
        "email": "bob@example.com",
        "role": "DEVELOPER",
        "createdAt": "2026-01-02T10:30:00.000Z"
      },
      {
        "id": "uuid-456...",
        "email": "alice@example.com",
        "role": "DEVELOPER",
        "createdAt": "2026-01-02T09:15:00.000Z"
      }
    ]
  }
}
```

**Note :** `recentSignups` affiche les 5 derniers utilisateurs inscrits.

---

## Erreurs Communes

### 401 Unauthorized

**Cause :** Token manquant ou invalide

```json
{
  "success": false,
  "message": "Token manquant ou invalide"
}
```

**Solution :** Vérifier le header `Authorization: Bearer <token>`

---

### 403 Forbidden

**Cause :** L'utilisateur n'a pas le rôle ADMIN

```json
{
  "success": false,
  "message": "Accès refusé. Rôle administrateur requis."
}
```

**Solution :** Se connecter avec un compte ADMIN

---

## Exemples Complets

### Créer un admin et l'utiliser

#### 1. Créer un compte admin

**Option A : Via le script (recommandé)**

```bash
cd scripts
bash create-admin.sh
```

**Option B : Manuellement**

```bash
# 1. S'inscrire normalement
curl -k -X POST https://localhost/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"<mot_de_passe_admin>"}'

# 2. Promouvoir en ADMIN (via psql)
docker exec -it dbaas-postgres-sys psql -U admin -d dbaas_system -c \
  "UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';"
```

#### 2. Se connecter

```bash
curl -k -X POST https://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"<mot_de_passe_admin>"}'
```

**Copier le token retourné :**

```bash
ADMIN_TOKEN="<jeton_admin>"
```

#### 3. Utiliser les endpoints admin

```bash
# Lister les utilisateurs
curl -k -X GET https://localhost/auth/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Voir les stats
curl -k -X GET https://localhost/auth/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Changer un rôle
curl -k -X PATCH https://localhost/auth/admin/users/<user-id>/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"VIEWER"}'

# Supprimer un utilisateur
curl -k -X DELETE https://localhost/auth/admin/users/<user-id> \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Sécurité

### Protection des routes

Toutes les routes admin sont protégées par deux middlewares :

1. **authMiddleware** : Vérifie que le token JWT est valide
2. **adminOnly** : Vérifie que l'utilisateur a le rôle ADMIN

```javascript
router.use(authMiddleware);
router.use(adminOnly);
```

### Validation des données

- Les rôles sont validés (enum strict : ADMIN, DEVELOPER, VIEWER)
- Les IDs sont validés (format UUID)
- Les mots de passe suivent les règles strictes (12+ caractères, majuscule, chiffre, spécial)

### Audit

Toutes les actions admin sont loggées :

```
[info]: [Admin] alice@admin.com a changé le rôle de bob@dev.com en VIEWER
[info]: [Admin] alice@admin.com a supprimé l'utilisateur charlie@dev.com
```

---

## Architecture

### Fichiers concernés

- **Routes :** `src/services/auth/src/routes/admin.routes.js`
- **Controller :** `src/services/auth/src/controllers/admin.controller.js`
- **Middleware :** `src/services/auth/src/middlewares/admin.middleware.js`
- **Intégration :** `src/services/auth/src/app.js`

### Flux de requête

```
Client
  ↓
Gateway (HTTPS)
  ↓
Auth Service (:3000)
  ↓
authMiddleware (vérifie JWT)
  ↓
adminOnly (vérifie role === 'ADMIN')
  ↓
adminController
  ↓
Prisma (PostgreSQL)
```

---

## Tests

### Test complet du workflow admin

```bash
# 1. Créer un admin
bash scripts/create-admin.sh

# 2. Se connecter
ADMIN_TOKEN=$(curl -k -s -X POST https://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"<mot_de_passe_admin>"}' | jq -r .accessToken)

# 3. Créer un utilisateur test
curl -k -X POST https://localhost/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"<mot_de_passe>"}'

# 4. Lister les utilisateurs (doit montrer 2 utilisateurs)
curl -k -X GET https://localhost/auth/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 5. Voir les stats
curl -k -X GET https://localhost/auth/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 6. Changer le rôle du test user
USER_ID=$(curl -k -s -X GET https://localhost/auth/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.users[] | select(.email=="test@example.com") | .id')

curl -k -X PATCH https://localhost/auth/admin/users/$USER_ID/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"VIEWER"}'

# 7. Vérifier le changement
curl -k -X GET https://localhost/auth/admin/users/$USER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 8. Supprimer le test user
curl -k -X DELETE https://localhost/auth/admin/users/$USER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 9. Vérifier la suppression (doit montrer 1 utilisateur)
curl -k -X GET https://localhost/auth/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Roadmap (Fonctionnalités futures)

- [ ] **Pagination** sur les listes (users, projects)
- [ ] **Filtres** (par rôle, date, etc.)
- [ ] **Recherche** (par email, nom de projet)
- [ ] **Gestion des instances MongoDB** (via manager-service)
- [ ] **Logs d'audit** accessibles via API
- [ ] **Bannissement temporaire** d'utilisateurs
- [ ] **Quotas** par utilisateur (nombre max de projets/instances)
- [ ] **Export** des données (CSV, JSON)

---

**Date de création :** 2026-01-02
**Version :** 1.0
**Auteur :** ADOGLI Jean-Paul
