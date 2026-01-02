FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm install --omit=dev && \
    npm install -g prisma && \
    npx prisma generate

# Copier le code source
COPY src ./src

# ===== Stage Production =====
FROM node:18-alpine

WORKDIR /app

# Installer OpenSSL pour Prisma
RUN apk add --no-cache openssl openssl-dev

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Créer le dossier logs avec les bonnes permissions
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

# Copier depuis le builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --chown=nodejs:nodejs package*.json ./

# Passer à l'utilisateur non-root
USER nodejs

EXPOSE 3000

CMD ["node", "src/app.js"]
