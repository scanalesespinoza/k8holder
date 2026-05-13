# Stage 1: Build React frontend
FROM registry.access.redhat.com/ubi9/nodejs-18:latest AS frontend-builder

USER root
WORKDIR /frontend

# Copy frontend source and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY frontend/ ./
RUN npx vite build
# Build output will be in /public/dist due to vite.config.js outDir setting

# Stage 2: Production runtime
FROM registry.access.redhat.com/ubi9/nodejs-18:latest

USER root
WORKDIR /opt/app-root/src

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source
COPY backend/src ./src

# Copy built React frontend from builder stage
COPY --from=frontend-builder /public/dist ./public/dist

# Fix ownership
RUN chown -R 1001:0 /opt/app-root/src && \
    chmod -R g=u /opt/app-root/src

# Switch to non-root user
USER 1001

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

# Start application
CMD ["node", "src/server.js"]
