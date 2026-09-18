FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN npx prisma generate

COPY src ./src
COPY .env.example ./

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
