package calculator

import "errors"

// Domain errors. The HTTP layer maps each one to a status code, so it never
// needs to inspect error strings.
var (
	// ErrDivisionByZero is returned when the divisor is zero.
	ErrDivisionByZero = errors.New("division by zero")
	// ErrUnsupportedOperation is returned for an unknown operation.
	ErrUnsupportedOperation = errors.New("unsupported operation")
	// ErrResultNotFinite is returned when a result overflows or is NaN.
	ErrResultNotFinite = errors.New("result is not a finite number")
)
