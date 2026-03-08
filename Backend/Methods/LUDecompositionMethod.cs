using NumericalSolverAPI.Models;
using System;

namespace NumericalSolverAPI.Methods
{
    public static class LUDecompositionMethod
    {
        private const double Epsilon = 1e-12;

        public static LinearSystemResult Solve(MatrixInput input)
        {
            if (input == null)
                throw new ArgumentNullException(nameof(input));

            double[,] A =
            {
                { input.A11, input.A12, input.A13 },
                { input.A21, input.A22, input.A23 },
                { input.A31, input.A32, input.A33 }
            };

            double[] b = { input.A14, input.A24, input.A34 };

            double[,] L = new double[3, 3];
            double[,] U = new double[3, 3];

            // Doolittle LU Decomposition
            for (int i = 0; i < 3; i++)
            {
                // Build U row
                for (int k = i; k < 3; k++)
                {
                    double sum = 0;
                    for (int j = 0; j < i; j++)
                        sum += L[i, j] * U[j, k];

                    U[i, k] = A[i, k] - sum;
                }

                if (Math.Abs(U[i, i]) < Epsilon)
                    throw new InvalidOperationException("LU failed: zero pivot encountered.");

                // Build L column
                for (int k = i; k < 3; k++)
                {
                    if (i == k)
                    {
                        L[i, i] = 1;
                    }
                    else
                    {
                        double sum = 0;
                        for (int j = 0; j < i; j++)
                            sum += L[k, j] * U[j, i];

                        L[k, i] = (A[k, i] - sum) / U[i, i];
                    }
                }
            }

            // Forward substitution: Ly = b
            double[] y = new double[3];
            for (int i = 0; i < 3; i++)
            {
                double sum = 0;
                for (int j = 0; j < i; j++)
                    sum += L[i, j] * y[j];

                y[i] = b[i] - sum;
            }

            // Back substitution: Ux = y
            double[] x = new double[3];
            for (int i = 2; i >= 0; i--)
            {
                double sum = 0;
                for (int j = i + 1; j < 3; j++)
                    sum += U[i, j] * x[j];

                if (Math.Abs(U[i, i]) < Epsilon)
                    throw new InvalidOperationException("Back substitution failed: zero pivot.");

                x[i] = (y[i] - sum) / U[i, i];
            }

            return new LinearSystemResult
            {
                X1 = x[0],
                X2 = x[1],
                X3 = x[2]
            };
        }
    }
}
