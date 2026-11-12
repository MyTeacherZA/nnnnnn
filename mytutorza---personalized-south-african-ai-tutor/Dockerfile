FROM oven/bun:1.4.3
WORKDIR /app

# Install dependencies first so this layer is cached across code changes.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the app and build the Vite client into dist/.
ENV NODE_OPTIONS=--max-old-space-size=8192
COPY . .
RUN bun run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["bun", "server.ts"]

