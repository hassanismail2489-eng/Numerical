using System.Text.Json.Serialization;

namespace NumericalSolverAPI.Models
{
    public class IterationData
    {
        public int Iteration { get; set; }
        public double Xi { get; set; }
        public double Xu { get; set; }
        public double XR { get; set; }
        public double Fx { get; set; }
        public double Error { get; set; }

        [JsonPropertyName("f'(x)")]
        public double? Fdx { get; set; }
    }
}
