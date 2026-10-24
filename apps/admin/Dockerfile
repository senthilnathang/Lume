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
RUN pnpm --filter @lume/admin build

FROM nginx:stable-alpine
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
