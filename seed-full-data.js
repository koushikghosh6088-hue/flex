import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('--- Starting Full Data Seeding ---');

  // 1. Clear existing data (optional, but good for a fresh start)
  console.log('Cleaning existing data (cascading)...');
  await supabase.from('sale_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('purchases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('store_stock').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('central_stock').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('product_bom').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // 2. Vendors
  console.log('Seeding Vendors...');
  const { data: vendors } = await supabase.from('vendors').upsert([
    { name: 'National Paper Co.', contact_person: 'Amit Shah', phone: '9876543210', email: 'sales@nationalpaper.com', address: 'Bhiwandi, MH' },
    { name: 'Ultra Inks Ltd', contact_person: 'Suresh Babu', phone: '9988776655', email: 'support@ultrainks.com', address: 'Sivakasi, TN' },
    { name: 'Global Vinyls', contact_person: 'John Doe', phone: '9123456789', email: 'info@globalvinyls.com', address: 'Surat, GJ' }
  ]).select();

  // 3. Raw Materials
  console.log('Seeding Raw Materials...');
  const { data: materials } = await supabase.from('raw_materials').upsert([
    { name: 'Frontlit Flex 340 GSM', unit: 'SQFT', description: 'Standard gloss flex' },
    { name: 'Backlit Flex 440 GSM', unit: 'SQFT', description: 'Premium backlit flex' },
    { name: 'Vinyl Sheet - Matte', unit: 'SQFT', description: 'Matte finish vinyl' },
    { name: 'Solvent Ink - Black', unit: 'LTR', description: 'High density black ink' },
    { name: 'Solvent Ink - Cyan', unit: 'LTR', description: 'High density cyan ink' }
  ]).select();

  // 4. Finished Products
  console.log('Seeding Finished Products...');
  const { data: products } = await supabase.from('finished_products').upsert([
    { name: 'Standard Banner Print', unit: 'Piece', selling_price: 1500, description: '10x20 ft flex banner' },
    { name: 'Premium Lightbox Print', unit: 'Piece', selling_price: 2500, description: 'Backlit lightbox print' },
    { name: 'Small Vinyl Decal', unit: 'Piece', selling_price: 100, description: '6x6 inch decal' }
  ]).select();

  // 5. Stores (Already exist from previous run, but we'll get them)
  const { data: stores } = await supabase.from('stores').select('*');
  const mainStore = stores.find(s => s.code === 'MAIN') || stores[0];

  // 6. Stock & BOM
  console.log('Seeding Stock & BOM...');
  for (const m of materials) {
    await supabase.from('central_stock').insert({ raw_material_id: m.id, quantity: 5000 });
    for (const s of stores) {
      await supabase.from('store_stock').insert({ store_id: s.id, raw_material_id: m.id, quantity: 500 });
    }
  }

  for (const p of products) {
    await supabase.from('central_stock').insert({ finished_product_id: p.id, quantity: 100 });
    for (const s of stores) {
      await supabase.from('store_stock').insert({ store_id: s.id, finished_product_id: p.id, quantity: 20 });
    }
    // Simple BOM: Each product takes 20 SQFT of first material and 0.1 LTR of first ink
    await supabase.from('product_bom').insert([
      { product_id: p.id, raw_material_id: materials[0].id, quantity_required: 20 },
      { product_id: p.id, raw_material_id: materials[3].id, quantity_required: 0.1 }
    ]);
  }

  // 7. Sales & Purchases
  console.log('Seeding Sales & Purchases...');
  const { data: users } = await supabase.from('users').select('*');
  const owner = users.find(u => u.role === 'owner') || users[0];

  if (owner && mainStore) {
    // A Purchase
    await supabase.from('purchases').insert({
      vendor_id: vendors[0].id,
      raw_material_id: materials[0].id,
      quantity: 1000,
      unit_price: 5.5,
      purchase_date: new Date().toISOString().split('T')[0],
      created_by: owner.id
    });

    // A Sale
    const { data: sale } = await supabase.from('sales').insert({
      store_id: mainStore.id,
      customer_name: 'Regular Client',
      customer_phone: '9999999999',
      total_amount: 3000,
      payment_method: 'UPI',
      created_by: owner.id
    }).select().single();

    if (sale) {
      await supabase.from('sale_items').insert({
        sale_id: sale.id,
        finished_product_id: products[0].id,
        quantity: 2,
        unit_price: 1500
      });
    }
  }

  console.log('--- Seeding Completed Successfully ---');
}

seed().catch(console.error);
