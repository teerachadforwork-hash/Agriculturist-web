package pricing

import (
	"fmt"
	"math"
)

type Rule struct {
	ID             string   `json:"id"`
	CropID         string   `json:"cropId"`
	RuleType       string   `json:"ruleType"`
	DeductionRate  float64  `json:"deductionRate"`
	StandardValue  float64  `json:"standardValue"`
	EffectiveDate  string   `json:"effectiveDate"`
	EndDate        *string  `json:"endDate"`
}

type BreakdownItem struct {
	Label     string `json:"label"`
	Value     string `json:"value"`
	Highlight bool   `json:"highlight,omitempty"`
	Important bool   `json:"important,omitempty"`
}

type Result struct {
	CropType          string           `json:"cropType"`
	TotalWeight       float64          `json:"totalWeight"`
	Moisture          float64          `json:"moisture,omitempty"`
	Starch            float64          `json:"starch,omitempty"`
	CCS               float64          `json:"ccs,omitempty"`
	StandardMoisture  float64          `json:"standardMoisture,omitempty"`
	StandardStarch    float64          `json:"standardStarch,omitempty"`
	StandardCcs       float64          `json:"standardCcs,omitempty"`
	ExcessMoisture    float64          `json:"excessMoisture,omitempty"`
	StarchDifference  float64          `json:"starchDifference,omitempty"`
	CcsDifference     float64          `json:"ccsDifference,omitempty"`
	DeductionRate     float64          `json:"deductionRate,omitempty"`
	AdjustRate        float64          `json:"adjustRate,omitempty"`
	CcsRate           float64          `json:"ccsRate,omitempty"`
	WeightDeduction   float64          `json:"weightDeduction,omitempty"`
	PriceAdjustment   float64          `json:"priceAdjustment,omitempty"`
	AdjustedPrice     float64          `json:"adjustedPrice,omitempty"`
	FinalPricePerTon  float64          `json:"finalPricePerTon,omitempty"`
	NetWeight         float64          `json:"netWeight"`
	BasePrice         float64          `json:"basePrice"`
	PricePerUnit      float64          `json:"pricePerUnit"`
	NetPrice          float64          `json:"netPrice"`
	Unit              string           `json:"unit"`
	PriceUnit         string           `json:"priceUnit"`
	Breakdown         []BreakdownItem  `json:"breakdown"`
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func Rice(totalWeight, moisture, basePrice, deductionRate float64) Result {
	if deductionRate == 0 {
		deductionRate = 1.5
	}
	standard := 15.0
	excess := math.Max(0, moisture-standard)
	weightDeduction := excess * (deductionRate * 10) * (totalWeight / 1000)
	netWeight := totalWeight - weightDeduction
	netPrice := netWeight * basePrice
	return Result{
		CropType:         "rice",
		TotalWeight:      totalWeight,
		Moisture:         moisture,
		StandardMoisture: standard,
		ExcessMoisture:   excess,
		DeductionRate:    deductionRate,
		WeightDeduction:  round2(weightDeduction),
		NetWeight:        round2(netWeight),
		BasePrice:        basePrice,
		PricePerUnit:     basePrice,
		NetPrice:         round2(netPrice),
		Unit:             "กก.",
		PriceUnit:        "บาท/กก.",
		Breakdown: []BreakdownItem{
			{Label: "น้ำหนักรวม", Value: fmt.Sprintf("%.0f กก.", totalWeight)},
			{Label: "ความชื้นวัดได้", Value: fmt.Sprintf("%.1f%%", moisture)},
			{Label: "ความชื้นมาตรฐาน", Value: fmt.Sprintf("%.0f%%", standard)},
			{Label: "ความชื้นเกิน", Value: fmt.Sprintf("%.1f%%", excess), Highlight: excess > 0},
			{Label: "น้ำหนักที่ถูกหัก", Value: fmt.Sprintf("%.0f กก.", math.Round(weightDeduction)), Highlight: weightDeduction > 0},
			{Label: "น้ำหนักสุทธิ", Value: fmt.Sprintf("%.0f กก.", math.Round(netWeight)), Important: true},
			{Label: "ราคาฐาน (ที่ 15%)", Value: fmt.Sprintf("%.2f บาท/กก.", basePrice)},
			{Label: "รายได้คาดการณ์", Value: fmt.Sprintf("%.0f บาท", math.Round(netPrice)), Important: true},
		},
	}
}

func Cassava(totalWeight, starch, basePrice, adjustRate float64) Result {
	if adjustRate == 0 {
		adjustRate = 0.10
	}
	standard := 25.0
	diff := starch - standard
	adj := diff * adjustRate
	adjusted := basePrice + adj
	net := totalWeight * adjusted
	return Result{
		CropType:         "cassava",
		TotalWeight:      totalWeight,
		Starch:           starch,
		StandardStarch:   standard,
		StarchDifference: diff,
		AdjustRate:       adjustRate,
		PriceAdjustment:  round2(adj),
		AdjustedPrice:    round2(adjusted),
		BasePrice:        basePrice,
		PricePerUnit:     round2(adjusted),
		NetPrice:         round2(net),
		NetWeight:        totalWeight,
		Unit:             "กก.",
		PriceUnit:        "บาท/กก.",
		Breakdown: []BreakdownItem{
			{Label: "น้ำหนักรวม", Value: fmt.Sprintf("%.0f กก.", totalWeight)},
			{Label: "เชื้อแป้งวัดได้", Value: fmt.Sprintf("%.1f%%", starch)},
			{Label: "เชื้อแป้งมาตรฐาน", Value: fmt.Sprintf("%.0f%%", standard)},
			{Label: "ส่วนต่างเชื้อแป้ง", Value: fmt.Sprintf("%+.1f%%", diff), Highlight: diff != 0},
			{Label: "ราคาฐาน (ที่ 25%)", Value: fmt.Sprintf("%.2f บาท/กก.", basePrice)},
			{Label: "ปรับราคา", Value: fmt.Sprintf("%+.2f บาท/กก.", adj), Highlight: true},
			{Label: "ราคาสุทธิต่อ กก.", Value: fmt.Sprintf("%.2f บาท/กก.", adjusted), Important: true},
			{Label: "รายได้คาดการณ์", Value: fmt.Sprintf("%.0f บาท", math.Round(net)), Important: true},
		},
	}
}

func Sugarcane(totalWeight, ccs, basePrice, ccsRate float64) Result {
	if ccsRate == 0 {
		ccsRate = 53.40
	}
	standard := 10.0
	diff := ccs - standard
	adj := diff * ccsRate
	final := basePrice + adj
	net := totalWeight * final
	return Result{
		CropType:         "sugarcane",
		TotalWeight:      totalWeight,
		CCS:              ccs,
		StandardCcs:      standard,
		CcsDifference:    diff,
		CcsRate:          ccsRate,
		PriceAdjustment:  round2(adj),
		FinalPricePerTon: round2(final),
		BasePrice:        basePrice,
		PricePerUnit:     round2(final),
		NetPrice:         round2(net),
		NetWeight:        totalWeight,
		Unit:             "ตัน",
		PriceUnit:        "บาท/ตัน",
		Breakdown: []BreakdownItem{
			{Label: "น้ำหนักรวม", Value: fmt.Sprintf("%.2f ตัน", totalWeight)},
			{Label: "C.C.S. วัดได้", Value: fmt.Sprintf("%.1f", ccs)},
			{Label: "C.C.S. มาตรฐาน", Value: fmt.Sprintf("%.0f", standard)},
			{Label: "ส่วนต่าง C.C.S.", Value: fmt.Sprintf("%+.1f", diff), Highlight: diff != 0},
			{Label: "ราคาฐาน (ที่ 10 CCS)", Value: fmt.Sprintf("%.0f บาท/ตัน", basePrice)},
			{Label: "ปรับราคา", Value: fmt.Sprintf("%+.2f บาท/ตัน", adj), Highlight: true},
			{Label: "ราคาสุทธิต่อตัน", Value: fmt.Sprintf("%.0f บาท/ตัน", math.Round(final)), Important: true},
			{Label: "รายได้คาดการณ์", Value: fmt.Sprintf("%.0f บาท", math.Round(net)), Important: true},
		},
	}
}

func Calculate(cropID string, totalWeight, quality, basePrice float64, rule *Rule) (Result, error) {
	rate := 0.0
	if rule != nil {
		rate = rule.DeductionRate
	}
	switch cropID {
	case "rice":
		if rate == 0 {
			rate = 1.5
		}
		return Rice(totalWeight, quality, basePrice, rate), nil
	case "cassava":
		if rate == 0 {
			rate = 0.10
		}
		return Cassava(totalWeight, quality, basePrice, rate), nil
	case "sugarcane":
		if rate == 0 {
			rate = 53.40
		}
		return Sugarcane(totalWeight, quality, basePrice, rate), nil
	default:
		return Result{}, fmt.Errorf("unknown crop type: %s", cropID)
	}
}

const TransportBase = 200.0
const TransportRatePerKmPerTon = 3.5

func TransportCost(distanceKm, weightTons float64) float64 {
	if distanceKm <= 0 || weightTons <= 0 {
		return 0
	}
	return TransportBase + (distanceKm * weightTons * TransportRatePerKmPerTon)
}
