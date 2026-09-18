package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// post drives a request through the real router, so routing is covered too.
func post(t *testing.T, operation, body string) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate/"+operation, strings.NewReader(body))
	rec := httptest.NewRecorder()
	NewRouter("*").ServeHTTP(rec, req)

	return rec
}

func TestCalculate(t *testing.T) {
	tests := []struct {
		name      string
		operation string
		body      string
		want      float64
	}{
		{"adds", "add", `{"a":7,"b":5}`, 12},
		{"subtracts", "subtract", `{"a":7,"b":5}`, 2},
		{"multiplies", "multiply", `{"a":7,"b":5}`, 35},
		{"divides", "divide", `{"a":10,"b":4}`, 2.5},
		{"accepts zero as an operand", "add", `{"a":0,"b":0}`, 0},
		{"takes a square root without b", "sqrt", `{"a":9}`, 3},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := post(t, tt.operation, tt.body)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
			}

			var got calculationResponse
			if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
				t.Fatalf("decoding response: %v", err)
			}
			if got.Result != tt.want {
				t.Errorf("result = %v, want %v", got.Result, tt.want)
			}
			if got.Operation != tt.operation {
				t.Errorf("operation = %q, want %q", got.Operation, tt.operation)
			}
		})
	}
}

func TestCalculateErrors(t *testing.T) {
	tests := []struct {
		name       string
		operation  string
		body       string
		wantStatus int
		wantCode   string
	}{
		{"rejects malformed json", "add", `{`, http.StatusBadRequest, "invalid_json"},
		{"rejects a missing operand", "add", `{"a":1}`, http.StatusBadRequest, "missing_operand"},
		{"rejects an unknown operation", "modulo", `{"a":1,"b":2}`, http.StatusNotFound, "unsupported_operation"},
		{"rejects division by zero", "divide", `{"a":1,"b":0}`, http.StatusUnprocessableEntity, "division_by_zero"},
		{"rejects a negative square root", "sqrt", `{"a":-4}`, http.StatusUnprocessableEntity, "negative_root"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := post(t, tt.operation, tt.body)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, tt.wantStatus, rec.Body)
			}

			var got errorResponse
			if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
				t.Fatalf("decoding response: %v", err)
			}
			if got.Error.Code != tt.wantCode {
				t.Errorf("code = %q, want %q", got.Error.Code, tt.wantCode)
			}
		})
	}
}

func TestHealth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	NewRouter("*").ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
}
