FROM node:20-alpine AS build

WORKDIR /app/services/blockchain-service

COPY services/blockchain-service/package*.json ./
RUN npm install

COPY services/blockchain-service/nest-cli.json ./
COPY services/blockchain-service/tsconfig*.json ./
COPY services/blockchain-service/src ./src
COPY services/blockchain-service/proto ./proto

RUN npm run build

FROM node:20-alpine

WORKDIR /app/services/blockchain-service

ENV NODE_ENV=production

COPY --from=build /app/services/blockchain-service ./

EXPOSE 50055

CMD ["node", "dist/main.js"]
