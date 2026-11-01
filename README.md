<div align="center">
  <h1>cloud-platform</h1>
  <p><b>Une plateforme de base de données à la demande, construite en microservices : un utilisateur s'authentifie, déclare un projet, réclame une instance MongoDB, et tout cela passe par une seule porte HTTPS posée devant un cluster shardé isolé du reste.</b></p>
  <p>
  <img src="https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
  </p>
  <p>
  <img src="https://img.shields.io/badge/Licence-Tous%20droits%20r%C3%A9serv%C3%A9s-lightgrey?style=flat-square" alt="Licence"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript"/>
  </p>
  <p>
    <a href="#démarrer-en-cinq-minutes">Démarrer</a> ·
    <a href="#architecture">Architecture</a> ·
    <a href="#stack-technique">Stack</a> ·
    <a href="#structure-du-dépôt">Structure</a> ·
    <a href="#tests">Tests</a>
  </p>
</div>

## Ce que ça apporte

- **Trois réseaux Docker cloisonnés.** Seul Nginx touche `public-net`. `private-net` et `data-net` sont déclarés `internal: true` dans `docker/docker-compose.yml` : les services applicatifs et les données n'ont aucune sortie directe vers l'extérieur.
- **Un cluster MongoDB shardé complet, démarré par script.** Trois serveurs de configuration, deux shards de deux membres, un routeur `mongos`, initialisés par `docker/init-mongo-cluster.sh`.
- **Une authentification qui fait tourner ses jetons.** Chaque rafraîchissement supprime l'ancien refresh token et en émet un nouveau. Un refresh token expiré est effacé à sa première présentation.

## Le problème

Prenons une équipe qui veut offrir des bases MongoDB à ses utilisateurs. Elle doit savoir qui demande quoi, rattacher chaque instance à un projet et à un propriétaire, et empêcher qu'un client atteigne directement les bases. Le plus facile est d'exposer MongoDB et de se fier à la bonne volonté de chacun. Ce dépôt prend l'autre chemin : une passerelle unique, des services qui vérifient chaque jeton, et des données hors de portée du réseau public.

## Démarrer en cinq minutes

Prérequis : Docker avec Docker Compose, `openssl`, `curl`, bash.

```bash
bash scripts/generate-secrets.sh      # crée .env avec des valeurs aléatoires
bash scripts/generate-ssl-certs.sh    # certificat TLS auto-signé (développement)
bash scripts/deploy.sh start          # démarre la pile et initialise PostgreSQL et le cluster MongoDB
bash scripts/deploy.sh status         # état des conteneurs
curl -k https://localhost/auth/register -X POST -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"<mot_de_passe_conforme>"}'
```

Le mot de passe exige 12 caractères minimum, une majuscule, une minuscule, un chiffre et un caractère spécial. Les routes sont détaillées dans `docs/api.md` et `docs/api_admin.md`. Un compte administrateur se crée avec `ADMIN_PASSWORD='...' bash scripts/create-admin.sh`.

## Architecture

```mermaid
flowchart LR
    C[Client] -->|HTTPS| G[Nginx<br/>TLS, limit_req, HSTS]
    subgraph public-net
      G
    end
    subgraph private-net [private-net, internal]
      A[auth<br/>Express + Prisma]
      M[manager<br/>Express]
      P[(PostgreSQL)]
    end
    subgraph data-net [data-net, internal]
      R[mongos]
      CFG[3 x config RS]
      S1[shard1 RS]
      S2[shard2 RS]
    end
    G -->|/auth/*| A
    G -->|/api/*| M
    A --> P
    M -->|POST /verify| A
    M --> R
    R --> CFG
    R --> S1
    R --> S2
```

Trois choix structurent le projet.

**Le manager ne connaît pas le secret JWT.** Pour chaque requête, il envoie le jeton à `POST /verify` sur le service `auth`. Le secret de signature reste à un seul endroit, la révocation et le changement de règles se font d'un seul côté. Le prix : un appel réseau par requête, avec un délai maximal de 5 secondes.

**Deux bases, deux usages.** PostgreSQL, accessible par Prisma, porte les utilisateurs, les rôles, les projets et les refresh tokens : des données relationnelles qui demandent de la cohérence. MongoDB reçoit les métadonnées d'instances dans `userdata.instances` et sert de cible au cluster shardé.

**Un contrôle de propriété dans la couche service.** Le service `instance.service.js` compare le `user_id` de l'instance à celui du jeton avant toute lecture, mise à jour ou suppression. Les routes ne peuvent pas l'oublier : la règle vit à côté de la logique.

## Stack technique

| Domaine | Technologies | Rôle dans le projet |
|---|---|---|
| Services | <img src="https://img.shields.io/badge/Node.js-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js"/> <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express"/><br/>Node.js, Express 4 | Deux services HTTP : `auth` et `manager` |
| Validation | <img src="https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white" alt="Zod"/><br/>Zod | Validation des entrées des routes |
| Sécurité | <img src="https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" alt="JWT"/> <img src="https://img.shields.io/badge/Helmet-444444?style=flat-square" alt="Helmet"/> <img src="https://img.shields.io/badge/bcrypt-444444?style=flat-square" alt="bcrypt"/><br/>bcrypt (12 tours), jsonwebtoken, helmet, express-rate-limit, cors | Hachage des mots de passe, jetons, en-têtes, limitation de débit |
| Base relationnelle | <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL"/> <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma"/><br/>PostgreSQL, Prisma 5 | Utilisateurs, rôles, projets, refresh tokens |
| Base documentaire | <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB"/><br/>MongoDB, cluster shardé, driver `mongodb` | Métadonnées d'instances et cluster cible |
| Passerelle | <img src="https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white" alt="Nginx"/><br/>Nginx | Point d'entrée HTTPS unique |
| Conteneurs | <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"/> <img src="https://img.shields.io/badge/Docker%20Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Compose"/><br/>Docker, Docker Compose | Trois réseaux cloisonnés, déploiement de la pile |
| Journalisation | <img src="https://img.shields.io/badge/winston-444444?style=flat-square" alt="winston"/><br/>winston | Journaux des services |
| Scripts | <img src="https://img.shields.io/badge/Bash-4EAA25?style=flat-square&logo=gnubash&logoColor=white" alt="Bash"/><br/>Bash | Déploiement, secrets, TLS, sauvegarde |
| Tests | <img src="https://img.shields.io/badge/Jest-C21325?style=flat-square&logo=jest&logoColor=white" alt="Jest"/> <img src="https://img.shields.io/badge/supertest-444444?style=flat-square" alt="supertest"/><br/>Jest, supertest, script shell d'intégration | Tests unitaires et intégration |

## Structure du dépôt

```
.
├── src/services/
│   ├── auth/        # authentification : routes, contrôleurs, repositories Prisma, tests
│   └── manager/     # gestion d'instances : MongoDB, tests
├── docker/          # docker-compose.yml, nginx.conf, init-tables.sql, init-mongo-cluster.sh
├── scripts/         # déploiement, sauvegarde, secrets, TLS, création d'admin
├── tests/integration/api.test.sh
├── docs/            # architecture, sécurité, base de données, API, guides
├── .env.example     # variables d'environnement (valeurs factices)
└── LICENSE
```

## Tests

Pour lancer les tests unitaires :

```bash
cd src/services/auth && npm install && npx prisma generate && npm test
cd src/services/manager && npm install && npm test
```

## Limites et suite

Le périmètre est celui d'un socle d'infrastructure et d'accès, pas d'un produit fini. Chaque limite ci-dessous est un choix de départ, avec sa suite naturelle.

- **Instances logiques.** Le manager enregistre les métadonnées et génère une chaîne de connexion `mongodb://mongo-router:27017/userdata_<uuid>`. Il ne crée ni utilisateur MongoDB ni quota. Suite : un utilisateur et des droits par instance.
- **Cluster sans authentification.** MongoDB tourne sur un réseau Docker interne, protégé par l'isolation décrite plus haut. Suite : activer l'authentification interne.
- **Certificat auto-signé.** Le script cible le développement. Suite : un certificat émis par une autorité pour la production.
- **Schéma SQL appliqué par `docker/init-tables.sql`.** Les migrations Prisma ne sont pas versionnées.
- **Tests unitaires ciblés** sur les services de tokens, d'authentification, de projets et d'instances.
- **`tests/integration/api.test.sh` à remettre à jour.** Il appelle la passerelle en HTTP, lit un champ `token` alors que l'API renvoie `accessToken`, et n'envoie pas l'en-tête `Authorization` sur les routes d'instances.

## Licence

Tous droits réservés. Voir le fichier `LICENSE`.

## Contact

Jean-Paul ADOGLI, étudiant ingénieur en data science et big data. GitHub : [Jean-Paul15](https://github.com/Jean-Paul15).
