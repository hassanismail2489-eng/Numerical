using NumericalSolverAPI.Models;
using Z.Expressions;
using System;
using System.Collections.Generic;

namespace NumericalSolverAPI.Methods
{
    public static class NewtonMethod
    {
        private const double Epsilon = 1e-14;

        public static List<IterationData> Solve(
            string equation,
            string derivative,
            double xi,
            double errorThreshold,
            int maxIterations = 200)
        {
            if (string.IsNullOrWhiteSpace(equation))
                throw new ArgumentException("Equation is required.");
            if (string.IsNullOrWhiteSpace(derivative))
                throw new ArgumentException("Derivative is required.");
            if (errorThreshold <= 0)
                throw new ArgumentException("Error threshold must be > 0.");
            if (maxIterations <= 0)
                throw new ArgumentException("Max iterations must be > 0.");

            var iterations = new List<IterationData>();
            double x = xi;

            for (int i = 1; i <= maxIterations; i++)
            {
                double fx = EvaluateSafe(equation, x);
                double fdx = EvaluateSafe(derivative, x);

                if (Math.Abs(fdx) < Epsilon)
                    throw new InvalidOperationException("Derivative is zero or too close to zero.");

                double xnew = x - (fx / fdx);
                double err = Math.Abs(xnew - x);

                iterations.Add(new IterationData
                {
                    Iteration = i,
                    Xi = x,
                    Xu = 0,
                    XR = xnew,
                    Fx = fx,
                    Fdx = fdx,
                    Error = err
                });



                if (Math.Abs(fx) <= errorThreshold || err <= errorThreshold)
                    return iterations;

                x = xnew;
            }

            throw new InvalidOperationException("Newton method did not converge within max iterations.");
        }

        private static double EvaluateSafe(string expression, double x)
        {
            try
            {
                double value = Eval.Execute<double>(expression, new { x });

                if (double.IsNaN(value) || double.IsInfinity(value))
                    throw new InvalidOperationException("Expression evaluation produced NaN/Infinity.");

                return value;
            }
            catch (Exception ex)
            {
                throw new ArgumentException($"Invalid expression at x={x}: {ex.Message}", ex);
            }
        }
    }
}
