FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server ./server
COPY public ./public

RUN mkdir -p /var/data/uploads

ENV SQLITE_DB_PATH=/var/data/sena-one.sqlite
ENV UPLOAD_DIR=/var/data/uploads

EXPOSE 3000

CMD ["npm", "run", "server"]
