FROM node:22-alpine AS frontend
WORKDIR /app/sportsync-frontend
COPY sportsync-frontend/package*.json ./
RUN npm ci
COPY sportsync-frontend/ ./
RUN npm run build

FROM node:22-alpine AS backend
WORKDIR /app/sportsync-backend
COPY sportsync-backend/package*.json ./
RUN npm ci --omit=dev
COPY sportsync-backend/ ./

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=backend /app/sportsync-backend ./sportsync-backend
COPY --from=frontend /app/sportsync-frontend/dist ./public
ENV STATIC_DIR=/app/public
EXPOSE 5001
CMD ["node", "sportsync-backend/server.js"]
