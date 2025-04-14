FROM denoland/deno:latest AS builder
WORKDIR /app
COPY . .
RUN deno cache main.ts

FROM denoland/deno:latest
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
CMD ["deno", "run", "--allow-env", "--allow-sys", "--allow-read", "--allow-net", "app.ts"]