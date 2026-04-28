FROM node:20-slim

RUN apt-get update && apt-get install -y \
    graphicsmagick \
    ghostscript \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production
RUN npx prisma generate
COPY . .

EXPOSE 8080
CMD ["node", "src/server.js"]