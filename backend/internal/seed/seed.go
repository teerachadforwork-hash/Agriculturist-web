package seed

import (
	"context"
	"math"
	"time"

	"agriculturist-web/backend/internal/store"
)

func Run(ctx context.Context, st *store.Store) error {
	_, err := st.Pool.Exec(ctx, `
		INSERT INTO crops_master (id, crop_name, icon, image, color, color_rgb, std_moisture, std_starch, std_ccs, unit, price_unit, quality_label, quality_key, quality_min, quality_max, quality_step, quality_default, description, formula)
		VALUES
		('rice','ข้าวเปลือก','🌾','/assets/rice.jpg','#facc15','250, 204, 21',15,NULL,NULL,'กิโลกรัม','บาท/กก.','ความชื้น (%)','moisture',10,35,0.5,22,'ข้าวเปลือกที่เกี่ยวสดมีความชื้น 25-30% ราคามาตรฐานอ้างอิงที่ความชื้น 15% หักน้ำหนัก 1.5% ต่อความชื้นเกิน 1%','หักน้ำหนัก = (ความชื้น - 15) × 15 × (น้ำหนัก/1000)'),
		('cassava','มันสำปะหลัง','🥔','/assets/cassava.jpg','#c68638','198, 134, 56',NULL,25,NULL,'กิโลกรัม','บาท/กก.','เชื้อแป้ง (%)','starch',15,35,0.5,25,'ราคามาตรฐานอ้างอิงที่เชื้อแป้ง 25% ปรับราคา 0.10 บาท/กก. ต่อเชื้อแป้ง 1%','ราคาปรับ = ราคาฐาน + (เชื้อแป้ง - 25) × อัตราปรับ'),
		('sugarcane','อ้อย','🎋','/assets/sugarcane.jpg','#16b460','22, 180, 96',NULL,NULL,10,'ตัน','บาท/ตัน','ค่า C.C.S.','ccs',5,18,0.1,10,'ค่าอ้อยอ้างอิงที่ 10 C.C.S. ปรับขึ้น-ลง 53.40 บาท/ตัน ต่อ 1 หน่วย C.C.S.','ราคาสุดท้าย = ราคาฐาน + (C.C.S. - 10) × 53.40')
		ON CONFLICT (id) DO NOTHING
	`)
	if err != nil {
		return err
	}
	_, err = st.Pool.Exec(ctx, `
		INSERT INTO pricing_rules (id, crop_id, rule_type, deduction_rate, standard_value, effective_date, end_date)
		VALUES
		('rule-rice-01','rice','moisture_deduction',1.5,15,'2026-01-01',NULL),
		('rule-cassava-01','cassava','starch_adjustment',0.10,25,'2026-01-01',NULL),
		('rule-sugarcane-01','sugarcane','ccs_adjustment',53.40,10,'2026-01-01',NULL)
		ON CONFLICT (id) DO NOTHING
	`)
	if err != nil {
		return err
	}

	type fac struct {
		id, name, typ, label, province, hours, phone string
		lat, lng, cap                                float64
		deduct                                       string
	}
	facilities := []fac{
		{"fac-001", "โรงสีทองสมบูรณ์", "rice_mill", "โรงสี", "สุพรรณบุรี", "06:00 - 18:00", "035-xxx-xxx", 14.4744, 100.1177, 500, "[]"},
		{"fac-002", "โรงสีชัยพัฒนา", "rice_mill", "โรงสี", "นครสวรรค์", "06:00 - 20:00", "056-xxx-xxx", 15.7030, 100.1365, 800, "[]"},
		{"fac-003", "โรงสีไทยรุ่งเรือง", "rice_mill", "โรงสี", "พิษณุโลก", "06:00 - 17:00", "055-xxx-xxx", 16.8211, 100.2659, 350, "[]"},
		{"fac-004", "โรงสีบุญมี", "rice_mill", "โรงสี", "อยุธยา", "05:30 - 19:00", "035-xxx-xxx", 14.3532, 100.5686, 600, `[{"label":"ข้าวปน","rate":0.5}]`},
		{"fac-005", "สหกรณ์การเกษตรเมืองลพบุรี", "rice_mill", "โรงสี (สหกรณ์)", "ลพบุรี", "07:00 - 17:00", "036-xxx-xxx", 14.7995, 100.6534, 400, "[]"},
		{"fac-006", "โรงสีศรีสุวรรณ", "rice_mill", "โรงสี", "ชัยนาท", "06:00 - 18:00", "056-xxx-xxx", 15.1851, 100.1250, 450, "[]"},
		{"fac-007", "โรงสีเกษตรทิพย์", "rice_mill", "โรงสี", "อุบลราชธานี", "06:00 - 18:00", "045-xxx-xxx", 15.2287, 104.8564, 700, "[]"},
		{"fac-101", "ลานมันสมพงษ์", "cassava_yard", "ลานมัน", "นครราชสีมา", "06:00 - 18:00", "044-xxx-xxx", 14.9799, 102.0977, 300, `[{"label":"ดินเกิน","rate":2.0}]`},
		{"fac-102", "ลานมันอุดมทรัพย์", "cassava_yard", "ลานมัน", "กำแพงเพชร", "06:00 - 17:00", "055-xxx-xxx", 16.4827, 99.5226, 250, "[]"},
		{"fac-103", "ลานมันเจริญทรัพย์", "cassava_yard", "ลานมัน", "ชลบุรี", "06:00 - 16:00", "038-xxx-xxx", 13.3611, 100.9847, 200, `[{"label":"หัวเน่า","rate":3.0}]`},
		{"fac-104", "ลานมันทวีโชค", "cassava_yard", "ลานมัน", "อุดรธานี", "06:00 - 18:00", "042-xxx-xxx", 17.4156, 102.7872, 350, "[]"},
		{"fac-105", "ลานมันบุรีรัมย์การเกษตร", "cassava_yard", "ลานมัน", "บุรีรัมย์", "06:00 - 17:00", "044-xxx-xxx", 14.9930, 103.1029, 280, "[]"},
		{"fac-201", "โรงงานน้ำตาลมิตรผล (ภูเขียว)", "sugar_factory", "โรงงานน้ำตาล", "ชัยภูมิ", "00:00 - 24:00 (24 ชม.)", "044-xxx-xxx", 16.3850, 102.0350, 2000, `[{"label":"อ้อยไฟไหม้","rate":30.0}]`},
		{"fac-202", "โรงงานน้ำตาลขอนแก่น", "sugar_factory", "โรงงานน้ำตาล", "ขอนแก่น", "00:00 - 24:00 (24 ชม.)", "043-xxx-xxx", 16.4322, 102.8236, 1800, `[{"label":"อ้อยไฟไหม้","rate":30.0}]`},
		{"fac-203", "โรงงานน้ำตาลรวมเกษตรกร (สุพรรณบุรี)", "sugar_factory", "โรงงานน้ำตาล", "สุพรรณบุรี", "00:00 - 24:00 (24 ชม.)", "035-xxx-xxx", 14.5700, 99.9500, 1500, `[{"label":"อ้อยไฟไหม้","rate":30.0}]`},
		{"fac-204", "โรงงานน้ำตาลไทยเอกลักษณ์", "sugar_factory", "โรงงานน้ำตาล", "อุทัยธานี", "00:00 - 24:00 (24 ชม.)", "056-xxx-xxx", 15.3796, 100.0243, 1200, `[{"label":"อ้อยไฟไหม้","rate":30.0}]`},
		{"fac-205", "โรงงานน้ำตาลบุรีรัมย์", "sugar_factory", "โรงงานน้ำตาล", "บุรีรัมย์", "00:00 - 24:00 (24 ชม.)", "044-xxx-xxx", 15.1200, 103.2100, 1600, `[{"label":"อ้อยไฟไหม้","rate":30.0}]`},
		{"fac-206", "โรงงานน้ำตาลกำแพงเพชร", "sugar_factory", "โรงงานน้ำตาล", "กำแพงเพชร", "00:00 - 24:00 (24 ชม.)", "055-xxx-xxx", 16.4700, 99.5100, 1100, `[{"label":"อ้อยไฟไหม้","rate":30.0}]`},
	}
	for _, f := range facilities {
		_, err = st.Pool.Exec(ctx, `
			INSERT INTO facilities (id, name, type, type_label, province, location, capacity_tons, special_deductions, operating_hours, phone)
			VALUES ($1,$2,$3,$4,$5, ST_SetSRID(ST_MakePoint($6,$7),4326)::geography, $8, $9::jsonb, $10, $11)
			ON CONFLICT (id) DO NOTHING
		`, f.id, f.name, f.typ, f.label, f.province, f.lng, f.lat, f.cap, f.deduct, f.hours, f.phone)
		if err != nil {
			return err
		}
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)
	official := map[string]struct {
		price float64
		unit  string
		src   string
	}{
		"rice":      {9.50, "บาท/กก.", "กรมการค้าภายใน"},
		"cassava":   {2.85, "บาท/กก.", "กรมการค้าภายใน"},
		"sugarcane": {890, "บาท/ตัน", "ราชกิจจานุเบกษา (ราคาอ้อยขั้นต้น)"},
	}
	for crop, v := range official {
		if err := st.UpsertOfficialPrice(ctx, crop, v.price, v.unit, v.src, today); err != nil {
			return err
		}
	}

	yard := map[string]struct {
		crop  string
		price float64
	}{
		"fac-001": {"rice", 9.40}, "fac-002": {"rice", 9.55}, "fac-003": {"rice", 9.35},
		"fac-004": {"rice", 9.20}, "fac-005": {"rice", 9.60}, "fac-006": {"rice", 9.45}, "fac-007": {"rice", 9.30},
		"fac-101": {"cassava", 2.80}, "fac-102": {"cassava", 2.90}, "fac-103": {"cassava", 2.70},
		"fac-104": {"cassava", 2.95}, "fac-105": {"cassava", 2.85},
		"fac-201": {"sugarcane", 900}, "fac-202": {"sugarcane", 895}, "fac-203": {"sugarcane", 885},
		"fac-204": {"sugarcane", 880}, "fac-205": {"sugarcane", 910}, "fac-206": {"sugarcane", 875},
	}
	for id, v := range yard {
		if err := st.UpsertFacilityPrice(ctx, id, v.crop, v.price, "facility_owner", today); err != nil {
			return err
		}
	}

	var count int
	if err := st.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM price_snapshots`).Scan(&count); err != nil {
		return err
	}
	if count < 50 {
		bases := map[string]float64{"rice": 9.0, "cassava": 2.5, "sugarcane": 850}
		vols := map[string]float64{"rice": 0.4, "cassava": 0.2, "sugarcane": 25}
		for i := 180; i >= 0; i-- {
			d := today.AddDate(0, 0, -i)
			season := math.Sin(float64(i)/180*math.Pi*2) * 0.5
			for crop, base := range bases {
				vol := vols[crop]
				trend := float64(180-i) / 180 * vol * 0.5
				price := math.Round((base+season*vol+trend)*100) / 100
				if err := st.UpsertOfficialPrice(ctx, crop, price, official[crop].unit, official[crop].src, d); err != nil {
					return err
				}
			}
		}
	}

	_, err = st.Pool.Exec(ctx, `
		INSERT INTO users (line_user_id, line_display_name, role, pdpa_consented_at, community_share_opt_in)
		VALUES ('demo-farmer-001','เกษตรกรทดลอง','farmer', now(), true)
		ON CONFLICT (line_user_id) DO NOTHING
	`)
	return err
}
