using NumericalSolverAPI.Models;
using Z.Expressions;
using System;
using System.Collections.Generic;

namespace NumericalSolverAPI.Methods
{
    public static class BisectionMethod
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
            if (maxIterations <= 0)
                throw new ArgumentException("Max iterations must be > 0.");

            var iterations = new List<IterationData>();

            double fxi = EvaluateSafe(equation, xi);
            double fxu = EvaluateSafe(equation, xu);

            if (fxi * fxu > 0)
                throw new ArgumentException("Bisection requires opposite signs at xi and xu.");

            double prevXr = double.NaN;

            for (int i = 1; i <= maxIterations; i++)
            {
                double xr = (xi + xu) / 2.0;
                double fxr = EvaluateSafe(equation, xr);
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

            throw new InvalidOperationException("Bisection did not converge within max iterations.");
        }

        private static double EvaluateSafe(string equation, double x)
        {
            try
            {
                double value = Eval.Execute<double>(equation, new { x });
                if (double.IsNaN(value) || double.IsInfinity(value))
                    throw new InvalidOperationException("Equation produced NaN/Infinity.");
                return value;
            }
            catch (Exception ex)
            {
                throw new ArgumentException($"Invalid equation at x = {x}: {ex.Message}", ex);
            }
        }
    }
}
