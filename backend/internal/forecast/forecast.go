package forecast

import "math"

type Point struct {
	X float64
	Y float64
}

func LinearPredict(history []Point, steps int) []float64 {
	n := float64(len(history))
	if n < 2 {
		out := make([]float64, steps)
		last := 0.0
		if len(history) == 1 {
			last = history[0].Y
		}
		for i := range out {
			out[i] = last
		}
		return out
	}
	var sumX, sumY, sumXY, sumXX float64
	for _, p := range history {
		sumX += p.X
		sumY += p.Y
		sumXY += p.X * p.Y
		sumXX += p.X * p.X
	}
	den := n*sumXX - sumX*sumX
	slope := 0.0
	if den != 0 {
		slope = (n*sumXY - sumX*sumY) / den
	}
	intercept := (sumY - slope*sumX) / n
	lastX := history[len(history)-1].X
	out := make([]float64, steps)
	for i := 0; i < steps; i++ {
		out[i] = intercept + slope*(lastX+float64(i+1))
	}
	return out
}

func WarningLevel(changePct float64) (level, label string) {
	switch {
	case changePct <= -10:
		return "danger", "วิกฤต"
	case changePct <= -4:
		return "warning", "เฝ้าระวัง"
	default:
		return "success", "ปกติ"
	}
}

func Round2(v float64) float64 {
	return math.Round(v*100) / 100
}
