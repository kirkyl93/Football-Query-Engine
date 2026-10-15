FROM rust:1-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --locked --release

FROM gcr.io/distroless/cc-debian12
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=builder /app/target/release/football_game /usr/local/bin/football_game
USER 65532:65532
EXPOSE 8080
CMD ["/usr/local/bin/football_game"]
