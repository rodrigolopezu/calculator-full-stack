# ---- build stage ----------------------------------------------------------
FROM golang:1.27-alpine AS build

WORKDIR /src

# Dependencies are cached in their own layer: they only change when go.mod does.
COPY go.mod ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ---- runtime stage --------------------------------------------------------
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/server /server

USER nonroot:nonroot
EXPOSE 8080

ENTRYPOINT ["/server"]