FROM node:22-bookworm-slim AS build
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.28.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/website/package.json apps/website/package.json
COPY packages/@lume/eslint-config/package.json packages/@lume/eslint-config/package.json
COPY packages/@lume/module-ui/package.json packages/@lume/module-ui/package.json
COPY packages/@lume/prettier-config/package.json packages/@lume/prettier-config/package.json
COPY packages/@lume/tailwind-config/package.json packages/@lume/tailwind-config/package.json
COPY packages/@lume/tsconfig/package.json packages/@lume/tsconfig/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm --filter @lume/website exec nuxt prepare
RUN pnpm --filter @lume/website build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3100
COPY --from=build --chown=node:node /workspace/apps/website/.output ./.output
USER node
EXPOSE 3100
CMD ["node", ".output/server/index.mjs"]
