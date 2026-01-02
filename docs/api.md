# Documentation API - DBaaS

Base URL : `https://localhost` (certificats auto-signés, utiliser `-k` avec curl)

## Authentification

### POST /auth/register

Inscription d'un nouvel utilisateur.

```json
// Request
{ "email": "user@example.com", "password": "<mot_de_passe>" }

// Response 201
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "role": "DEVELOPER" },
    "accessToken": "<jeton>",
    "refreshToken": "abc123..."
  }
}
```

### POST /auth/login

```json
// Request
{ "email": "user@example.com", "password": "<mot_de_passe>" }

// Response 200
{
  "success": true,
  "data": { "user": {...}, "accessToken": "...", "refreshToken": "..." }
}
```

### POST /auth/refresh

Rafraichir les tokens (rotation automatique).

```json
// Request
{ "refreshToken": "ancien-refresh-token" }

// Response 200
{ "success": true, "data": { "accessToken": "new", "refreshToken": "new" } }
```

### POST /auth/logout

```json
// Request
{ "refreshToken": "..." }

// Response 200
{ "success": true, "message": "Deconnexion reussie" }
```

### POST /auth/verify

```json
// Request
{ "token": "access-token" }

// Response 200
{ "success": true, "data": { "userId": "...", "email": "...", "role": "..." } }
```

## Projets (Authentifie)

Header requis : `Authorization: Bearer <accessToken>`

### POST /auth/projects

```json
// Request
{ "name": "Mon Projet" }

// Response 201
{ "success": true, "data": { "id": "uuid", "name": "Mon Projet", "userId": "..." } }
```

### GET /auth/projects

```json
// Response 200
{ "success": true, "data": [{ "id": "...", "name": "..." }] }
```

### DELETE /auth/projects/:id

```json
// Response 200
{ "success": true, "message": "Projet supprime" }
```

## Instances (Authentifie)

Header requis : `Authorization: Bearer <accessToken>`

### POST /api/instances

```json
// Request
{ "name": "ma-database", "projectId": "project-uuid" }

// Response 201
{
  "success": true,
  "data": {
    "_id": "uuid",
    "name": "ma-database",
    "project_id": "...",
    "status": "RUNNING",
    "connection_string": "mongodb://..."
  }
}
```

### GET /api/instances

```json
// Query: ?projectId=xxx (optionnel)
// Response 200
{ "success": true, "count": 2, "data": [...] }
```

### GET /api/instances/:id

```json
// Response 200
{ "success": true, "data": { "_id": "...", ... } }
```

### PATCH /api/instances/:id

```json
// Request
{ "name": "nouveau-nom", "status": "STOPPED" }

// Response 200
{ "success": true, "data": { ... } }
```

### DELETE /api/instances/:id

```json
// Response 200
{ "success": true, "message": "Instance supprimee" }
```

### GET /api/cluster-status

```json
// Response 200
{
  "success": true,
  "data": { "shardingEnabled": true, "version": "5.0.x", "uptime": 12345 }
}
```

## Codes d'Erreur

| Code | Description |
|------|-------------|
| 400 | Validation echouee |
| 401 | Non authentifie / Token invalide |
| 403 | Acces non autorise |
| 404 | Ressource non trouvee |
| 409 | Conflit (email/nom existe deja) |
| 429 | Trop de requetes (rate limit) |
| 500 | Erreur serveur |

## Securite

- **HTTPS obligatoire** (TLS 1.2/1.3)
- **Access Token** : Expire en 15 minutes
- **Refresh Token** : Expire en 7 jours, rotation a chaque usage
- **Rate Limiting** : 10 req/s par IP
