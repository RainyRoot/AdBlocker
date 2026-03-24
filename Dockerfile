FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build

COPY . .
RUN pnpm install --frozen-lockfile

RUN pnpm run fetch-filters && pnpm run convert-filters && pnpm exec wxt build

FROM alpine:3.21

RUN apk add --no-cache coreutils

WORKDIR /extension

COPY --from=builder /build/.output/chrome-mv3 ./chrome-mv3/

ENTRYPOINT ["cp", "-r", "/extension/chrome-mv3/.", "/out/chrome-mv3/"]
