#!/bin/bash

# Script d'Initialisation du Cluster MongoDB Sharded
# Ce script initialise les Replica Sets et configure le sharding

set -e

echo "==========================================="
echo "  INITIALISATION CLUSTER MONGODB"
echo "==========================================="
echo ""

# Attendre que les conteneurs soient démarrés
echo "[INFO] Attente du démarrage des conteneurs MongoDB (15s)..."
sleep 15

# ===== ÉTAPE 1: Initialiser le Replica Set des Config Servers =====
echo "[INFO] Initialisation du Config Server Replica Set..."
docker exec mongo-config-1 mongosh --port 27019 --quiet --eval '
try {
    var status = rs.status();
    print("Config Server RS déjà initialisé");
} catch (e) {
    rs.initiate({
      _id: "configRS",
      configsvr: true,
      members: [
        { _id: 0, host: "mongo-config-1:27019" },
        { _id: 1, host: "mongo-config-2:27019" },
        { _id: 2, host: "mongo-config-3:27019" }
      ]
    });
    print("Config Server RS initialisé");
}
' || {
    echo "[ERROR] Échec initialisation Config Server RS"
    exit 1
}

echo "[INFO] Attente de l'élection du Primary du Config RS (20s)..."
sleep 20

# ===== ÉTAPE 2: Initialiser Shard 1 Replica Set =====
echo "[INFO] Initialisation du Shard 1 Replica Set..."
docker exec mongo-shard1-a mongosh --port 27018 --quiet --eval '
try {
    var status = rs.status();
    print("Shard1 RS déjà initialisé");
} catch (e) {
    rs.initiate({
      _id: "shard1RS",
      members: [
        { _id: 0, host: "mongo-shard1-a:27018" },
        { _id: 1, host: "mongo-shard1-b:27018" }
      ]
    });
    print("Shard1 RS initialisé");
}
' || {
    echo "[ERROR] Échec initialisation Shard1 RS"
    exit 1
}

echo "[INFO] Attente stabilisation Shard1 (15s)..."
sleep 15

# ===== ÉTAPE 3: Initialiser Shard 2 Replica Set =====
echo "[INFO] Initialisation du Shard 2 Replica Set..."
docker exec mongo-shard2-a mongosh --port 27018 --quiet --eval '
try {
    var status = rs.status();
    print("Shard2 RS déjà initialisé");
} catch (e) {
    rs.initiate({
      _id: "shard2RS",
      members: [
        { _id: 0, host: "mongo-shard2-a:27018" },
        { _id: 1, host: "mongo-shard2-b:27018" }
      ]
    });
    print("Shard2 RS initialisé");
}
' || {
    echo "[ERROR] Échec initialisation Shard2 RS"
    exit 1
}

echo "[INFO] Attente stabilisation Shard2 (15s)..."
sleep 15

# ===== ÉTAPE 4: Ajouter les Shards au Cluster =====
echo "[INFO] Ajout des Shards au Cluster via Mongos..."
docker exec mongo-router mongosh --quiet --eval '
try {
    // Vérifier si les shards existent déjà
    var shards = db.adminCommand({listShards: 1}).shards;
    var shard1Exists = shards.some(s => s._id === "shard1RS");
    var shard2Exists = shards.some(s => s._id === "shard2RS");

    if (!shard1Exists) {
        sh.addShard("shard1RS/mongo-shard1-a:27018,mongo-shard1-b:27018");
        print("✓ Shard1 ajouté au cluster");
    } else {
        print("✓ Shard1 déjà présent");
    }

    if (!shard2Exists) {
        sh.addShard("shard2RS/mongo-shard2-a:27018,mongo-shard2-b:27018");
        print("✓ Shard2 ajouté au cluster");
    } else {
        print("✓ Shard2 déjà présent");
    }

    print("Total shards: " + db.adminCommand({listShards: 1}).shards.length);
} catch (e) {
    print("Erreur lors de l ajout des shards: " + e);
    quit(1);
}
' || {
    echo "[ERROR] Échec ajout des shards"
    exit 1
}

sleep 10

# ===== ÉTAPE 5: Activer le Sharding sur la base de données =====
echo "[INFO] Activation du Sharding sur la base de données userdata..."
docker exec mongo-router mongosh --quiet --eval '
try {
    // Vérifier si le sharding est déjà activé
    var db_config = db.getSiblingDB("config").databases.findOne({_id: "userdata"});

    if (!db_config || !db_config.partitioned) {
        sh.enableSharding("userdata");
        print("✓ Sharding activé sur userdata");
    } else {
        print("✓ Sharding déjà actif sur userdata");
    }

    // Vérifier si la collection est déjà shardée
    var coll_config = db.getSiblingDB("config").collections.findOne({_id: "userdata.instances"});

    if (!coll_config) {
        sh.shardCollection("userdata.instances", { user_id: 1, _id: 1 });
        print("✓ Collection instances shardée avec clé {user_id: 1, _id: 1}");
    } else {
        print("✓ Collection instances déjà shardée");
    }
} catch (e) {
    print("Erreur activation sharding: " + e);
    quit(1);
}
' || {
    echo "[ERROR] Échec activation du sharding"
    exit 1
}

# ===== ÉTAPE 6: Vérification =====
echo ""
echo "[INFO] Vérification de l'état du cluster..."
docker exec mongo-router mongosh --quiet --eval '
var status = sh.status();
var shards = db.adminCommand({listShards: 1}).shards;
print("========================================");
print("  CLUSTER MONGODB - STATUT");
print("========================================");
print("Nombre de shards: " + shards.length);
shards.forEach(function(s) {
    print("  • " + s._id + ": " + s.host + " [" + s.state + "]");
});
print("");
print("Base userdata:");
var db_config = db.getSiblingDB("config").databases.findOne({_id: "userdata"});
if (db_config && db_config.partitioned) {
    print("  ✓ Sharding activé");
} else {
    print("  ✗ Sharding non activé");
}
var coll_config = db.getSiblingDB("config").collections.findOne({_id: "userdata.instances"});
if (coll_config) {
    print("  ✓ Collection instances shardée");
    print("  ✓ Shard key: {user_id: 1, _id: 1}");
} else {
    print("  ✗ Collection instances non shardée");
}
print("========================================");
'

echo ""
echo "==========================================="
echo "   INITIALISATION TERMINÉE AVEC SUCCÈS"
echo "==========================================="
echo ""
echo "✓ 2 Shards avec Replica Sets actifs"
echo "✓ Sharding activé sur userdata.instances"
echo "✓ Shard key: {user_id: 1, _id: 1}"
echo ""
