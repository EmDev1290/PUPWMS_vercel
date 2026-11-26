# Production Dockerfile for PUP PQ-Scheduler Backend
FROM node:20-alpine

WORKDIR /app

# Install build dependencies if needed
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Generate public assets
RUN node prepare-public.js

# Expose port (Cloud Run sets PORT=8080)
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.js"]
