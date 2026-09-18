// Package calculator implements the arithmetic domain. It is deliberately free
// of transport concerns: no HTTP, no JSON, no status codes.
package calculator

import "math"

// Operation identifies a supported arithmetic operation.
type Operation string

// Supported operations.
const (
	Add        Operation = "add"
	Subtract   Operation = "subtract"
	Multiply   Operation = "multiply"
	Divide     Operation = "divide"
	Power      Operation = "power"
	SquareRoot Operation = "sqrt"
	Percentage Operation = "percentage"
)

// Apply runs op over a and b. It is the single entry point of the domain:
// callers never reach the individual operations, so validation lives in one
// place. SquareRoot is unary and ignores b.
func Apply(op Operation, a, b float64) (float64, error) {
	var result float64

	switch op {
	case Add:
		result = a + b
	case Subtract:
		result = a - b
	case Multiply:
		result = a * b
	case Divide:
		if b == 0 {
			return 0, ErrDivisionByZero
		}
		result = a / b
	case Power:
		result = math.Pow(a, b)
	case SquareRoot:
		if a < 0 {
			return 0, ErrNegativeRoot
		}
		result = math.Sqrt(a)
	case Percentage:
		// b percent of a, the behaviour of a handheld calculator.
		result = a * b / 100
	default:
		return 0, ErrUnsupportedOperation
	}

	if math.IsNaN(result) || math.IsInf(result, 0) {
		return 0, ErrResultNotFinite
	}

	return result, nil
}
