FROM node:24-alpine AS build

WORKDIR /app

COPY apps/game-server/package.json apps/game-server/package-lock.json ./
RUN npm ci

COPY apps/game-server/tsconfig.json ./tsconfig.json
COPY apps/game-server/src ./src
COPY apps/game-server/test ./test
RUN npm run test:all

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8788

WORKDIR /app

COPY apps/game-server/package.json apps/game-server/package-lock.json ./
RUN npm ci --omit=dev

COPY BUILD_VERSION ./BUILD_VERSION
COPY --from=build /app/dist ./dist

EXPOSE 8788

CMD ["node", "dist/src/server.js"]
