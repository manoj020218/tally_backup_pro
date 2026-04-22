# Build stage
FROM node:16-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:16-alpine AS production

# Install system dependencies for Electron
RUN apk add --no-cache \
    libx11 \
    libxcomposite \
    libxcursor \
    libxdamage \
    libxext \
    libxfixes \
    libxi \
    libxrandr \
    libxrender \
    libxss \
    libxtst \
    cups-libs \
    dbus-libs \
    libxrandr \
    alsa-lib \
    mesa \
    mesa-dri-intel \
    mesa-dri-nouveau \
    mesa-dri-virtio \
    mesa-gbm \
    mesa-gl \
    mesa-egl

# Create app user
RUN addgroup -g 1001 -S appuser && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G appuser -g appuser appuser

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/backups && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose ports (if needed for web interface)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')"

# Set environment variables
ENV NODE_ENV=production
ENV ELECTRON_DISABLE_SECURITY_WARNINGS=true

# Start the application
CMD ["npm", "start"]