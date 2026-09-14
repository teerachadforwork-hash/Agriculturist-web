package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"agriculturist-web/backend/internal/pricing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	Pool *pgxpool.Pool
}

type User struct {
	ID              string    `json:"id"`
	LineUserID      string    `json:"lineUserId"`
	LineDisplayName string    `json:"lineDisplayName"`
	PictureURL      string    `json:"pictureUrl,omitempty"`
	Phone           string    `json:"phone,omitempty"`
	Role            string    `json:"role"`
	PDPAConsented   bool      `json:"pdpaConsented"`
	CommunityShare  bool      `json:"communityShareOptIn"`
	CreatedAt       time.Time `json:"createdAt"`
}

type Crop struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Icon           string   `json:"icon"`
	Image          string   `json:"image"`
	Color          string   `json:"color"`
	ColorRgb       string   `json:"colorRgb"`
	StdMoisture    *float64 `json:"stdMoisture"`
	StdStarch      *float64 `json:"stdStarch"`
	StdCcs         *float64 `json:"stdCcs"`
	Unit           string   `json:"unit"`
	PriceUnit      string   `json:"priceUnit"`
	QualityLabel   string   `json:"qualityLabel"`
	QualityKey     string   `json:"qualityKey"`
	QualityMin     float64  `json:"qualityMin"`
	QualityMax     float64  `json:"qualityMax"`
	QualityStep    float64  `json:"qualityStep"`
	QualityDefault float64  `json:"qualityDefault"`
	Description    string   `json:"description"`
	Formula        string   `json:"formula"`
}

type Facility struct {
	ID                string          `json:"id"`
	Name              string          `json:"name"`
	Type              string          `json:"type"`
	TypeLabel         string          `json:"typeLabel"`
	Province          string          `json:"province"`
	Lat               float64         `json:"lat"`
	Lng               float64         `json:"lng"`
	CapacityTons      float64         `json:"capacityTons"`
	Rating            float64         `json:"rating"`
	ReviewCount       int             `json:"reviewCount"`
	SpecialDeductions json.RawMessage `json:"specialDeductions"`
	OperatingHours    string          `json:"operatingHours"`
	Phone             string          `json:"phone"`
	Distance          float64         `json:"distance,omitempty"`
	FacilityPrice     *float64        `json:"facilityPrice,omitempty"`
	TransportCost     float64         `json:"transportCost,omitempty"`
	FacilityRevenue   float64         `json:"facilityRevenue,omitempty"`
	NetProfit         float64         `json:"netProfit,omitempty"`
}

type TodayPrice struct {
	CropID        string  `json:"cropId"`
	BasePrice     float64 `json:"basePrice"`
	Unit          string  `json:"unit"`
	Change        float64 `json:"change"`
	ChangePercent float64 `json:"changePercent"`
	Date          string  `json:"date"`
	Source        string  `json:"source"`
}

type Transaction struct {
	ID              string   `json:"id"`
	UserID          string   `json:"userId"`
	CropID          string   `json:"cropId"`
	CropName        string   `json:"cropName"`
	CropIcon        string   `json:"cropIcon"`
	FacilityID      *string  `json:"facilityId"`
	FacilityName    string   `json:"facilityName"`
	TotalWeight     float64  `json:"totalWeight"`
	QualityMetric   float64  `json:"qualityMetric"`
	QualityLabel    string   `json:"qualityLabel"`
	PredictedPrice  float64  `json:"predictedPrice"`
	ActualReceived  *float64 `json:"actualReceived"`
	PriceDifference *float64 `json:"priceDifference"`
	PricePerUnit    *float64 `json:"pricePerUnit"`
	Date            string   `json:"date"`
	Status          string   `json:"status"`
	Notes           string   `json:"notes"`
}

type Review struct {
	ID            string `json:"id"`
	UserID        string `json:"userId"`
	UserName      string `json:"userName"`
	FacilityID    string `json:"facilityId"`
	FacilityName  string `json:"facilityName"`
	TransactionID string `json:"transactionId,omitempty"`
	Rating        int    `json:"rating"`
	ReviewText    string `json:"reviewText"`
	CreatedAt     string `json:"createdAt"`
	Verified      bool   `json:"verified"`
}

func (s *Store) UpsertUserByLINE(ctx context.Context, lineID, name, picture string) (User, error) {
	var u User
	var pdpa *time.Time
	err := s.Pool.QueryRow(ctx, `
		INSERT INTO users (line_user_id, line_display_name, picture_url, role, last_login_at)
		VALUES ($1, $2, $3, 'farmer', now())
		ON CONFLICT (line_user_id) DO UPDATE SET
			line_display_name = EXCLUDED.line_display_name,
			picture_url = EXCLUDED.picture_url,
			last_login_at = now(),
			updated_at = now()
		RETURNING id, line_user_id, COALESCE(line_display_name,''), COALESCE(picture_url,''), COALESCE(phone,''), role, pdpa_consented_at, community_share_opt_in, created_at
	`, lineID, name, picture).Scan(&u.ID, &u.LineUserID, &u.LineDisplayName, &u.PictureURL, &u.Phone, &u.Role, &pdpa, &u.CommunityShare, &u.CreatedAt)
	u.PDPAConsented = pdpa != nil
	return u, err
}

func (s *Store) ResolveUserID(ctx context.Context, id string) (string, error) {
	if _, err := uuid.Parse(id); err == nil {
		return id, nil
	}
	var uid string
	err := s.Pool.QueryRow(ctx, `SELECT id::text FROM users WHERE line_user_id=$1`, id).Scan(&uid)
	return uid, err
}

func (s *Store) GetUser(ctx context.Context, id string) (User, error) {
	var u User
	var pdpa *time.Time
	err := s.Pool.QueryRow(ctx, `
		SELECT id, line_user_id, COALESCE(line_display_name,''), COALESCE(picture_url,''), COALESCE(phone,''), role, pdpa_consented_at, community_share_opt_in, created_at
		FROM users WHERE id=$1
	`, id).Scan(&u.ID, &u.LineUserID, &u.LineDisplayName, &u.PictureURL, &u.Phone, &u.Role, &pdpa, &u.CommunityShare, &u.CreatedAt)
	u.PDPAConsented = pdpa != nil
	return u, err
}

func (s *Store) RecordConsent(ctx context.Context, userID, consentType string, granted bool) error {
	_, err := s.Pool.Exec(ctx, `INSERT INTO pdpa_consents (user_id, consent_type, granted) VALUES ($1,$2,$3)`, userID, consentType, granted)
	if err != nil {
		return err
	}
	if consentType == "pdpa" && granted {
		_, err = s.Pool.Exec(ctx, `UPDATE users SET pdpa_consented_at=now(), updated_at=now() WHERE id=$1`, userID)
	}
	if consentType == "community" {
		_, err = s.Pool.Exec(ctx, `UPDATE users SET community_share_opt_in=$2, updated_at=now() WHERE id=$1`, userID, granted)
	}
	return err
}

func (s *Store) ListCrops(ctx context.Context) ([]Crop, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT id, crop_name, COALESCE(icon,''), COALESCE(image,''), COALESCE(color,''), COALESCE(color_rgb,''),
		       std_moisture, std_starch, std_ccs, unit, price_unit, quality_label, quality_key,
		       COALESCE(quality_min,0), COALESCE(quality_max,0), COALESCE(quality_step,0), COALESCE(quality_default,0),
		       COALESCE(description,''), COALESCE(formula,'')
		FROM crops_master ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Crop
	for rows.Next() {
		var c Crop
		if err := rows.Scan(&c.ID, &c.Name, &c.Icon, &c.Image, &c.Color, &c.ColorRgb, &c.StdMoisture, &c.StdStarch, &c.StdCcs, &c.Unit, &c.PriceUnit, &c.QualityLabel, &c.QualityKey, &c.QualityMin, &c.QualityMax, &c.QualityStep, &c.QualityDefault, &c.Description, &c.Formula); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) GetCrop(ctx context.Context, id string) (Crop, error) {
	crops, err := s.ListCrops(ctx)
	if err != nil {
		return Crop{}, err
	}
	for _, c := range crops {
		if c.ID == id {
			return c, nil
		}
	}
	return Crop{}, pgx.ErrNoRows
}

func (s *Store) ActiveRule(ctx context.Context, cropID string) (*pricing.Rule, error) {
	var r pricing.Rule
	var end *time.Time
	var eff time.Time
	err := s.Pool.QueryRow(ctx, `
		SELECT id, crop_id, rule_type, deduction_rate, standard_value, effective_date, end_date
		FROM pricing_rules
		WHERE crop_id=$1 AND effective_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE)
		ORDER BY effective_date DESC LIMIT 1
	`, cropID).Scan(&r.ID, &r.CropID, &r.RuleType, &r.DeductionRate, &r.StandardValue, &eff, &end)
	if err != nil {
		return nil, err
	}
	r.EffectiveDate = eff.Format("2006-01-02")
	if end != nil {
		v := end.Format("2006-01-02")
		r.EndDate = &v
	}
	return &r, nil
}

func (s *Store) ListFacilities(ctx context.Context, cropID string) ([]Facility, error) {
	q := `
		SELECT f.id, f.name, f.type, f.type_label, f.province,
		       ST_Y(f.location::geometry), ST_X(f.location::geometry),
		       COALESCE(f.capacity_tons,0), COALESCE(f.special_deductions,'[]'::jsonb),
		       COALESCE(f.operating_hours,''), COALESCE(f.phone,''),
		       COALESCE(AVG(r.rating),0), COUNT(r.id),
		       CASE
		           WHEN $1 <> '' THEN (
		               SELECT p.base_price
		               FROM daily_market_prices p
		               WHERE p.facility_id = f.id
		                 AND p.crop_id = $1
		               ORDER BY p.price_date DESC, p.created_at DESC
		               LIMIT 1
		           )
		           ELSE NULL
		       END
		FROM facilities f
		LEFT JOIN facility_reviews r ON r.facility_id = f.id
	`

	args := []any{cropID}

	if cropID != "" {
		q += ` WHERE f.type = $2`
		args = append(args, cropType(cropID))
	}

	q += ` GROUP BY f.id ORDER BY f.name`

	rows, err := s.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanFacilitiesWithPrice(rows)
}

func scanFacilitiesWithPrice(rows pgx.Rows) ([]Facility, error) {
	var out []Facility
	for rows.Next() {
		var f Facility
		err := rows.Scan(
			&f.ID, &f.Name, &f.Type, &f.TypeLabel, &f.Province,
			&f.Lat, &f.Lng, &f.CapacityTons, &f.SpecialDeductions,
			&f.OperatingHours, &f.Phone, &f.Rating, &f.ReviewCount,
			&f.FacilityPrice,
		)
		if err != nil {
			return nil, err
		}

		if f.SpecialDeductions == nil {
			f.SpecialDeductions = json.RawMessage("[]")
		}

		f.Rating = round2(f.Rating)
		out = append(out, f)
	}

	return out, rows.Err()
}

func (s *Store) GetFacility(ctx context.Context, id string) (Facility, error) {
	row := s.Pool.QueryRow(ctx, `
		SELECT f.id, f.name, f.type, f.type_label, f.province,
		       ST_Y(f.location::geometry), ST_X(f.location::geometry),
		       COALESCE(f.capacity_tons,0), COALESCE(f.special_deductions,'[]'::jsonb),
		       COALESCE(f.operating_hours,''), COALESCE(f.phone,''),
		       COALESCE(AVG(r.rating),0), COUNT(r.id)
		FROM facilities f
		LEFT JOIN facility_reviews r ON r.facility_id = f.id
		WHERE f.id=$1
		GROUP BY f.id
	`, id)
	return scanFacility(row)
}

func cropType(cropID string) string {
	switch cropID {
	case "rice":
		return "rice_mill"
	case "cassava":
		return "cassava_yard"
	case "sugarcane":
		return "sugar_factory"
	default:
		return cropID
	}
}

func (s *Store) Nearby(ctx context.Context, lng, lat, radiusM float64, cropID string, limit int) ([]Facility, error) {
	if limit <= 0 {
		limit = 20
	}
	q := `
		SELECT f.id, f.name, f.type, f.type_label, f.province,
		       ST_Y(f.location::geometry), ST_X(f.location::geometry),
		       COALESCE(f.capacity_tons,0), COALESCE(f.special_deductions,'[]'::jsonb),
		       COALESCE(f.operating_hours,''), COALESCE(f.phone,''),
		       COALESCE((SELECT AVG(rating) FROM facility_reviews WHERE facility_id=f.id),0),
		       COALESCE((SELECT COUNT(*) FROM facility_reviews WHERE facility_id=f.id),0),
		       ST_Distance(f.location, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography)/1000.0 AS distance_km
		FROM facilities f
		WHERE ST_DWithin(
			f.location,
			ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,
			$3,
			false
		)
	`
	args := []any{lng, lat, radiusM}
	if cropID != "" {
		q += ` AND f.type = $4`
		args = append(args, cropType(cropID))
		q += ` ORDER BY f.location <-> ST_SetSRID(ST_MakePoint($1,$2),4326)::geography LIMIT $5`
		args = append(args, limit)
	} else {
		q += ` ORDER BY f.location <-> ST_SetSRID(ST_MakePoint($1,$2),4326)::geography LIMIT $4`
		args = append(args, limit)
	}
	rows, err := s.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Facility
	for rows.Next() {
		var f Facility
		if err := rows.Scan(&f.ID, &f.Name, &f.Type, &f.TypeLabel, &f.Province, &f.Lat, &f.Lng, &f.CapacityTons, &f.SpecialDeductions, &f.OperatingHours, &f.Phone, &f.Rating, &f.ReviewCount, &f.Distance); err != nil {
			return nil, err
		}
		f.Distance = float64(int(f.Distance*10+0.5)) / 10
		out = append(out, f)
	}
	return out, rows.Err()
}

func (s *Store) TodayPrices(ctx context.Context) (map[string]TodayPrice, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT DISTINCT ON (crop_id)
			crop_id, base_price, COALESCE(unit,''), price_date, source
		FROM daily_market_prices
		WHERE facility_id IS NULL
		ORDER BY crop_id, price_date DESC, created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]TodayPrice{}
	for rows.Next() {
		var p TodayPrice
		var d time.Time
		if err := rows.Scan(&p.CropID, &p.BasePrice, &p.Unit, &d, &p.Source); err != nil {
			return nil, err
		}
		p.Date = d.Format("2006-01-02")
		if prev, err := s.prevPrice(ctx, p.CropID, d); err == nil && prev > 0 {
			p.Change = round2(p.BasePrice - prev)
			p.ChangePercent = round2((p.BasePrice - prev) / prev * 100)
		}
		out[p.CropID] = p
	}
	return out, rows.Err()
}

func (s *Store) prevPrice(ctx context.Context, cropID string, before time.Time) (float64, error) {
	var v float64
	err := s.Pool.QueryRow(ctx, `
		SELECT price FROM price_snapshots
		WHERE crop_id=$1 AND snapshot_date < $2
		ORDER BY snapshot_date DESC LIMIT 1
	`, cropID, before).Scan(&v)
	return v, err
}

func (s *Store) FacilityPrice(ctx context.Context, facilityID, cropID string) (*float64, error) {
	var v float64
	err := s.Pool.QueryRow(ctx, `
		SELECT base_price FROM daily_market_prices
		WHERE facility_id=$1 AND crop_id=$2
		ORDER BY price_date DESC LIMIT 1
	`, facilityID, cropID).Scan(&v)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (s *Store) History(ctx context.Context, cropID string) ([]map[string]any, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT snapshot_date, price FROM price_snapshots
		WHERE crop_id=$1 AND source='official'
		ORDER BY snapshot_date
	`, cropID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var d time.Time
		var p float64
		if err := rows.Scan(&d, &p); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{"date": d.Format("2006-01-02"), "price": p})
	}
	return out, rows.Err()
}

func (s *Store) Sparklines(ctx context.Context) (map[string][]float64, error) {
	out := map[string][]float64{}
	for _, crop := range []string{"rice", "cassava", "sugarcane"} {
		rows, err := s.Pool.Query(ctx, `
			SELECT price FROM price_snapshots
			WHERE crop_id=$1 AND source='official'
			ORDER BY snapshot_date DESC LIMIT 7
		`, crop)
		if err != nil {
			return nil, err
		}
		var vals []float64
		for rows.Next() {
			var p float64
			if err := rows.Scan(&p); err != nil {
				rows.Close()
				return nil, err
			}
			vals = append(vals, p)
		}
		rows.Close()
		for i, j := 0, len(vals)-1; i < j; i, j = i+1, j-1 {
			vals[i], vals[j] = vals[j], vals[i]
		}
		out[crop] = vals
	}
	return out, nil
}

func (s *Store) Predictions(ctx context.Context, cropID string) ([]map[string]any, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT predicted_date, forecasted_price, confidence_upper, confidence_lower, confidence
		FROM ai_price_predictions WHERE crop_id=$1 ORDER BY predicted_date
	`, cropID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var d time.Time
		var price, up, lo, conf float64
		if err := rows.Scan(&d, &price, &up, &lo, &conf); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"date":            d.Format("2006-01-02"),
			"predictedPrice":  price,
			"confidenceUpper": up,
			"confidenceLower": lo,
			"confidence":      conf,
		})
	}
	return out, rows.Err()
}

func (s *Store) Warnings(ctx context.Context) ([]map[string]any, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT w.id, w.crop_id, c.crop_name, c.icon, w.warning_level, w.warning_label, w.title, w.description, w.recommendation, w.predicted_date, w.created_at
		FROM ai_warnings w JOIN crops_master c ON c.id=w.crop_id
		ORDER BY w.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var id, cropID, name, icon, level, label, title, desc, rec string
		var pred, created time.Time
		if err := rows.Scan(&id, &cropID, &name, &icon, &level, &label, &title, &desc, &rec, &pred, &created); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id":             id,
			"cropId":         cropID,
			"cropName":       name,
			"cropIcon":       icon,
			"warningLevel":   level,
			"warningLabel":   label,
			"title":          title,
			"description":    desc,
			"predictedDate":  pred.Format("2006-01-02"),
			"createdAt":      created.Format("2006-01-02"),
			"recommendation": rec,
		})
	}
	return out, rows.Err()
}

func (s *Store) SaveTransaction(ctx context.Context, t Transaction) (Transaction, error) {
	if t.ID == "" {
		t.ID = "tx-" + uuid.NewString()
	}
	if t.Date == "" {
		t.Date = time.Now().Format("2006-01-02")
	}
	if t.Status == "" {
		t.Status = "pending"
	}

	if t.TotalWeight <= 0 {
		return t, fmt.Errorf("total weight must be greater than 0")
	}

	if t.QualityMetric < 0 {
		return t, fmt.Errorf("quality metric cannot be negative")
	}

	_, err := s.Pool.Exec(ctx, `
		INSERT INTO transactions_history
			(id, user_id, crop_id, facility_id, total_weight, quality_metric,
			 predicted_price, actual_received, price_difference, price_per_unit,
			 tx_date, status, notes)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
	`, t.ID, t.UserID, t.CropID, t.FacilityID, t.TotalWeight, t.QualityMetric,
		t.PredictedPrice, t.ActualReceived, t.PriceDifference, t.PricePerUnit,
		t.Date, t.Status, t.Notes)

	return t, err
}

func (s *Store) ListTransactions(ctx context.Context, userID string) ([]Transaction, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT t.id, t.user_id, t.crop_id, c.crop_name, c.icon, t.facility_id, COALESCE(f.name,'ยังไม่เลือกลานรับซื้อ'),
		       t.total_weight, t.quality_metric, c.quality_label, t.predicted_price, t.actual_received, t.price_difference, t.price_per_unit,
		       t.tx_date, t.status, COALESCE(t.notes,'')
		FROM transactions_history t
		JOIN crops_master c ON c.id=t.crop_id
		LEFT JOIN facilities f ON f.id=t.facility_id
		WHERE t.user_id=$1
		ORDER BY t.tx_date DESC, t.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Transaction
	for rows.Next() {
		var t Transaction
		var d time.Time
		if err := rows.Scan(&t.ID, &t.UserID, &t.CropID, &t.CropName, &t.CropIcon, &t.FacilityID, &t.FacilityName, &t.TotalWeight, &t.QualityMetric, &t.QualityLabel, &t.PredictedPrice, &t.ActualReceived, &t.PriceDifference, &t.PricePerUnit, &d, &t.Status, &t.Notes); err != nil {
			return nil, err
		}
		t.Date = d.Format("2006-01-02")
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *Store) HasUserSoldAt(ctx context.Context, userID, facilityID, transactionID string) (bool, error) {
	var ok bool
	err := s.Pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM transactions_history
			WHERE id = $1
			  AND user_id = $2
			  AND facility_id = $3
			  AND status = 'completed'
		)
	`, transactionID, userID, facilityID).Scan(&ok)
	return ok, err
}

func (s *Store) SaveReview(ctx context.Context, r Review) (Review, error) {
	if r.ID == "" {
		r.ID = "rev-" + uuid.NewString()
	}
	var txID *string
	if r.TransactionID != "" {
		txID = &r.TransactionID
	}
	_, err := s.Pool.Exec(ctx, `
		INSERT INTO facility_reviews (id, user_id, facility_id, transaction_id, rating, review_text)
		VALUES ($1,$2,$3,$4,$5,$6)
	`, r.ID, r.UserID, r.FacilityID, txID, r.Rating, r.ReviewText)
	if r.CreatedAt == "" {
		r.CreatedAt = time.Now().Format("2006-01-02")
	}

	return r, err
}

func (s *Store) ListReviews(ctx context.Context, facilityID string, anonymize bool) ([]Review, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT r.id, r.user_id, COALESCE(u.line_display_name,'เกษตรกร'), r.facility_id, f.name, COALESCE(r.transaction_id,''), r.rating, COALESCE(r.review_text,''), r.created_at
		FROM facility_reviews r
		JOIN users u ON u.id=r.user_id
		JOIN facilities f ON f.id=r.facility_id
		WHERE r.facility_id=$1
		ORDER BY r.created_at DESC
	`, facilityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Review
	for rows.Next() {
		var r Review
		var created time.Time
		if err := rows.Scan(&r.ID, &r.UserID, &r.UserName, &r.FacilityID, &r.FacilityName, &r.TransactionID, &r.Rating, &r.ReviewText, &created); err != nil {
			return nil, err
		}
		r.CreatedAt = created.Format("2006-01-02")
		r.Verified = r.TransactionID != ""
		if anonymize {
			r.UserName = "เกษตรกรในพื้นที่"
			r.UserID = ""
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) UpsertOfficialPrice(ctx context.Context, cropID string, price float64, unit, source string, day time.Time) error {
	_, err := s.Pool.Exec(ctx, `
		INSERT INTO daily_market_prices (facility_id, crop_id, base_price, price_date, source, unit)
		VALUES (NULL, $1, $2, $3, $4, $5)
		ON CONFLICT (crop_id, price_date, source) WHERE facility_id IS NULL
		DO UPDATE SET base_price=EXCLUDED.base_price, unit=EXCLUDED.unit
	`, cropID, price, day, source, unit)
	if err != nil {
		return err
	}
	_, err = s.Pool.Exec(ctx, `
		INSERT INTO price_snapshots (crop_id, snapshot_date, price, source)
		VALUES ($1,$2,$3,'official')
		ON CONFLICT (crop_id, snapshot_date, source) DO UPDATE SET price=EXCLUDED.price
	`, cropID, day, price)
	return err
}

func (s *Store) UpsertFacilityPrice(ctx context.Context, facilityID, cropID string, price float64, source string, day time.Time) error {
	_, err := s.Pool.Exec(ctx, `
		INSERT INTO daily_market_prices (facility_id, crop_id, base_price, price_date, source, unit)
		VALUES ($1,$2,$3,$4,$5,'บาท/กก.')
		ON CONFLICT (facility_id, crop_id, price_date, source) DO UPDATE SET base_price=EXCLUDED.base_price
	`, facilityID, cropID, price, day, source)
	return err
}

func (s *Store) ReplacePredictions(ctx context.Context, cropID string, rows []map[string]any) error {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `DELETE FROM ai_price_predictions WHERE crop_id=$1`, cropID); err != nil {
		return err
	}
	for _, r := range rows {
		if _, err := tx.Exec(ctx, `
			INSERT INTO ai_price_predictions (crop_id, predicted_date, forecasted_price, confidence_upper, confidence_lower, confidence, warning_level)
			VALUES ($1,$2,$3,$4,$5,$6,$7)
		`, cropID, r["date"], r["predictedPrice"], r["confidenceUpper"], r["confidenceLower"], r["confidence"], r["warningLevel"]); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *Store) UpsertWarning(ctx context.Context, id, cropID, level, label, title, desc, rec string, predicted time.Time) error {
	_, err := s.Pool.Exec(ctx, `
		INSERT INTO ai_warnings (id, crop_id, warning_level, warning_label, title, description, recommendation, predicted_date, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE)
		ON CONFLICT (id) DO UPDATE SET warning_level=EXCLUDED.warning_level, warning_label=EXCLUDED.warning_label, title=EXCLUDED.title, description=EXCLUDED.description, recommendation=EXCLUDED.recommendation, predicted_date=EXCLUDED.predicted_date
	`, id, cropID, level, label, title, desc, rec, predicted)
	return err
}

func (s *Store) SnapshotHistory(ctx context.Context, cropID string) ([]struct{ X, Y float64 }, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT snapshot_date, price FROM price_snapshots
		WHERE crop_id=$1 AND source='official'
		ORDER BY snapshot_date
	`, cropID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []struct{ X, Y float64 }
	i := 0.0
	for rows.Next() {
		var d time.Time
		var p float64
		if err := rows.Scan(&d, &p); err != nil {
			return nil, err
		}
		out = append(out, struct{ X, Y float64 }{X: i, Y: p})
		i++
	}
	return out, rows.Err()
}

func (s *Store) LINEIDsForCrop(ctx context.Context, cropID string) ([]string, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT DISTINCT u.line_user_id
		FROM users u
		JOIN transactions_history t ON t.user_id=u.id
		WHERE t.crop_id=$1 AND u.pdpa_consented_at IS NOT NULL
	`, cropID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

func (s *Store) Audit(ctx context.Context, actor, action, resource, ip string, meta any) {
	b, _ := json.Marshal(meta)
	_, _ = s.Pool.Exec(ctx, `INSERT INTO audit_logs (actor_user_id, action, resource, ip_address, metadata) VALUES ($1,$2,$3,$4,$5)`,
		nullableUUID(actor), action, resource, ip, b)
}

func (s *Store) SaveCalculation(ctx context.Context, userID, cropID string, weight, quality, base float64, result any) error {
	b, _ := json.Marshal(result)
	var uid any
	if userID != "" {
		uid = userID
	}
	_, err := s.Pool.Exec(ctx, `INSERT INTO calculations (user_id, crop_id, total_weight, quality_metric, base_price, result) VALUES ($1,$2,$3,$4,$5,$6)`,
		uid, cropID, weight, quality, base, b)
	return err
}

func nullableUUID(id string) any {
	if id == "" {
		return nil
	}
	if _, err := uuid.Parse(id); err != nil {
		return nil
	}
	return id
}

func round2(v float64) float64 { return float64(int(v*100+0.5)) / 100 }

func scanFacilities(rows pgx.Rows) ([]Facility, error) {
	var out []Facility
	for rows.Next() {
		f, err := scanFacility(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

type scanner interface {
	Scan(dest ...any) error
}

func scanFacility(row scanner) (Facility, error) {
	var f Facility
	err := row.Scan(&f.ID, &f.Name, &f.Type, &f.TypeLabel, &f.Province, &f.Lat, &f.Lng, &f.CapacityTons, &f.SpecialDeductions, &f.OperatingHours, &f.Phone, &f.Rating, &f.ReviewCount)
	if f.SpecialDeductions == nil {
		f.SpecialDeductions = json.RawMessage("[]")
	}
	f.Rating = round2(f.Rating)
	return f, err
}

func (s *Store) ClusterHint(ctx context.Context) error {
	_, err := s.Pool.Exec(ctx, `CLUSTER facilities USING facilities_location_gist_idx`)
	if err != nil {
		return fmt.Errorf("cluster: %w", err)
	}
	return nil
}
