# Conception Base de Données et Stratégie Big Data

## 1. Vue d'ensemble
Le système gère deux types de données distincts :
1.  **Métadonnées Système** : Données relationnelles critiques (Utilisateurs, Projets, Tokens de rafraîchissement).
2.  **Données Utilisateurs (Big Data)** : Instances de BDD et données stockées par les clients du service DBaaS. Ces données sont volumineuses, non structurées et nécessitent une haute disponibilité.

## 2. Schéma des Métadonnées Système (PostgreSQL via Prisma)
Ces données sont stockées dans une base relationnelle centralisée. Le schéma est géré via Prisma ORM.

### Modèle Entité-Association
*   **Users** : Clients du service avec rôles (ADMIN, DEVELOPER, VIEWER).
*   **Projects** : Espaces de travail logiques appartenant aux utilisateurs.
*   **RefreshTokens** : Tokens de rafraîchissement pour la rotation sécurisée des JWT.

### Schéma Prisma (Implémenté)

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  role         Role      @default(DEVELOPER)
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  projects     Project[]
  refreshTokens RefreshToken[]

  @@map("users")
}

model Project {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  name      String   @db.VarChar(100)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("projects")
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

enum Role {
  ADMIN
  DEVELOPER
  VIEWER
}
```

### Schéma SQL Équivalent

```sql
-- Table des utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'DEVELOPER' CHECK (role IN ('ADMIN', 'DEVELOPER', 'VIEWER')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des projets
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 3. Schéma des Instances (MongoDB)
Les instances de bases de données provisionnées sont stockées dans MongoDB pour bénéficier du sharding.

### Collection `instances`

```javascript
{
  "_id": "uuid-instance",
  "project_id": "uuid-projet",      // Référence au projet PostgreSQL
  "user_id": "uuid-utilisateur",    // Pour requêtes rapides
  "name": "ma-base-prod",
  "status": "RUNNING",              // PROVISIONING, RUNNING, STOPPED, ERROR
  "connection_string": "mongodb://mongo-router:27017/userdata_xxx",
  "created_at": ISODate("2024-01-15T10:00:00Z"),
  "updated_at": ISODate("2024-01-15T10:00:00Z")
}
```

## 4. Stratégie Big Data : Données Utilisateurs (MongoDB Sharded Cluster)
Pour répondre aux exigences de "grande taille des données" et de "réplication", nous utilisons une architecture **Sharded Cluster**.

### 4.1 Architecture du Cluster
Le cluster MongoDB est composé de trois types de composants :
1.  **Mongos (Query Router)** : Point d'entrée pour les applications clientes. Il route les requêtes vers les bons shards.
2.  **Config Servers** : Stockent les métadonnées du cluster (quel chunk de données est sur quel shard). Configurés en Replica Set de 3 nœuds.
3.  **Shards (Data Nodes)** : Stockent les données réelles. Chaque shard est lui-même un **Replica Set** pour la haute disponibilité.

### 4.2 Stratégie de Sharding (Fragmentation)
Le sharding permet de distribuer les données horizontalement sur plusieurs serveurs.

*   **Clé de Sharding (Shard Key)** : `{ "user_id": 1, "_id": 1 }`
*   **Justification** : Permet de localiser rapidement toutes les données d'un utilisateur spécifique (Data Locality) tout en distribuant équitablement les gros utilisateurs.

### 4.3 Stratégie de Réplication (Sécurité & Disponibilité)
Chaque Shard est un **Replica Set** composé de 2 nœuds minimum :
*   **1 Primary** : Reçoit toutes les écritures et lectures par défaut.
*   **1+ Secondaries** : Répliquent les données du Primary en temps réel.
    *   En cas de panne du Primary, un Secondary est élu nouveau Primary automatiquement.
    *   Assure la tolérance aux pannes (Disaster Recovery).

### 4.4 Schéma Logique (Données Client)
Les données stockées par les clients dans leurs instances sont flexibles (Schema-less) :

```json
{
  "_id": "ObjectId(...)",
  "user_id": "UUID_CLIENT",
  "data": {
    "nom": "Smartphone X",
    "prix": 999,
    "details": { ... }
  },
  "metadata": {
    "created_at": "2024-01-15T10:00:00Z",
    "version": 1
  }
}
```

## 5. Politique de Sauvegarde
Le script `backup.sh` automatise les sauvegardes :

*   **PostgreSQL** : `pg_dumpall` quotidien des métadonnées système.
*   **MongoDB** : `mongodump` quotidien via le router Mongos.
*   **Compression** : Archives `.tar.gz` pour optimiser l'espace.
*   **Rotation** : Conservation des 7 derniers backups.
*   **Oplog Backup** : Sauvegarde continue des journaux d'opérations pour permettre une restauration Point-in-Time.
