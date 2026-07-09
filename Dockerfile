FROM node:24-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs -g 1001
RUN adduser -S nextjs -u 1001 -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/src/server/db/schema.sql ./src/server/db/schema.sql
# import-materials.mjs reads the bundled prompt library at runtime to seed material_items
COPY --from=builder --chown=nextjs:nodejs /app/src/components/promptLibrary.ts ./src/components/promptLibrary.ts

USER nextjs

EXPOSE 8080

# On every deploy: (1) apply the DB schema (idempotent) — must succeed or the
# container fails loudly and Zeabur retries; (2) seed the material library on a
# fresh DB (idempotent + skips a non-empty table, so it never resurrects admin
# deletions) — non-fatal, a seed hiccup must not keep the site down; (3) serve.
CMD ["sh", "-c", "node scripts/migrate.mjs && (node scripts/import-materials.mjs || echo 'materials import skipped') && node server.js"]
