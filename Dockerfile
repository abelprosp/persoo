FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV AUTH_SECRET=persoo-docker-dev-secret
ENV DATABASE_URL=postgresql://persoo_app:persoo_app@postgres:5432/persoo
ENV DATABASE_URL_ADMIN=postgresql://persoo:persoo@postgres:5432/persoo
ENV NEXT_PUBLIC_APP_URL=https://app.persoocrm.com
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV AUTH_SECRET=persoo-docker-dev-secret
ENV DATABASE_URL=postgresql://persoo_app:persoo_app@postgres:5432/persoo
ENV DATABASE_URL_ADMIN=postgresql://persoo:persoo@postgres:5432/persoo
ENV NEXT_PUBLIC_APP_URL=https://app.persoocrm.com
ENV AUTH_COOKIE_SECURE=true
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
