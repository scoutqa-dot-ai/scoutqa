FROM public.ecr.aws/docker/library/node:22-alpine AS base

RUN apk add --no-cache libc6-compat

FROM base AS builder

WORKDIR /monorepo
COPY pnpm-* .
COPY package.json .
COPY packages/scout-agent/package.json packages/scout-agent/package.json
COPY packages/scout-webapp/package.json packages/scout-webapp/package.json
RUN corepack enable && pnpm install --frozen-lockfile

COPY packages ./packages

RUN cd packages/scout-webapp && pnpm build

FROM base AS runner

RUN npm install --global @playwright/mcp@0.0.43

WORKDIR /monorepo/packages/scout-webapp
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=builder --chown=nextjs:nodejs /monorepo/packages/scout-webapp/.next/standalone /monorepo
COPY --from=builder --chown=nextjs:nodejs /monorepo/packages/scout-webapp/.next/static /monorepo/packages/scout-webapp/.next/static

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
