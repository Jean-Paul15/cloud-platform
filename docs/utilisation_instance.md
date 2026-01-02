# Utilisation d'une instance MongoDB provisionnée

## Vue d'ensemble

Après avoir provisionné une instance via l'API DBaaS, vous recevez une `connection_string` et un `database_name`. Ce guide vous montre comment les utiliser dans vos applications.

---

## 1. RECUPERER LES INFORMATIONS DE CONNEXION

### Provisionner une instance

```bash
curl -k -X POST https://localhost/api/instances \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"myshop-prod-db","projectId":"project-uuid-456..."}'
```

### Réponse (sauvegarder ces informations)

```json
{
  "_id": "instance-uuid-789...",
  "name": "myshop-prod-db",
  "status": "RUNNING",
  "connection_string": "mongodb://mongo-router:27017/userdata",
  "database_name": "userdata_abc123def456",
  "created_at": "2026-01-02T..."
}
```

**Informations importantes :**
- `connection_string` : URL de connexion au cluster MongoDB
- `database_name` : Nom de votre base de données isolée
- `status` : Statut de l'instance (RUNNING = prête à l'emploi)

---

## 2. UTILISATION AVEC NODE.JS

### Installation des dépendances

```bash
npm install mongodb
# OU
npm install mongoose  # Si vous préférez un ODM
```

### Exemple 1 : Driver MongoDB natif

```javascript
// config/database.js
const { MongoClient } = require('mongodb');

const CONNECTION_STRING = 'mongodb://mongo-router:27017/userdata';
const DATABASE_NAME = 'userdata_abc123def456';

let client;
let db;

/**
 * Connexion à la base de données
 */
async function connect() {
  if (db) return db;

  try {
    client = new MongoClient(CONNECTION_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      minPoolSize: 2
    });

    await client.connect();
    db = client.db(DATABASE_NAME);
    console.log(` Connecté à MongoDB: ${DATABASE_NAME}`);
    return db;
  } catch (error) {
    console.error(' Erreur connexion MongoDB:', error);
    throw error;
  }
}

/**
 * Fermeture de la connexion
 */
async function close() {
  if (client) {
    await client.close();
    console.log('Connexion MongoDB fermée');
  }
}

module.exports = { connect, close };
```

### Exemple 2 : Utilisation dans une API Express

```javascript
// app.js
const express = require('express');
const { connect } = require('./config/database');

const app = express();
app.use(express.json());

let db;

// Connexion au démarrage
(async () => {
  db = await connect();
})();

// Route : Créer un produit
app.post('/products', async (req, res) => {
  try {
    const { name, price, stock } = req.body;

    const product = {
      name,
      price,
      stock,
      createdAt: new Date()
    };

    const result = await db.collection('products').insertOne(product);

    res.status(201).json({
      success: true,
      productId: result.insertedId,
      data: product
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route : Lister les produits
app.get('/products', async (req, res) => {
  try {
    const products = await db.collection('products')
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    res.json({
      success: true,
      total: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route : Rechercher des produits
app.get('/products/search', async (req, res) => {
  try {
    const { query } = req.query;

    const products = await db.collection('products')
      .find({
        name: { $regex: query, $options: 'i' }
      })
      .toArray();

    res.json({
      success: true,
      total: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(4000, () => {
  console.log('� API démarrée sur le port 4000');
});
```

### Exemple 3 : Avec Mongoose (ODM)

```javascript
// config/database.js
const mongoose = require('mongoose');

const CONNECTION_STRING = 'mongodb://mongo-router:27017/userdata';
const DATABASE_NAME = 'userdata_abc123def456';

async function connect() {
  try {
    await mongoose.connect(`${CONNECTION_STRING}/${DATABASE_NAME}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(` Mongoose connecté: ${DATABASE_NAME}`);
  } catch (error) {
    console.error(' Erreur Mongoose:', error);
    throw error;
  }
}

module.exports = { connect };
```

```javascript
// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: ['electronics', 'clothing', 'food'],
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
```

```javascript
// routes/products.js
const express = require('express');
const Product = require('../models/Product');
const router = express.Router();

// Créer un produit
router.post('/', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Lister les produits
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort('-createdAt').limit(50);
    res.json({ success: true, total: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

## 3. UTILISATION AVEC PYTHON

### Installation des dépendances

```bash
pip install pymongo
```

### Exemple 1 : Driver PyMongo

```python
# config/database.py
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

CONNECTION_STRING = "mongodb://mongo-router:27017/userdata"
DATABASE_NAME = "userdata_abc123def456"

client = None
db = None

def connect():
    """Connexion à MongoDB"""
    global client, db

    if db:
        return db

    try:
        client = MongoClient(
            CONNECTION_STRING,
            maxPoolSize=10,
            minPoolSize=2,
            serverSelectionTimeoutMS=5000
        )

        # Test de connexion
        client.admin.command('ping')

        db = client[DATABASE_NAME]
        print(f" Connecté à MongoDB: {DATABASE_NAME}")
        return db
    except ConnectionFailure as e:
        print(f" Erreur connexion MongoDB: {e}")
        raise

def close():
    """Fermeture de la connexion"""
    global client
    if client:
        client.close()
        print("Connexion MongoDB fermée")
```

### Exemple 2 : API Flask

```python
# app.py
from flask import Flask, request, jsonify
from config.database import connect
from datetime import datetime
from bson import ObjectId

app = Flask(__name__)
db = None

@app.before_first_request
def init_db():
    """Initialisation de la connexion"""
    global db
    db = connect()

@app.route('/products', methods=['POST'])
def create_product():
    """Créer un produit"""
    try:
        data = request.json

        product = {
            'name': data['name'],
            'price': float(data['price']),
            'stock': int(data.get('stock', 0)),
            'created_at': datetime.utcnow()
        }

        result = db.products.insert_one(product)
        product['_id'] = str(result.inserted_id)

        return jsonify({
            'success': True,
            'data': product
        }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/products', methods=['GET'])
def list_products():
    """Lister les produits"""
    try:
        products = list(db.products.find()
                       .sort('created_at', -1)
                       .limit(50))

        # Conversion ObjectId en string
        for p in products:
            p['_id'] = str(p['_id'])

        return jsonify({
            'success': True,
            'total': len(products),
            'data': products
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/products/<product_id>', methods=['GET'])
def get_product(product_id):
    """Récupérer un produit"""
    try:
        product = db.products.find_one({'_id': ObjectId(product_id)})

        if not product:
            return jsonify({
                'success': False,
                'error': 'Produit non trouvé'
            }), 404

        product['_id'] = str(product['_id'])

        return jsonify({
            'success': True,
            'data': product
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

if __name__ == '__main__':
    app.run(debug=True, port=4000)
```

---

## 4. UTILISATION AVEC GO

### Installation des dépendances

```bash
go get go.mongodb.org/mongo-driver/mongo
go get go.mongodb.org/mongo-driver/mongo/options
```

### Exemple : API avec Gorilla Mux

```go
// config/database.go
package config

import (
    "context"
    "fmt"
    "log"
    "time"

    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

const (
    ConnectionString = "mongodb://mongo-router:27017/userdata"
    DatabaseName     = "userdata_abc123def456"
)

var DB *mongo.Database

// Connect établit la connexion à MongoDB
func Connect() error {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    clientOptions := options.Client().
        ApplyURI(ConnectionString).
        SetMaxPoolSize(10).
        SetMinPoolSize(2)

    client, err := mongo.Connect(ctx, clientOptions)
    if err != nil {
        return fmt.Errorf("erreur connexion: %w", err)
    }

    // Test de connexion
    if err := client.Ping(ctx, nil); err != nil {
        return fmt.Errorf("erreur ping: %w", err)
    }

    DB = client.Database(DatabaseName)
    log.Printf(" Connecté à MongoDB: %s", DatabaseName)
    return nil
}
```

```go
// main.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "time"

    "myapp/config"

    "github.com/gorilla/mux"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
)

type Product struct {
    ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
    Name      string             `json:"name" bson:"name"`
    Price     float64            `json:"price" bson:"price"`
    Stock     int                `json:"stock" bson:"stock"`
    CreatedAt time.Time          `json:"created_at" bson:"created_at"`
}

func main() {
    // Connexion à MongoDB
    if err := config.Connect(); err != nil {
        log.Fatal(err)
    }

    r := mux.NewRouter()

    r.HandleFunc("/products", CreateProduct).Methods("POST")
    r.HandleFunc("/products", ListProducts).Methods("GET")

    log.Println("� API démarrée sur le port 4000")
    log.Fatal(http.ListenAndServe(":4000", r))
}

func CreateProduct(w http.ResponseWriter, r *http.Request) {
    var product Product
    if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    product.CreatedAt = time.Now()

    result, err := config.DB.Collection("products").InsertOne(r.Context(), product)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    product.ID = result.InsertedID.(primitive.ObjectID)

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]interface{}{
        "success": true,
        "data":    product,
    })
}

func ListProducts(w http.ResponseWriter, r *http.Request) {
    cursor, err := config.DB.Collection("products").Find(r.Context(), bson.M{})
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer cursor.Close(r.Context())

    var products []Product
    if err := cursor.All(r.Context(), &products); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "success": true,
        "total":   len(products),
        "data":    products,
    })
}
```

---

## 5. BONNES PRATIQUES

### Gestion des connexions

```javascript
//  MAUVAIS : Nouvelle connexion à chaque requête
app.get('/data', async (req, res) => {
  const client = await MongoClient.connect(CONNECTION_STRING);
  const data = await client.db().collection('data').find().toArray();
  await client.close();
  res.json(data);
});

//  BON : Réutiliser la connexion (pool)
const db = await connect();

app.get('/data', async (req, res) => {
  const data = await db.collection('data').find().toArray();
  res.json(data);
});
```

### Gestion des erreurs

```javascript
try {
  const result = await db.collection('users').insertOne(user);
} catch (error) {
  if (error.code === 11000) {
    // Duplicate key error
    throw new Error('Email déjà utilisé');
  }
  throw error;
}
```

### Indexes pour les performances

```javascript
// Créer des index au démarrage
await db.collection('products').createIndex({ name: 1 });
await db.collection('products').createIndex({ price: 1 });
await db.collection('orders').createIndex({ userId: 1, createdAt: -1 });
```

### Variables d'environnement

```javascript
// .env
MONGODB_CONNECTION_STRING=mongodb://mongo-router:27017/userdata
MONGODB_DATABASE_NAME=userdata_abc123def456

// config/database.js
require('dotenv').config();

const CONNECTION_STRING = process.env.MONGODB_CONNECTION_STRING;
const DATABASE_NAME = process.env.MONGODB_DATABASE_NAME;
```

---

## 6. TESTER LA CONNEXION

### Test rapide avec mongosh (depuis le conteneur)

```bash
docker exec -it mongo-router mongosh

# Se connecter à votre base
use userdata_abc123def456

# Insérer un document de test
db.test.insertOne({ message: "Hello from MyShop!", timestamp: new Date() })

# Lire les documents
db.test.find()

# Supprimer la collection de test
db.test.drop()
```

### Test depuis votre application

```javascript
// test-connection.js
const { connect } = require('./config/database');

(async () => {
  try {
    const db = await connect();

    // Test d'écriture
    await db.collection('test').insertOne({ test: true, date: new Date() });
    console.log(' Écriture OK');

    // Test de lecture
    const doc = await db.collection('test').findOne({ test: true });
    console.log(' Lecture OK:', doc);

    // Nettoyage
    await db.collection('test').drop();
    console.log(' Connexion fonctionnelle !');

    process.exit(0);
  } catch (error) {
    console.error(' Erreur:', error);
    process.exit(1);
  }
})();
```

---

## 7. TROUBLESHOOTING

### Erreur : "ECONNREFUSED"

**Cause :** Le router MongoDB n'est pas accessible depuis votre conteneur.

**Solution :**
- Vérifier que votre app est dans le même réseau Docker : `docker-net`
- Ou utiliser `host.docker.internal` au lieu de `mongo-router` si votre app tourne en local

```javascript
// Si votre app tourne HORS de Docker
const CONNECTION_STRING = 'mongodb://host.docker.internal:27017/userdata';

// Si votre app tourne DANS Docker
const CONNECTION_STRING = 'mongodb://mongo-router:27017/userdata';
```

### Erreur : "Authentication failed"

**Cause :** Mauvaises credentials.

**Solution :** Le cluster DBaaS n'a pas d'auth activée pour simplifier la demo. Si vous ajoutez l'auth plus tard, utilisez :

```javascript
const CONNECTION_STRING = 'mongodb://<utilisateur>:<mot_de_passe>@mongo-router:27017/userdata?authSource=admin';
```

### Erreur : "Database not found"

**Cause :** Le `database_name` n'existe pas encore.

**Solution :** MongoDB crée automatiquement la base au premier `insertOne()`. Pas besoin de création manuelle.

---

## 8. EXEMPLE COMPLET : E-COMMERCE MYSHOP

Voir le dossier `/examples/myshop-api` pour une implémentation complète avec :
- CRUD produits
- Gestion des commandes
- Recherche full-text
- Aggregations pour statistiques

---

**Prochaine étape :** Consultez [api_admin.md](./api_admin.md) pour gérer vos instances (lister, supprimer, monitorer).
