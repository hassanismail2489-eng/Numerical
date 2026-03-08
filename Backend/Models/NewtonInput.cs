namespace NumericalSolverAPI.Models
{
    public class NewtonInput
    {
        public string Equation { get; set; } = string.Empty;
        public string Derivative { get; set; } = string.Empty;
        public double Xi { get; set; }
        public double Error { get; set; }
    }
}
