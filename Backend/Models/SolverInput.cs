namespace NumericalSolverAPI.Models
{
    public class SolverInput
    {
        public string Equation { get; set; } = string.Empty;
        public double Xi { get; set; }
        public double Xu { get; set; }
        public double Error { get; set; }
    }
}
