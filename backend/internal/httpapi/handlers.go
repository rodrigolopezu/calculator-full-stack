// Package httpapi exposes the calculator over HTTP. It owns request parsing,
// validation and the mapping from domain errors to status codes. It depends on
// the calculator package, never the other way around.
package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/rodrigolopezu/calculator-full-stack/backend/internal/calculator"
)

// calculationRequest is the body accepted by the calculate endpoint. The
// operands are pointers so a missing field can be told apart from a literal 0.
type calculationRequest struct {
	A *float64 `json:"a"`
	B *float64 `json:"b"`
}

// calculationResponse is the success payload.
type calculationResponse struct {
	Operation string  `json:"operation"`
	A         float64 `json:"a"`
	B         float64 `json:"b"`
	Result    float64 `json:"result"`
}

// errorResponse is the single error shape returned by every endpoint. The code
// is stable and machine-readable, so the UI never has to parse messages.
type errorResponse struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// health answers readiness checks.
func health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// calculate runs the operation named in the path over the operands in the body.
func calculate(w http.ResponseWriter, r *http.Request) {
	op := calculator.Operation(r.PathValue("operation"))

	var req calculationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "request body is not valid JSON")
		return
	}

	if req.A == nil {
		writeError(w, http.StatusBadRequest, "missing_operand", `operand "a" is required`)
		return
	}

	// b is optional only for the unary square root.
	var b float64
	switch {
	case req.B != nil:
		b = *req.B
	case op != calculator.SquareRoot:
		writeError(w, http.StatusBadRequest, "missing_operand", `operand "b" is required`)
		return
	}

	result, err := calculator.Apply(op, *req.A, b)
	if err != nil {
		status, code := mapError(err)
		writeError(w, status, code, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, calculationResponse{
		Operation: string(op),
		A:         *req.A,
		B:         b,
		Result:    result,
	})
}

// mapError translates a domain error into an HTTP status and an API code.
func mapError(err error) (int, string) {
	switch {
	case errors.Is(err, calculator.ErrUnsupportedOperation):
		return http.StatusNotFound, "unsupported_operation"
	case errors.Is(err, calculator.ErrDivisionByZero):
		return http.StatusUnprocessableEntity, "division_by_zero"
	case errors.Is(err, calculator.ErrNegativeRoot):
		return http.StatusUnprocessableEntity, "negative_root"
	case errors.Is(err, calculator.ErrResultNotFinite):
		return http.StatusUnprocessableEntity, "result_not_finite"
	default:
		return http.StatusInternalServerError, "internal_error"
	}
}

// writeJSON renders v with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// writeError renders the standard error envelope.
func writeError(w http.ResponseWriter, status int, code, message string) {
	var resp errorResponse
	resp.Error.Code = code
	resp.Error.Message = message
	writeJSON(w, status, resp)
}
