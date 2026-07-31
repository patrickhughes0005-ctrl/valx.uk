FROM node:22.22-alpine AS build
WORKDIR /workspace
RUN corepack enable
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build:packages && pnpm --filter @valx/admin build

FROM node:22.22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /workspace
RUN corepack enable
COPY --from=build /workspace /workspace
EXPOSE 3000
CMD ["pnpm", "--filter", "@valx/admin", "start"]
