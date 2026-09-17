FROM node:24-alpine AS build

WORKDIR /app

COPY apps/rooms-api/package.json apps/rooms-api/package-lock.json ./
RUN npm ci

COPY apps/rooms-api/tsconfig.json ./tsconfig.json
COPY apps/rooms-api/src ./src
COPY apps/rooms-api/test ./test
RUN npm test

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

WORKDIR /app

COPY apps/rooms-api/package.json apps/rooms-api/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/src/index.js"]
