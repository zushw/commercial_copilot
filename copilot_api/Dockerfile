FROM node:25-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx tsc

FROM node:25-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main/server.js"]