FROM node:18-slim as builder
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN mkdir -p patches
COPY patches ./patches
RUN pnpm install
COPY . .
RUN pnpm run build

FROM alpine as assets
RUN apk add --no-cache jq moreutils
WORKDIR /app
COPY assets ./assets
RUN find assets -name '*.json' -exec sh -c 'grep -v "//" "$1" | jq -c . | sponge "$1"' _ {} \;

FROM node:18-slim
RUN npm install -g pnpm
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN mkdir -p patches
COPY patches ./patches
RUN pnpm install
COPY --from=builder /app/dist ./dist
COPY --from=assets /app/assets ./assets
COPY docs ./docs
EXPOSE 3000
CMD pnpm run start:prod
