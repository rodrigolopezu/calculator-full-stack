package httpapi

import "net/http"

// NewRouter wires the routes and the CORS middleware.
func NewRouter(allowedOrigin string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", health)
	mux.HandleFunc("POST /api/v1/calculate/{operation}", calculate)

	return cors(allowedOrigin, mux)
}

// cors allows the frontend origin and answers preflight requests. The browser
// sends an OPTIONS request before any POST carrying a Content-Type header, and
// it must be answered before routing.
func cors(allowedOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
