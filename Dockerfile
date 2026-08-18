# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Install build toolchain for native deps (bcrypt) on alpine/musl
RUN apk add --no-cache python3 make g++

# Install all dependencies for build
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
COPY . .
RUN npm run build

# Clean up dev dependencies for production
RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: Production
FROM node:24-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

EXPOSE 4000

CMD ["sh", "-c", "node node_modules/typeorm/cli.js migration:run -d dist/src/database/data-source.js && node dist/src/main.js"]
