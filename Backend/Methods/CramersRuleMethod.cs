using NumericalSolverAPI.Models;

namespace NumericalSolverAPI.Methods
{
    public class CramersRuleMethod
    {
        public static LinearSystemResult Solve(MatrixInput input)
        {
            if (input == null)
                throw new ArgumentNullException(nameof(input));

            double[,] a =
            {
                { input.A11, input.A12, input.A13 },
                { input.A21, input.A22, input.A23 },
                { input.A31, input.A32, input.A33 }
            };

            double[] b = { input.A14, input.A24, input.A34 };

            double detA = Determinant3x3(a);
            if (Math.Abs(detA) < 1e-12)
                throw new InvalidOperationException("System is singular or nearly singular (detA ≈ 0).");

            double[,] ax =
            {
                { b[0], a[0,1], a[0,2] },
                { b[1], a[1,1], a[1,2] },
                { b[2], a[2,1], a[2,2] }
            };

            double[,] ay =
            {
                { a[0,0], b[0], a[0,2] },
                { a[1,0], b[1], a[1,2] },
                { a[2,0], b[2], a[2,2] }
            };

            double[,] az =
            {
                { a[0,0], a[0,1], b[0] },
                { a[1,0], a[1,1], b[1] },
                { a[2,0], a[2,1], b[2] }
            };

            return new LinearSystemResult
            {
                X1 = Determinant3x3(ax) / detA,
                X2 = Determinant3x3(ay) / detA,
                X3 = Determinant3x3(az) / detA
            };
        }

        private static double Determinant3x3(double[,] m)
        {
            return
                m[0, 0] * (m[1, 1] * m[2, 2] - m[1, 2] * m[2, 1]) -
                m[0, 1] * (m[1, 0] * m[2, 2] - m[1, 2] * m[2, 0]) +
                m[0, 2] * (m[1, 0] * m[2, 1] - m[1, 1] * m[2, 0]);
        }
    }
}
