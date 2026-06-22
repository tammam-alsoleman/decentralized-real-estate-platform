FROM node:20-alpine AS build

WORKDIR /app/services/auth-service

COPY services/auth-service/package*.json ./
RUN npm ci

COPY services/auth-service/nest-cli.json ./
COPY services/auth-service/tsconfig*.json ./
COPY services/auth-service/prisma ./prisma
COPY services/auth-service/src ./src
COPY packages/proto /app/packages/proto

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

WORKDIR /app/services/auth-service

ENV NODE_ENV=production

COPY --from=build /app/services/auth-service ./
COPY --from=build /app/packages/proto /app/packages/proto

EXPOSE 50051

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
