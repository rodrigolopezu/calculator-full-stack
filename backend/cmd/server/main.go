// Command server starts the calculator HTTP API.
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/rodrigolopezu/calculator-full-stack/backend/internal/httpapi"
)

func main() {
	addr := ":" + envOr("PORT", "8080")
	allowedOrigin := envOr("ALLOWED_ORIGIN", "http://localhost:5173")

	log.Printf("listening on %s, allowing origin %s", addr, allowedOrigin)
	if err := http.ListenAndServe(addr, httpapi.NewRouter(allowedOrigin)); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

// envOr reads an environment variable with a development fallback.
func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
