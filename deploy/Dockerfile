# ==========================================
# Stage 1: Build
# ==========================================
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Cache dependency downloads
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --config.minimum-release-age=0

# Copy source code
COPY . .

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ==========================================
# Stage 2: Runtime
# ==========================================
FROM node:22-alpine

RUN apk add --no-cache ca-certificates tzdata \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built application from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy entrypoint script
COPY --from=builder /app/deploy/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose HTTP port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]