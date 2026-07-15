# Stage 1
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

RUN apt-get update \
 && apt-get install -y openssl \
 && rm -rf /var/lib/apt/lists/*
 
RUN npm ci

ENV DATABASE_URL=postgresql://postgres:password@db:5432/postgres

RUN npx prisma generate

COPY . .

# Stage 2
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=${DATABASE_URL:-postgresql://postgres:password@db:5432/postgres}

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma.config.ts ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/app.js ./
COPY --from=builder /app/bin ./bin

EXPOSE 3000

CMD ["node", "./bin/www"]