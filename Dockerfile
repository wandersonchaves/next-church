# 1. Instala todas as dependências
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# 2. Build da aplicação
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dmVyeS1jb29sLWdlbWluaS0xMC5jbGVyay5hY2NvdW50cy5kZXYk

RUN npm run build

# 3. Prepara dependências de produção puras
FROM node:22-alpine AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# 4. Runner Final
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia arquivos do build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia as dependências de produção para garantir que o drizzle-kit esteja disponível
COPY --from=production-deps /app/node_modules ./node_modules

# Copia as migrações e a config do drizzle
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/models ./src/models

USER nextjs

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Agora o npx encontrará o drizzle-kit nas node_modules de produção
CMD ["sh", "-c", "npx drizzle-kit push --force && node server.js"]
