# stdio image for Docker MCP Gateway. Lightweight, no database.
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS production

# Links the GHCR package to its repo, and surfaces the licence on the package page.
LABEL org.opencontainers.image.source="https://github.com/PawelHaracz/polish-caselaw-mcp" \
      org.opencontainers.image.description="Polish court case law via MCP — live from the SAOS API" \
      org.opencontainers.image.licenses="Apache-2.0"

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/dist ./dist

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs && chown -R nodejs:nodejs /app
USER nodejs

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
