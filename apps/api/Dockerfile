FROM node:22.22-alpine AS build
WORKDIR /workspace
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build:packages && pnpm --filter @valx/api build

FROM node:22.22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /workspace
RUN corepack enable
COPY --from=build /workspace /workspace
EXPOSE 4000
CMD ["sh", "apps/api/entrypoint.sh"]
