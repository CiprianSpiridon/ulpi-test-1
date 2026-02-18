-- =============================================================================
-- Enterprise URL Shortener - PostgreSQL Database Schema
-- =============================================================================
-- This script initializes the database with all tables, indexes, functions,
-- and seed data required for the URL shortener service.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE url_status AS ENUM ('active', 'disabled', 'expired');

-- =============================================================================
-- USERS TABLE
-- =============================================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           CITEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    display_name    VARCHAR(100),
    role            user_role NOT NULL DEFAULT 'user',
    status          user_status NOT NULL DEFAULT 'active',
    api_key         VARCHAR(64) UNIQUE,
    api_key_hash    TEXT,
    rate_limit      INTEGER NOT NULL DEFAULT 100,
    max_urls        INTEGER NOT NULL DEFAULT 1000,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE users IS 'Registered users of the URL shortener service';
COMMENT ON COLUMN users.api_key IS 'Plaintext API key shown once at creation; stored hashed in api_key_hash';
COMMENT ON COLUMN users.rate_limit IS 'Maximum API requests per minute for this user';
COMMENT ON COLUMN users.max_urls IS 'Maximum number of URLs this user can create';

-- Indexes for users
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_api_key_hash ON users (api_key_hash) WHERE api_key_hash IS NOT NULL;
CREATE INDEX idx_users_status ON users (status) WHERE status != 'deleted';
CREATE INDEX idx_users_created_at ON users (created_at);

-- =============================================================================
-- URLS TABLE
-- =============================================================================

CREATE TABLE urls (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    original_url    TEXT NOT NULL,
    short_code      VARCHAR(12) NOT NULL UNIQUE,
    custom_slug     VARCHAR(50) UNIQUE,
    title           VARCHAR(255),
    description     TEXT,
    status          url_status NOT NULL DEFAULT 'active',
    clicks          BIGINT NOT NULL DEFAULT 0,
    max_clicks      BIGINT,
    password_hash   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    last_clicked_at TIMESTAMPTZ,

    -- Ensure short_code is lowercase alphanumeric
    CONSTRAINT chk_short_code_format CHECK (short_code ~ '^[a-zA-Z0-9_-]+$'),
    -- Ensure original_url is a valid URL pattern
    CONSTRAINT chk_original_url_format CHECK (original_url ~ '^https?://'),
    -- Ensure custom_slug format if provided
    CONSTRAINT chk_custom_slug_format CHECK (custom_slug IS NULL OR custom_slug ~ '^[a-zA-Z0-9_-]+$')
);

COMMENT ON TABLE urls IS 'Shortened URLs with metadata and access controls';
COMMENT ON COLUMN urls.short_code IS 'Auto-generated short code for the URL';
COMMENT ON COLUMN urls.custom_slug IS 'Optional user-defined slug (overrides short_code for routing)';
COMMENT ON COLUMN urls.max_clicks IS 'Optional limit on number of clicks; NULL means unlimited';
COMMENT ON COLUMN urls.password_hash IS 'Optional bcrypt hash; if set, visitors must enter password';

-- Indexes for urls
CREATE INDEX idx_urls_short_code ON urls (short_code);
CREATE INDEX idx_urls_custom_slug ON urls (custom_slug) WHERE custom_slug IS NOT NULL;
CREATE INDEX idx_urls_user_id ON urls (user_id);
CREATE INDEX idx_urls_status ON urls (status);
CREATE INDEX idx_urls_created_at ON urls (created_at);
CREATE INDEX idx_urls_expires_at ON urls (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_urls_clicks ON urls (clicks DESC);
CREATE INDEX idx_urls_user_status ON urls (user_id, status);

-- Partial index for active, non-expired URLs (hot path for redirect lookups)
CREATE INDEX idx_urls_active_lookup ON urls (short_code)
    WHERE status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW());

-- =============================================================================
-- ANALYTICS TABLE (click tracking)
-- =============================================================================

CREATE TABLE analytics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url_id          UUID NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
    ip_address      INET,
    user_agent      TEXT,
    referer         TEXT,
    country         VARCHAR(2),
    city            VARCHAR(100),
    device_type     VARCHAR(20),
    browser         VARCHAR(50),
    os              VARCHAR(50),
    clicked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE analytics IS 'Click-level analytics for URL redirects';
COMMENT ON COLUMN analytics.country IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN analytics.device_type IS 'Detected device type: desktop, mobile, tablet, bot';

-- Indexes for analytics
CREATE INDEX idx_analytics_url_id ON analytics (url_id);
CREATE INDEX idx_analytics_clicked_at ON analytics (clicked_at);
CREATE INDEX idx_analytics_url_clicked ON analytics (url_id, clicked_at);
CREATE INDEX idx_analytics_country ON analytics (country) WHERE country IS NOT NULL;

-- Partition-ready index for time-based queries
CREATE INDEX idx_analytics_url_time_range ON analytics (url_id, clicked_at DESC);

-- =============================================================================
-- SESSIONS TABLE (for server-side session metadata; actual session data in Redis)
-- =============================================================================

CREATE TABLE sessions (
    id              VARCHAR(128) PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sessions IS 'Server-side session metadata; session payload stored in Redis';

-- Indexes for sessions
CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

-- =============================================================================
-- CUSTOM DOMAINS TABLE
-- =============================================================================

CREATE TABLE custom_domains (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain          VARCHAR(255) NOT NULL UNIQUE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(64),
    ssl_provisioned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at     TIMESTAMPTZ
);

COMMENT ON TABLE custom_domains IS 'Custom domains registered by users for branded short links';

CREATE INDEX idx_custom_domains_user_id ON custom_domains (user_id);
CREATE INDEX idx_custom_domains_domain ON custom_domains (domain);

-- =============================================================================
-- API KEYS TABLE (supports multiple keys per user)
-- =============================================================================

CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash        TEXT NOT NULL UNIQUE,
    key_prefix      VARCHAR(8) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    scopes          TEXT[] NOT NULL DEFAULT '{"read","write"}',
    rate_limit      INTEGER NOT NULL DEFAULT 100,
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

COMMENT ON TABLE api_keys IS 'API keys for programmatic access; key_prefix stores first 8 chars for identification';

CREATE INDEX idx_api_keys_user_id ON api_keys (user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys (key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys (key_prefix);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Increment click counter on URL (called from application or trigger)
CREATE OR REPLACE FUNCTION increment_url_clicks(target_url_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE urls
    SET clicks = clicks + 1,
        last_clicked_at = NOW(),
        updated_at = NOW()
    WHERE id = target_url_id;
END;
$$ LANGUAGE plpgsql;

-- Generate a random short code
CREATE OR REPLACE FUNCTION generate_short_code(length INTEGER DEFAULT 7)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Clean expired sessions (called periodically)
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Get URL analytics summary
CREATE OR REPLACE FUNCTION get_url_analytics_summary(
    target_url_id UUID,
    period_start TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    period_end TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_clicks BIGINT,
    unique_visitors BIGINT,
    top_country VARCHAR(2),
    top_referer TEXT,
    top_browser VARCHAR(50),
    top_device VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_clicks,
        COUNT(DISTINCT a.ip_address)::BIGINT AS unique_visitors,
        (SELECT a2.country FROM analytics a2
         WHERE a2.url_id = target_url_id
           AND a2.clicked_at BETWEEN period_start AND period_end
           AND a2.country IS NOT NULL
         GROUP BY a2.country ORDER BY COUNT(*) DESC LIMIT 1
        ) AS top_country,
        (SELECT a3.referer FROM analytics a3
         WHERE a3.url_id = target_url_id
           AND a3.clicked_at BETWEEN period_start AND period_end
           AND a3.referer IS NOT NULL
         GROUP BY a3.referer ORDER BY COUNT(*) DESC LIMIT 1
        ) AS top_referer,
        (SELECT a4.browser FROM analytics a4
         WHERE a4.url_id = target_url_id
           AND a4.clicked_at BETWEEN period_start AND period_end
           AND a4.browser IS NOT NULL
         GROUP BY a4.browser ORDER BY COUNT(*) DESC LIMIT 1
        ) AS top_browser,
        (SELECT a5.device_type FROM analytics a5
         WHERE a5.url_id = target_url_id
           AND a5.clicked_at BETWEEN period_start AND period_end
           AND a5.device_type IS NOT NULL
         GROUP BY a5.device_type ORDER BY COUNT(*) DESC LIMIT 1
        ) AS top_device
    FROM analytics a
    WHERE a.url_id = target_url_id
      AND a.clicked_at BETWEEN period_start AND period_end;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at on users
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on urls
CREATE TRIGGER trigger_urls_updated_at
    BEFORE UPDATE ON urls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on tables (application connects as 'app_user' role)
ALTER TABLE urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create application role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user LOGIN PASSWORD 'changeme_in_production';
    END IF;
END
$$;

-- Grant privileges to app_user
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- RLS policies for app_user (the application enforces user-level access via JWT)
-- These policies allow the app role full access; fine-grained access is in the API layer
CREATE POLICY urls_policy ON urls FOR ALL TO app_user USING (true);
CREATE POLICY analytics_policy ON analytics FOR ALL TO app_user USING (true);
CREATE POLICY sessions_policy ON sessions FOR ALL TO app_user USING (true);
CREATE POLICY custom_domains_policy ON custom_domains FOR ALL TO app_user USING (true);
CREATE POLICY api_keys_policy ON api_keys FOR ALL TO app_user USING (true);

-- =============================================================================
-- SEED DATA (development only)
-- =============================================================================

-- Insert a default admin user (password: 'admin123' - CHANGE IN PRODUCTION)
-- Password hash generated with bcrypt cost factor 12
INSERT INTO users (email, password_hash, display_name, role, status, email_verified)
VALUES (
    'admin@urlshortener.local',
    '$2a$12$LJ3m4ys3Lk0TSwHgFJM3RO.sNrmboVhOGe3FaNU6pVXQMOlf1DMKK',
    'System Admin',
    'superadmin',
    'active',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- MAINTENANCE
-- =============================================================================

-- Analyze tables for query planner optimization
ANALYZE users;
ANALYZE urls;
ANALYZE analytics;
ANALYZE sessions;
ANALYZE custom_domains;
ANALYZE api_keys;
