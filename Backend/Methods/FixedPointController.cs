using NumericalSolverAPI.Models;
using Z.Expressions;
using System;
using System.Collections.Generic;

namespace NumericalSolverAPI.Methods
{
    public static class FixedPointMethod
    {
        private const double Epsilon = 1e-14;

        public static List<IterationData> Solve(
            string equation,
            double xi,
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
            double x = xi;

            for (int i = 1; i <= maxIterations; i++)
            {
                double gx = EvaluateSafe(equation, x); // g(xi)
                double err = Math.Abs(gx - x);

                iterations.Add(new IterationData
                {
                    Iteration = i,
                    Xi = x,
                    Xu = 0,
                    XR = gx,      // Xi+1
                    Fx = gx,      // value shown in table as F(Xi) field
                    Error = err
                });

                if (err <= errorThreshold || Math.Abs(gx - x) <= Epsilon)
                    return iterations;

                x = gx;
            }

            throw new InvalidOperationException("Fixed Point did not converge within max iterations.");
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
