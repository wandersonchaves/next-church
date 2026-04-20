# 1. Dependências
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Usamos --legacy-peer-deps para resolver conflitos de plugins do ESLint identificados no log
RUN npm ci --legacy-peer-deps

# 2. Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis de ambiente com formato moderno key=value
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Pula validação de envs durante o build do Docker (serão validadas no runtime)
ENV SKIP_ENV_VALIDATION=1
# Mocks para chaves públicas exigidas pelo build (formato válido para o Clerk)
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dmVyeS1jb29sLWdlbWluaS0xMC5jbGVyay5hY2NvdW50cy5kZXYk

RUN npm run build

# 3. Runner Final
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Cria usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia arquivos do build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia as migrações e o drizzle-kit para execução no start
# Nota: drizzle-kit precisa estar disponível. Como usamos standalone, copiamos o necessário.
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=builder /app/node_modules/typescript ./node_modules/typescript

USER nextjs

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Comando no formato JSON recomendado para lidar corretamente com sinais do SO
CMD ["sh", "-c", "npx drizzle-kit push --force && node server.js"]
