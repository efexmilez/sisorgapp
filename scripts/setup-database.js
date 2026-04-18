#!/usr/bin/env node
/**
 * SIS Club Org - Database Setup Script
 * Run this to set up the database functions and tables
 */

require('dotenv').config({ path: './.env' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const rpcFunctions = `
// ============================================================
// RPC Functions for SIS Club Org
// ============================================================

-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Increment contribution balance atomically
CREATE OR REPLACE FUNCTION increment_contribution(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE contribution_balances
  SET 
    total_contributed = total_contributed + p_amount,
    last_updated = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Increment disbursed amount atomically
CREATE OR REPLACE FUNCTION increment_disbursed(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE contribution_balances
  SET 
    total_disbursed = total_disbursed + p_amount,
    last_updated = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Generic increment function
CREATE OR REPLACE FUNCTION increment(x INTEGER) RETURNS INTEGER AS $$
BEGIN RETURN x + 1; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create contribution balance on user creation
CREATE OR REPLACE FUNCTION create_contribution_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO contribution_balances (user_id, total_contributed, total_disbursed)
  VALUES (NEW.id, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_balance_on_user ON users;
CREATE TRIGGER trg_create_balance_on_user
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_contribution_balance();

-- Service role policies for contribution_balances
DROP POLICY IF EXISTS "Service role can access contribution_balances" ON contribution_balances;
CREATE POLICY "Service role can access contribution_balances"
  ON contribution_balances FOR ALL TO service_role USING (true);

-- Service role policies for audit_log
DROP POLICY IF EXISTS "Service role can access audit_log" ON audit_log;
CREATE POLICY "Service role can access audit_log"
  ON audit_log FOR ALL TO service_role USING (true);
`;

async function setup() {
  console.log('🔧 Setting up SIS Club Org database...\n');
  
  try {
    // Test connection
    const { data: testData, error: testError } = await supabase.from('users').select('id').limit(1);
    if (testError) throw testError;
    console.log('✅ Connected to Supabase\n');

    // Execute the RPC functions setup
    const { error: rpcError } = await supabase.rpc('increment_contribution', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_amount: 0
    }).catch(() => ({ error: null })); // Ignore if function doesn't exist yet

    console.log('⚠️  Please run the following SQL in your Supabase SQL Editor:');
    console.log('='.repeat(60));
    console.log(rpcFunctions);
    console.log('='.repeat(60));
    console.log('\n📋 Instructions:');
    console.log('1. Go to https://bpclwhtoofbrjbjmsyyq.supabase.com');
    console.log('2. Click "SQL Editor" in the left sidebar');
    console.log('3. Paste the SQL above and click "Run"');
    console.log('4. This will create the necessary functions and triggers\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup();
