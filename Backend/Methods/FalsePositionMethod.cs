using NumericalSolverAPI.Models;
using Z.Expressions;
using System;
using System.Collections.Generic;

namespace NumericalSolverAPI.Methods
{
    public class FalsePositionMethod
    {
        public static List<IterationData> Solve(
            string equation,
            double xi,
            double xu,
            double errorThreshold,
            int maxIterations = 200)
        {
            if (string.IsNullOrWhiteSpace(equation))
                throw new ArgumentException("Equation is required.");
            if (errorThreshold <= 0)
                throw new ArgumentException("Error threshold must be > 0.");

            var iterations = new List<IterationData>();

            double fxi = Eval.Execute<double>(equation, new { x = xi });
            double fxu = Eval.Execute<double>(equation, new { x = xu });

            if (fxi * fxu > 0)
                throw new ArgumentException("False Position requires opposite signs at xi and xu.");

            double prevXr = double.NaN;

            for (int i = 1; i <= maxIterations; i++)
            {
                double denom = (fxi - fxu);
                if (Math.Abs(denom) < 1e-14)
                    throw new InvalidOperationException("Division by zero risk in False Position.");

                double xr = xu - (fxu * (xi - xu)) / denom;
                double fxr = Eval.Execute<double>(equation, new { x = xr });

                double err = double.IsNaN(prevXr) ? 0 : Math.Abs(xr - prevXr);

                iterations.Add(new IterationData
                {
                    Iteration = i,
                    Xi = xi,
                    Xu = xu,
                    XR = xr,
                    Fx = fxr,
                    Error = err
                });

                if (Math.Abs(fxr) <= errorThreshold || (!double.IsNaN(prevXr) && err <= errorThreshold))
                    return iterations;

                if (fxi * fxr < 0)
                {
                    xu = xr;
                    fxu = fxr;
                }
                else
                {
                    xi = xr;
                    fxi = fxr;
                }

                prevXr = xr;
            }

            throw new InvalidOperationException("False Position did not converge within max iterations.");
        }
    }
}
