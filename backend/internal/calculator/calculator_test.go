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
		{"rejects unknown operation", Operation("modulo"), 1, 2, ErrUnsupportedOperation},
		{"rejects overflow", Multiply, math.MaxFloat64, 10, ErrResultNotFinite},
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
