-- Migration: 001_initial_schema.sql
-- Description: Create initial schema for OpenRouter Cost Dashboard

-- Activity logs table - stores all API request data
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    generation_id VARCHAR(255),
    session_id VARCHAR(255),
    task_id VARCHAR(255),
    user_id VARCHAR(255),
    request_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    model VARCHAR(255) NOT NULL,
    provider_name VARCHAR(255) DEFAULT 'unknown',
    api_type VARCHAR(50) DEFAULT 'openai',
    api_key_name VARCHAR(255),
    api_key_hash VARCHAR(255),
    cost DECIMAL(18, 10) DEFAULT 0,
    prompt_tokens BIGINT DEFAULT 0,
    completion_tokens BIGINT DEFAULT 0,
    reasoning_tokens BIGINT DEFAULT 0,
    cached_tokens BIGINT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    endpoint VARCHAR(255) DEFAULT '/chat/completions',
    environment VARCHAR(50) DEFAULT 'production',
    feature_name VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(request_id, timestamp)
);

-- Indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_model ON activity_logs(model);
CREATE INDEX IF NOT EXISTS idx_activity_provider ON activity_logs(provider_name);
CREATE INDEX IF NOT EXISTS idx_activity_api_key ON activity_logs(api_key_name);
CREATE INDEX IF NOT EXISTS idx_activity_session ON activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_task ON activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_cost ON activity_logs(cost);
CREATE INDEX IF NOT EXISTS idx_activity_hour ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_environment ON activity_logs(environment);
CREATE INDEX IF NOT EXISTS idx_activity_feature ON activity_logs(feature_name);

-- Credit snapshots table - stores periodic credit usage
CREATE TABLE IF NOT EXISTS credit_snapshots (
    id SERIAL PRIMARY KEY,
    total_credits DECIMAL(18, 6) NOT NULL,
    used_credits DECIMAL(18, 6) NOT NULL,
    remaining_credits DECIMAL(18, 6) NOT NULL,
    snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credits_date ON credit_snapshots(snapshot_date);

-- API Keys table - tracks usage per API key
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) UNIQUE,
    total_cost DECIMAL(18, 10) DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- Sync logs table - tracks data synchronization
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,
    range_start TIMESTAMP WITH TIME ZONE,
    range_end TIMESTAMP WITH TIME ZONE,
    records_synced INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_created ON sync_logs(created_at);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for activity_logs updated_at
DROP TRIGGER IF EXISTS update_activity_logs_updated_at ON activity_logs;
CREATE TRIGGER update_activity_logs_updated_at
    BEFORE UPDATE ON activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for api_keys updated_at
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE activity_logs IS 'Stores all OpenRouter API request data with costs and tokens';
COMMENT ON TABLE credit_snapshots IS 'Periodic snapshots of credit usage from OpenRouter';
COMMENT ON TABLE api_keys IS 'API key usage tracking from OpenRouter /keys endpoint';
COMMENT ON TABLE sync_logs IS 'Data synchronization logs';
