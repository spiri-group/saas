# Container Jobs Dockerfile
# Built from graphql-backend root context: docker build -f jobs/Dockerfile .
FROM node:20.19.0-alpine

WORKDIR /app

# Install dependencies (from backend package.json)
COPY package.json package-lock.json* yarn.lock* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile --production=false; \
    else npm ci; fi

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY jobs/ ./jobs/

# Compile TypeScript using jobs-specific tsconfig
RUN npx tsc --project jobs/tsconfig.json

# Entry point: pass job name as argument
# e.g., docker run <image> booking-reminder
ENTRYPOINT ["node"]
CMD ["dist/jobs/booking-reminder.js"]
