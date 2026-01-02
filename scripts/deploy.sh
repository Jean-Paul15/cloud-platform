#!/bin/bash

# Script de Déploiement DBaaS - Version Production
# Usage: ./deploy.sh [start|stop|restart|status|logs]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_DIR="$PROJECT_ROOT/docker"
ACTION=$1

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_step() {
    echo -e "${BLUE}[ÉTAPE]${NC} $1"
}

# Vérifications préalables
pre_flight_checks() {
    log_step "Vérifications préalables..."

    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        exit 1
    fi

    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi

    # Vérifier le fichier .env
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_warn "Fichier .env manquant. Génération de secrets aléatoires..."
        bash "$SCRIPT_DIR/generate-secrets.sh" < /dev/null
        log_info "Fichier .env créé"
    fi

    # Certificat TLS auto-signé (développement) si absent
    if [ ! -f "$DOCKER_DIR/ssl/server.crt" ] || [ ! -f "$DOCKER_DIR/ssl/server.key" ]; then
        log_warn "Certificat TLS manquant. Génération d'un certificat auto-signé..."
        bash "$SCRIPT_DIR/generate-ssl-certs.sh"
    fi

    # Vérifier que init-tables.sql existe
    if [ ! -f "$DOCKER_DIR/init-tables.sql" ]; then
        log_error "Fichier init-tables.sql manquant!"
        exit 1
    fi

    # Vérifier que init-mongo-cluster.sh existe
    if [ ! -f "$DOCKER_DIR/init-mongo-cluster.sh" ]; then
        log_error "Fichier init-mongo-cluster.sh manquant!"
        exit 1
    fi

    log_info "Vérifications OK ✓"
}

# Initialiser PostgreSQL
init_postgresql() {
    log_step "Initialisation de PostgreSQL..."

    # Attendre que PostgreSQL soit prêt
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker exec dbaas-postgres-sys pg_isready -U admin &> /dev/null; then
            log_info "PostgreSQL est prêt"
            break
        fi

        if [ $attempt -eq $max_attempts ]; then
            log_error "PostgreSQL n'a pas démarré après ${max_attempts} tentatives"
            return 1
        fi

        echo -n "."
        sleep 2
        ((attempt++))
    done

    # Vérifier si la base existe, sinon la créer
    if ! docker exec dbaas-postgres-sys psql -U admin -d postgres -lqt | cut -d \| -f 1 | grep -qw dbaas_system; then
        log_info "Création de la base de données dbaas_system..."
        docker exec dbaas-postgres-sys psql -U admin -d postgres -c "CREATE DATABASE dbaas_system;" || true
    fi

    # Créer les tables
    log_info "Création des tables..."
    if docker exec -i dbaas-postgres-sys psql -U admin -d dbaas_system < "$DOCKER_DIR/init-tables.sql" 2>&1 | grep -q "already exists"; then
        log_warn "Tables déjà existantes (ignoré)"
    else
        log_info "Tables créées avec succès ✓"
    fi

    # Redémarrer le service auth pour qu'il se reconnecte
    log_info "Redémarrage du service d'authentification..."
    docker-compose --env-file "$PROJECT_ROOT/.env" restart auth-service --no-deps
    sleep 5

    log_info "PostgreSQL initialisé ✓"
}

# Initialiser MongoDB
init_mongodb() {
    log_step "Initialisation du cluster MongoDB..."

    # Attendre que les conteneurs MongoDB soient prêts
    log_info "Attente du démarrage des conteneurs MongoDB..."
    sleep 20

    # Vérifier si les Replica Sets sont initialisés
    local config_rs_ready=false
    local shard1_rs_ready=false
    local shard2_rs_ready=false

    # Vérifier Config Server RS
    if docker exec mongo-config-1 mongosh --port 27019 --quiet --eval "rs.status().ok" 2>/dev/null | grep -q "1"; then
        config_rs_ready=true
        log_info "Config Server RS déjà initialisé"
    fi

    # Vérifier Shard1 RS
    if docker exec mongo-shard1-a mongosh --port 27018 --quiet --eval "rs.status().ok" 2>/dev/null | grep -q "1"; then
        shard1_rs_ready=true
        log_info "Shard1 RS déjà initialisé"
    fi

    # Vérifier Shard2 RS
    if docker exec mongo-shard2-a mongosh --port 27018 --quiet --eval "rs.status().ok" 2>/dev/null | grep -q "1"; then
        shard2_rs_ready=true
        log_info "Shard2 RS déjà initialisé"
    fi

    # Si tous les RS sont prêts, vérifier le router
    if [ "$config_rs_ready" = true ] && [ "$shard1_rs_ready" = true ] && [ "$shard2_rs_ready" = true ]; then
        log_info "Tous les Replica Sets sont prêts, vérification du router..."
        sleep 10

        # Vérifier le nombre de shards dans le router
        local shard_count=$(docker exec mongo-router mongosh --quiet --eval "db.adminCommand({listShards:1}).shards.length" 2>/dev/null || echo "0")

        if [ "$shard_count" = "2" ]; then
            log_info "Cluster déjà initialisé avec 2 shards ✓"
        else
            log_warn "Shards manquants ($shard_count/2). Ajout des shards au router..."
            docker exec mongo-router mongosh --quiet --eval '
                try {
                    sh.addShard("shard1RS/mongo-shard1-a:27018,mongo-shard1-b:27018");
                    sh.addShard("shard2RS/mongo-shard2-a:27018,mongo-shard2-b:27018");
                    print("Shards ajoutés avec succès");
                } catch (e) {
                    print("Erreur lors de l ajout des shards: " + e);
                }
            '
            sleep 5
        fi
    else
        log_info "Premier démarrage - Initialisation complète du cluster..."
        bash "$DOCKER_DIR/init-mongo-cluster.sh"
        if [ $? -ne 0 ]; then
            log_error "Échec de l'initialisation MongoDB. Nouvelle tentative..."
            sleep 10
            bash "$DOCKER_DIR/init-mongo-cluster.sh" || log_error "Échec définitif de l'initialisation MongoDB"
        fi
    fi

    # Attendre la stabilisation du cluster
    sleep 10

    # Vérifier que le sharding est activé sur userdata
    log_info "Vérification du sharding sur userdata..."
    docker exec mongo-router mongosh --quiet --eval "
        try {
            if (!db.getSiblingDB('config').databases.findOne({_id: 'userdata', partitioned: true})) {
                sh.enableSharding('userdata');
                sh.shardCollection('userdata.instances', { user_id: 1, _id: 1 });
                print('✓ Sharding activé sur userdata');
            } else {
                print('✓ Sharding déjà actif sur userdata');
            }
        } catch (e) {
            print('Erreur sharding: ' + e);
        }
    " 2>&1 | tail -1

    # Vérification finale du nombre de shards
    local final_shard_count=$(docker exec mongo-router mongosh --quiet --eval "db.adminCommand({listShards:1}).shards.length" 2>/dev/null || echo "0")
    if [ "$final_shard_count" = "2" ]; then
        log_info "MongoDB Cluster: 2 shards actifs ✓"
    else
        log_error "Cluster incomplet: $final_shard_count/2 shards"
    fi

    # Redémarrer le manager service pour qu'il se connecte au cluster initialisé
    log_info "Redémarrage du service manager..."
    docker-compose --env-file "$PROJECT_ROOT/.env" restart manager-service --no-deps
    sleep 5

    log_info "MongoDB initialisé ✓"
}

# Démarrer l'infrastructure
start_infrastructure() {
    echo ""
    echo "==========================================="
    echo "  DÉMARRAGE INFRASTRUCTURE DBaaS"
    echo "==========================================="
    echo ""

    pre_flight_checks

    cd "$DOCKER_DIR"

    log_step "Démarrage des conteneurs..."
    docker-compose --env-file "$PROJECT_ROOT/.env" up -d --build

    if [ $? -ne 0 ]; then
        log_error "Échec du démarrage des conteneurs"
        exit 1
    fi

    log_info "Conteneurs démarrés ✓"

    # Attendre la stabilisation
    log_info "Attente de stabilisation (20s)..."
    sleep 20

    # Initialiser PostgreSQL
    init_postgresql || log_error "Échec initialisation PostgreSQL"

    # Initialiser MongoDB
    init_mongodb || log_error "Échec initialisation MongoDB"

    # Vérification finale
    echo ""
    log_step "Vérification finale..."
    docker-compose --env-file "$PROJECT_ROOT/.env" ps

    echo ""
    echo "==========================================="
    echo "   INFRASTRUCTURE OPÉRATIONNELLE"
    echo "==========================================="
    echo ""
    echo "Tests rapides:"
    echo "  • Gateway:  curl -k https://localhost/health"
    echo "  • Auth:     curl -k https://localhost/auth/health"
    echo "  • Manager:  curl -k https://localhost/api/health"
    echo ""
    echo "Logs en temps réel:"
    echo "  ./deploy.sh logs"
    echo ""
}

# Arrêter l'infrastructure
stop_infrastructure() {
    log_step "Arrêt de l'infrastructure..."
    cd "$DOCKER_DIR"
    docker-compose --env-file "$PROJECT_ROOT/.env" down
    log_info "Infrastructure arrêtée ✓"
}

# Vérifier l'état des services
check_status() {
    log_step "État des services:"
    cd "$DOCKER_DIR"
    docker-compose --env-file "$PROJECT_ROOT/.env" ps

    echo ""
    log_step "Santé des services:"

    # Test Gateway
    if curl -k -s https://localhost/health | grep -q "Gateway OK"; then
        log_info "✓ Gateway: OK"
    else
        log_warn "✗ Gateway: KO"
    fi

    # Test Auth
    if curl -k -s https://localhost/auth/health | grep -q "success"; then
        log_info "✓ Auth Service: OK"
    else
        log_warn "✗ Auth Service: KO"
    fi

    # Test Manager
    if curl -k -s https://localhost/api/health | grep -q "success"; then
        log_info "✓ Manager Service: OK"
    else
        log_warn "✗ Manager Service: KO"
    fi

    # Test MongoDB
    if docker exec mongo-router mongosh --quiet --eval "db.adminCommand({ping:1})" &> /dev/null; then
        local shard_count=$(docker exec mongo-router mongosh --quiet --eval "db.adminCommand({listShards:1}).shards.length" 2>/dev/null || echo "0")
        log_info "✓ MongoDB Cluster: OK ($shard_count shards)"
    else
        log_warn "✗ MongoDB Cluster: KO"
    fi
}

# Afficher les logs
show_logs() {
    cd "$DOCKER_DIR"
    local service=$2

    if [ -z "$service" ]; then
        log_info "Logs de tous les services (Ctrl+C pour quitter):"
        docker-compose --env-file "$PROJECT_ROOT/.env" logs -f --tail=50
    else
        log_info "Logs de $service (Ctrl+C pour quitter):"
        docker-compose --env-file "$PROJECT_ROOT/.env" logs -f --tail=50 "$service"
    fi
}

# Redémarrer complètement
restart_infrastructure() {
    log_step "Redémarrage complet de l'infrastructure..."
    stop_infrastructure
    sleep 5
    start_infrastructure
}

# Menu d'aide
show_help() {
    echo "Usage: ./deploy.sh [COMMANDE]"
    echo ""
    echo "Commandes disponibles:"
    echo "  start      Démarre toute l'infrastructure (avec init auto)"
    echo "  stop       Arrête tous les conteneurs"
    echo "  restart    Redémarre toute l'infrastructure"
    echo "  status     Affiche l'état et teste les services"
    echo "  logs       Affiche les logs en temps réel"
    echo "  help       Affiche cette aide"
    echo ""
    echo "Exemples:"
    echo "  ./deploy.sh start"
    echo "  ./deploy.sh status"
    echo "  ./deploy.sh logs auth-service"
    echo ""
}

# Menu principal
if [ -z "$ACTION" ]; then
    show_help
    exit 1
fi

case "$ACTION" in
    start)
        start_infrastructure
        ;;
    stop)
        stop_infrastructure
        ;;
    restart)
        restart_infrastructure
        ;;
    status)
        check_status
        ;;
    logs)
        show_logs "$@"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Commande inconnue: $ACTION"
        echo ""
        show_help
        exit 1
        ;;
esac
