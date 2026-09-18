package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestApply(t *testing.T) {
	tests := []struct {
		name string
		op   Operation
		a, b float64
		want float64
	}{
		{"adds", Add, 2, 3, 5},
		{"adds negatives", Add, -2, -3, -5},
		{"adds decimals", Add, 0.1, 0.2, 0.3},
		{"subtracts", Subtract, 10, 4, 6},
		{"subtracts into negative", Subtract, 4, 10, -6},
		{"multiplies", Multiply, 3, 4, 12},
		{"multiplies by zero", Multiply, 3, 0, 0},
		{"divides", Divide, 10, 4, 2.5},
		{"divides negatives", Divide, -10, 4, -2.5},
		{"raises to a power", Power, 2, 10, 1024},
		{"raises to a negative power", Power, 2, -1, 0.5},
		{"raises to the zeroth power", Power, 5, 0, 1},
		{"takes a square root", SquareRoot, 9, 0, 3},
		{"ignores the second operand on square root", SquareRoot, 16, 99, 4},
		{"takes the square root of zero", SquareRoot, 0, 0, 0},
		{"computes a percentage", Percentage, 200, 15, 30},
		{"computes a percentage of zero", Percentage, 0, 15, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Apply(tt.op, tt.a, tt.b)
			if err != nil {
				t.Fatalf("Apply(%q, %v, %v) returned unexpected error: %v", tt.op, tt.a, tt.b, err)
			}
			if math.Abs(got-tt.want) > 1e-9 {
				t.Errorf("Apply(%q, %v, %v) = %v, want %v", tt.op, tt.a, tt.b, got, tt.want)
			}
		})
	}
}

func TestApplyErrors(t *testing.T) {
	tests := []struct {
		name string
		op   Operation
		a, b float64
		want error
	}{
		{"divides by zero", Divide, 1, 0, ErrDivisionByZero},
		{"divides zero by zero", Divide, 0, 0, ErrDivisionByZero},
		{"rejects a negative square root", SquareRoot, -4, 0, ErrNegativeRoot},
		{"rejects unknown operation", Operation("modulo"), 1, 2, ErrUnsupportedOperation},
		{"rejects overflow on multiply", Multiply, math.MaxFloat64, 10, ErrResultNotFinite},
		{"rejects overflow on power", Power, 10, 400, ErrResultNotFinite},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Apply(tt.op, tt.a, tt.b)
			if !errors.Is(err, tt.want) {
				t.Errorf("Apply(%q, %v, %v) error = %v, want %v", tt.op, tt.a, tt.b, err, tt.want)
			}
		})
	}
}
