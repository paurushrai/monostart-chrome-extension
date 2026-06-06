# Reproducible build container for the MonoStart Chrome extension.
# A browser extension runs in Chrome, not in a container — this image is the
# build/QA pipeline: typecheck + lint + tests + vite build, exporting dist/.
#
# Build the extension artifact to ./dist on the host:
#   docker build --target export --output type=local,dest=dist .
#
# Run the quality gate only (no artifact):
#   docker build --target builder .

FROM node:24-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Quality gate + build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run typecheck && npm run lint && npm test && npm run build

# --- Export stage: `--output` copies dist/ to the host ---
FROM scratch AS export
COPY --from=builder /app/dist /
