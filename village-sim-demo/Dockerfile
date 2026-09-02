# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Development command (with hot reload)
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built files
COPY --from=development /app/dist ./dist
COPY public ./public

ENV PORT=3000
EXPOSE 3000

# Production command
CMD ["node", "dist/server/index.js"]
