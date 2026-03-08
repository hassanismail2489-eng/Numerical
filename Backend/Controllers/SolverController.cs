using Microsoft.AspNetCore.Mvc;
using NumericalSolverAPI.Models;
using NumericalSolverAPI.Methods;

namespace NumericalSolverAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SolverController : ControllerBase
    {
        [HttpPost("bisection")]
        public IActionResult Bisection([FromBody] SolverInput? input)
        {
            if (input is null) return BadRequest(new { error = "Input is null" });
            return Execute(() => BisectionMethod.Solve(input.Equation, input.Xi, input.Xu, input.Error));
        }

        [HttpPost("falseposition")]
        public IActionResult FalsePosition([FromBody] SolverInput? input)
        {
            if (input is null) return BadRequest(new { error = "Input is null" });
            return Execute(() => FalsePositionMethod.Solve(input.Equation, input.Xi, input.Xu, input.Error));
        }

        [HttpPost("newton")]
        public IActionResult Newton([FromBody] NewtonInput? input)
        {
            if (input is null) return BadRequest(new { error = "Input is null" });
            return Execute(() => NewtonMethod.Solve(input.Equation, input.Derivative, input.Xi, input.Error));
        }

        [HttpPost("fixedpoint")]
        public IActionResult FixedPoint([FromBody] SolverInput? input)
        {
            if (input is null) return BadRequest(new { error = "Input is null" });
            return Execute(() => FixedPointMethod.Solve(input.Equation, input.Xi, input.Error));
        }

        [HttpPost("gauss")]
        public IActionResult Gauss([FromBody] MatrixInput? input)
        {
            if (input is null) return BadRequest(new { error = "Input is null" });
            return Execute(() => GaussEliminationMethod.Solve(input));
        }

        [HttpPost("lu")]
        public IActionResult LU([FromBody] MatrixInput? input)
        {
            if (input is null) return BadRequest(new { error = "Input is null" });
            return Execute(() => LUDecompositionMethod.Solve(input));
        }

        [HttpPost("cramer")]
        public IActionResult Cramer([FromBody] MatrixInput? input)
        {
            if (input is null) return BadRequest(new { error = "Input is null" });
            return Execute(() => CramersRuleMethod.Solve(input));
        }

        private IActionResult Execute<T>(Func<T> action)
        {
            try
            {
                return Ok(action());
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
