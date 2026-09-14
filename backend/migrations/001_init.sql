CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_user_id VARCHAR(128) UNIQUE NOT NULL,
    line_display_name VARCHAR(255),
    picture_url TEXT,
    phone VARCHAR(32),
    role VARCHAR(32) NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'facility_owner', 'admin')),
    pdpa_consented_at TIMESTAMPTZ,
    community_share_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crops_master (
    id VARCHAR(32) PRIMARY KEY,
    crop_name VARCHAR(128) NOT NULL,
    icon VARCHAR(16),
    image TEXT,
    color VARCHAR(16),
    color_rgb VARCHAR(32),
    std_moisture NUMERIC,
    std_starch NUMERIC,
    std_ccs NUMERIC,
    unit VARCHAR(32) NOT NULL,
    price_unit VARCHAR(32) NOT NULL,
    quality_label VARCHAR(64) NOT NULL,
    quality_key VARCHAR(32) NOT NULL,
    quality_min NUMERIC,
    quality_max NUMERIC,
    quality_step NUMERIC,
    quality_default NUMERIC,
    description TEXT,
    formula TEXT
);

CREATE TABLE IF NOT EXISTS pricing_rules (
    id VARCHAR(64) PRIMARY KEY,
    crop_id VARCHAR(32) NOT NULL REFERENCES crops_master(id),
    rule_type VARCHAR(64) NOT NULL,
    deduction_rate NUMERIC NOT NULL,
    standard_value NUMERIC NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE
);

CREATE INDEX IF NOT EXISTS pricing_rules_crop_dates_idx ON pricing_rules (crop_id, effective_date, end_date);

CREATE TABLE IF NOT EXISTS facilities (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    type_label VARCHAR(64) NOT NULL,
    province VARCHAR(128) NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    capacity_tons NUMERIC,
    special_deductions JSONB NOT NULL DEFAULT '[]'::jsonb,
    operating_hours VARCHAR(128),
    phone VARCHAR(64),
    owner_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS facilities_location_gist_idx ON facilities USING GIST (location);
CREATE INDEX IF NOT EXISTS facilities_type_idx ON facilities (type);

CREATE TABLE IF NOT EXISTS daily_market_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id VARCHAR(64) REFERENCES facilities(id),
    crop_id VARCHAR(32) NOT NULL REFERENCES crops_master(id),
    base_price NUMERIC NOT NULL,
    reference_quality NUMERIC,
    price_date DATE NOT NULL,
    source VARCHAR(128) NOT NULL DEFAULT 'DIT',
    unit VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (facility_id, crop_id, price_date, source)
);

CREATE INDEX IF NOT EXISTS daily_market_prices_lookup_idx ON daily_market_prices (crop_id, price_date DESC, facility_id);
CREATE UNIQUE INDEX IF NOT EXISTS daily_national_price_uniq ON daily_market_prices (crop_id, price_date, source) WHERE facility_id IS NULL;

CREATE TABLE IF NOT EXISTS price_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_id VARCHAR(32) NOT NULL REFERENCES crops_master(id),
    snapshot_date DATE NOT NULL,
    price NUMERIC NOT NULL,
    source VARCHAR(128) NOT NULL,
    UNIQUE (crop_id, snapshot_date, source)
);

CREATE INDEX IF NOT EXISTS price_snapshots_crop_date_idx ON price_snapshots (crop_id, snapshot_date);

CREATE TABLE IF NOT EXISTS ai_price_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_id VARCHAR(32) NOT NULL REFERENCES crops_master(id),
    predicted_date DATE NOT NULL,
    forecasted_price NUMERIC NOT NULL,
    confidence_upper NUMERIC,
    confidence_lower NUMERIC,
    confidence NUMERIC,
    warning_level VARCHAR(32),
    UNIQUE (crop_id, predicted_date)
);

CREATE TABLE IF NOT EXISTS ai_warnings (
    id VARCHAR(64) PRIMARY KEY,
    crop_id VARCHAR(32) NOT NULL REFERENCES crops_master(id),
    warning_level VARCHAR(32) NOT NULL,
    warning_label VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    predicted_date DATE,
    created_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS transactions_history (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    crop_id VARCHAR(32) NOT NULL REFERENCES crops_master(id),
    facility_id VARCHAR(64) REFERENCES facilities(id),
    total_weight NUMERIC NOT NULL,
    quality_metric NUMERIC NOT NULL,
    predicted_price NUMERIC,
    actual_received NUMERIC,
    price_difference NUMERIC,
    price_per_unit NUMERIC,
    tx_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    notes TEXT,
    receipt_object_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions_history (user_id, tx_date DESC);

CREATE TABLE IF NOT EXISTS facility_reviews (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    facility_id VARCHAR(64) NOT NULL REFERENCES facilities(id),
    transaction_id VARCHAR(64) REFERENCES transactions_history(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS facility_reviews_facility_idx ON facility_reviews (facility_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pdpa_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    consent_type VARCHAR(64) NOT NULL,
    granted BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID,
    action VARCHAR(128) NOT NULL,
    resource VARCHAR(128),
    ip_address VARCHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    crop_id VARCHAR(32) NOT NULL REFERENCES crops_master(id),
    total_weight NUMERIC NOT NULL,
    quality_metric NUMERIC NOT NULL,
    base_price NUMERIC NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oauth_states (
    state VARCHAR(128) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);
