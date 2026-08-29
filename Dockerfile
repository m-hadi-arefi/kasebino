# MerchantOS production image (ADR-067).
# Multi-stage Next.js standalone; non-root; healthcheck; secrets via env only.
# Compose `app` profile builds and runs this image (production, not `next dev`).

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --prefer-offline

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Build-time ARG only (never ENV) so secrets are not baked into image layers (ADR-067).
ARG AUTH_SECRET=build-time-placeholder-not-for-runtime
ARG DATABASE_URL=postgres://merchantos:merchantos@127.0.0.1:5432/merchantos
RUN AUTH_SECRET="$AUTH_SECRET" DATABASE_URL="$DATABASE_URL" npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Node fetch — Alpine may lack wget/curl; no extra packages.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
