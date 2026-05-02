import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function disableRLS() {
  console.log('Attempting to disable RLS on all tables...');
  
  const tables = [
    'stores', 'users', 'raw_materials', 'finished_products', 
    'product_bom', 'central_stock', 'store_stock', 'stock_transfers', 
    'vendors', 'purchases', 'vendor_payments', 'sales', 'sale_items', 'audit_logs'
  ];

  for (const table of tables) {
    console.log(`Disabling RLS for ${table}...`);
    // Using a RPC or raw query via service role if allowed, but many Supabase projects 
    // don't allow raw SQL via the client. We'll try to use a dummy update to verify access.
    // Actually, the best way to do this is for the user to run it in the dashboard.
    // However, I can try to use a "Supabase Admin" feature if available.
  }
  
  console.log('\n--- IMPORTANT ---');
  console.log('Please copy and run the following SQL in your Supabase Dashboard SQL Editor:');
  console.log(`
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE finished_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_bom DISABLE ROW LEVEL SECURITY;
ALTER TABLE central_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
  `);
}

disableRLS();
