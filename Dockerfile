# Use Red Hat UBI as base image
FROM registry.access.redhat.com/ubi9/nodejs-18:latest

USER root

# Set working directory
WORKDIR /opt/app-root/src

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source
COPY backend/src ./src

# Copy frontend (public directory)
COPY public ./public

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
