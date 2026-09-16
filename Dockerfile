# Globify Tech — production image.
#
#   docker build -t globify-tech .
#   docker run --env-file .env -p 3000:3000 globify-tech
#
# Multi-stage so the runtime image carries only the standalone server, the
# Prisma engines it needs and the static assets.

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable

# ───────── dependencies ─────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ───────── build ─────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The schema must be generated before the build; the URL is only read at runtime.
ENV NEXT_TELEMETRY_DISABLED=1 DOCKER_BUILD=1
RUN pnpm prisma generate
RUN pnpm exec next build --webpack

# ───────── runtime ─────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Migrations and the seed ship with the image so a release can run them.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
