package pricing

import "testing"

func TestRiceMoistureDeduction(t *testing.T) {
	r := Rice(1000, 22, 9.50, 1.5)
	if r.ExcessMoisture != 7 {
		t.Fatalf("excess=%v", r.ExcessMoisture)
	}
	if r.WeightDeduction != 105 {
		t.Fatalf("deduction=%v want 105", r.WeightDeduction)
	}
	if r.NetWeight != 895 {
		t.Fatalf("netWeight=%v want 895", r.NetWeight)
	}
	if r.NetPrice != 8502.5 {
		t.Fatalf("netPrice=%v want 8502.5", r.NetPrice)
	}
}

func TestRiceNoDeductionAtOrBelowStandard(t *testing.T) {
	r := Rice(1000, 15, 9.50, 1.5)
	if r.WeightDeduction != 0 || r.NetWeight != 1000 {
		t.Fatalf("%+v", r)
	}
	r = Rice(1000, 12, 9.50, 1.5)
	if r.WeightDeduction != 0 {
		t.Fatalf("below standard should not add weight: %+v", r)
	}
}

func TestCassavaStarchAdjustment(t *testing.T) {
	r := Cassava(10000, 27, 2.85, 0.10)
	if r.StarchDifference != 2 {
		t.Fatalf("diff=%v", r.StarchDifference)
	}
	if r.AdjustedPrice != 3.05 {
		t.Fatalf("adjusted=%v want 3.05", r.AdjustedPrice)
	}
	if r.NetPrice != 30500 {
		t.Fatalf("net=%v want 30500", r.NetPrice)
	}
}

func TestSugarcaneUsesBasePriceNotHardcoded890(t *testing.T) {
	r := Sugarcane(10, 11, 900, 53.40)
	if r.FinalPricePerTon != 953.4 {
		t.Fatalf("final=%v", r.FinalPricePerTon)
	}
	if r.NetPrice != 9534 {
		t.Fatalf("net=%v", r.NetPrice)
	}
}

func TestCalculateUnknownCrop(t *testing.T) {
	_, err := Calculate("corn", 1, 1, 1, nil)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestTransportCost(t *testing.T) {
	cost := TransportCost(30, 15) // 200 + (30 * 15 * 3.5) = 200 + 1575 = 1775
	if cost != 1775 {
		t.Fatalf("transportCost=%v want 1775", cost)
	}

	cost = TransportCost(-5, 10)
	if cost != 0 {
		t.Fatalf("transportCost with negative distance=%v want 0", cost)
	}
}

func TestEdgeCases(t *testing.T) {
	// Moisture extremely high
	r := Rice(1000, 40, 9.50, 1.5)
	if r.ExcessMoisture != 25 {
		t.Fatalf("excess=%v", r.ExcessMoisture)
	}
	// weightDeduction = 25 * 15 = 375
	if r.WeightDeduction != 375 {
		t.Fatalf("deduction=%v want 375", r.WeightDeduction)
	}
	
	// Negative weight
	r2 := Cassava(-500, 25, 2.50, 0.10)
	if r2.NetPrice != -1250 {
		t.Fatalf("netPrice=%v want -1250 for negative weight (though shouldn't happen from UI)", r2.NetPrice)
	}
}
