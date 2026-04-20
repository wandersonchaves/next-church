# 1. Instala dependências (inclui drizzle-kit e typescript)
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

# 3. Runner Final
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia arquivos estáticos e o standalone server
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia as migrações e o drizzle-kit (que agora está no standalone/node_modules ou na raiz)
# No modo standalone, o Next.js coloca as dependências em standalone/node_modules
# Vamos criar um link simbólico ou rodar via node diretamente para garantir
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

USER nextjs

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# O drizzle-kit estará disponível dentro da pasta node_modules do standalone
CMD ["sh", "-c", "node node_modules/drizzle-kit/bin.cjs push --force && node server.js"]
