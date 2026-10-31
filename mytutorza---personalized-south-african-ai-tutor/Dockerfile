FROM oven/bun:1.4.3
WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .
RUN bun run build
ENV PORT=8080
CMD ["bun", "server.ts"]
