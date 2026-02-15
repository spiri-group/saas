# Stage 1: Install dependencies
FROM node:20.19.0-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install

# Stage 2: Build the Next.js application
FROM node:20.19.0-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time variables (baked into the Next.js bundle)
ARG NEXT_PUBLIC_server_endpoint
ARG NEXT_PUBLIC_server_endpoint_code
ARG NEXT_PUBLIC_stripe_token
ARG NEXT_PUBLIC_GOOGLE_KEY
ARG NEXT_PUBLIC_STORAGE_ACCOUNT
ARG NEXT_PUBLIC_graphql_proxy
ARG NEXT_PUBLIC_site_address

ENV NEXT_PUBLIC_server_endpoint=$NEXT_PUBLIC_server_endpoint
ENV NEXT_PUBLIC_server_endpoint_code=$NEXT_PUBLIC_server_endpoint_code
ENV NEXT_PUBLIC_stripe_token=$NEXT_PUBLIC_stripe_token
ENV NEXT_PUBLIC_GOOGLE_KEY=$NEXT_PUBLIC_GOOGLE_KEY
ENV NEXT_PUBLIC_STORAGE_ACCOUNT=$NEXT_PUBLIC_STORAGE_ACCOUNT
ENV NEXT_PUBLIC_graphql_proxy=$NEXT_PUBLIC_graphql_proxy
ENV NEXT_PUBLIC_site_address=$NEXT_PUBLIC_site_address

RUN yarn build

# Stage 3: Production runtime
FROM node:20.19.0-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
