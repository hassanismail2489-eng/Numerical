using NumericalSolverAPI.Models;
using System;

namespace NumericalSolverAPI.Methods
{
    public static class GaussEliminationMethod
    {
        private const double Epsilon = 1e-12;

        public static LinearSystemResult Solve(MatrixInput input)
        {
            if (input == null)
                throw new ArgumentNullException(nameof(input));

            double[,] a =
            {
                { input.A11, input.A12, input.A13, input.A14 },
                { input.A21, input.A22, input.A23, input.A24 },
                { input.A31, input.A32, input.A33, input.A34 }
            };

            // Forward elimination with partial pivoting
            for (int i = 0; i < 3; i++)
            {
                int pivotRow = i;
                for (int r = i + 1; r < 3; r++)
                {
                    if (Math.Abs(a[r, i]) > Math.Abs(a[pivotRow, i]))
                        pivotRow = r;
                }

                if (Math.Abs(a[pivotRow, i]) < Epsilon)
                    throw new InvalidOperationException("System is singular or nearly singular.");

                if (pivotRow != i)
                    SwapRows(a, i, pivotRow);

                for (int r = i + 1; r < 3; r++)
                {
                    double factor = a[r, i] / a[i, i];
                    for (int c = i; c < 4; c++)
                        a[r, c] -= factor * a[i, c];
                }
            }

            // Back substitution
            if (Math.Abs(a[2, 2]) < Epsilon || Math.Abs(a[1, 1]) < Epsilon || Math.Abs(a[0, 0]) < Epsilon)
                throw new InvalidOperationException("Zero pivot found during back substitution.");

            double x3 = a[2, 3] / a[2, 2];
            double x2 = (a[1, 3] - a[1, 2] * x3) / a[1, 1];
            double x1 = (a[0, 3] - a[0, 1] * x2 - a[0, 2] * x3) / a[0, 0];

            return new LinearSystemResult
            {
                X1 = x1,
                X2 = x2,
                X3 = x3
            };
        }

        private static void SwapRows(double[,] m, int r1, int r2)
        {
            for (int c = 0; c < 4; c++)
            {
                double temp = m[r1, c];
                m[r1, c] = m[r2, c];
                m[r2, c] = temp;
            }
        }
    }
}
