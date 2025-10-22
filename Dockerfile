# use Bookworm to avoid issue with playwright package from pip
# TODO: switch back to Alpine if possible
FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS base-node-only

FROM base-node-only AS scout-webapp-builder

WORKDIR /monorepo
COPY pnpm-* .
COPY package.json .
COPY packages/scout-agent/package.json packages/scout-agent/package.json
COPY packages/scout-webapp/package.json packages/scout-webapp/package.json
RUN corepack enable && pnpm install --frozen-lockfile

COPY packages ./packages

RUN cd packages/scout-webapp && pnpm build

FROM base-node-only AS base-with-python

COPY --from=ghcr.io/astral-sh/uv:python3.11-bookworm-slim /usr/local/bin/uv /usr/local/bin/uvx /bin/

RUN apt-get update && \
  apt-get install -y python3 python3-pip && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

FROM base-with-python AS nova-act-cli-builder

WORKDIR /app

COPY nova-act-cli/uv.lock ./
COPY nova-act-cli/pyproject.toml ./
RUN uv sync --locked --no-install-project --no-managed-python

COPY nova-act-cli .
RUN uv sync --locked --no-managed-python

FROM base-with-python AS runner

RUN npm install --global @playwright/mcp@0.0.43

WORKDIR /monorepo/packages/scout-webapp
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=scout-webapp-builder --chown=nextjs:nodejs /monorepo/packages/scout-webapp/.next/standalone /monorepo
COPY --from=scout-webapp-builder --chown=nextjs:nodejs /monorepo/packages/scout-webapp/.next/static /monorepo/packages/scout-webapp/.next/static

ENV NOVA_ACT_CLI_PATH=/nova-act-cli
COPY --from=nova-act-cli-builder --chown=nextjs:nodejs /app/.venv/lib/python3.11/site-packages /usr/local/lib/python3.11/dist-packages
COPY nova-act-cli /nova-act-cli

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
