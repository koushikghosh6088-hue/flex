// Test script to create users and verify Supabase connection
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
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUsers() {
  console.log('Creating test users and data...');

  try {
    // 1. Create stores first
    console.log('Creating stores...');
    const stores = [
      { name: 'Main Store', code: 'MAIN' },
      { name: 'Store A', code: 'STA' },
      { name: 'Store B', code: 'STB' },
      { name: 'Store C', code: 'STC' }
    ];

    const storeIds = {};
    for (const store of stores) {
      const { data, error } = await supabaseAdmin
        .from('stores')
        .insert(store)
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating store ${store.name}:`, error);
      } else {
        console.log(`✓ Created store: ${store.name} (${data.id})`);
        storeIds[store.code] = data.id;
      }
    }

    // 2. Create users
    console.log('\nCreating users...');
    const users = [
      {
        email: 'owner@flexstock.com',
        password: 'owner123',
        name: 'System Owner',
        role: 'owner',
        pin: '111111',
        store_id: null
      },
      {
        email: 'manager@flexstock.com',
        password: 'manager123',
        name: 'Store Manager A',
        role: 'store_manager',
        pin: '222222',
        store_id: storeIds['STA']
      },
      {
        email: 'managerb@flexstock.com',
        password: 'manager123',
        name: 'Store Manager B',
        role: 'store_manager',
        pin: '333333',
        store_id: storeIds['STB']
      },
      {
        email: 'managerc@flexstock.com',
        password: 'manager123',
        name: 'Store Manager C',
        role: 'store_manager',
        pin: '444444',
        store_id: storeIds['STC']
      }
    ];

    for (const user of users) {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role
        }
      });

      if (authError) {
        console.error(`Error creating auth user ${user.email}:`, authError);
        continue;
      }

      // Create user profile
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          store_id: user.store_id,
          pin: user.pin,
          created_at: new Date().toISOString()
        });

      if (profileError) {
        console.error(`Error creating user profile ${user.email}:`, profileError);
      } else {
        console.log(`✓ Created user: ${user.name} (${user.email}) - PIN: ${user.pin}`);
      }
    }

    // 3. Create some sample raw materials
    console.log('\nCreating sample raw materials...');
    const materials = [
      { name: 'Vinyl Sheet - Premium', description: 'High quality vinyl for printing', unit: 'sqft' },
      { name: 'Vinyl Sheet - Standard', description: 'Standard quality vinyl', unit: 'sqft' },
      { name: 'Ink - Cyan', description: 'Cyan ink for printing', unit: 'ml' },
      { name: 'Ink - Magenta', description: 'Magenta ink for printing', unit: 'ml' },
      { name: 'Ink - Yellow', description: 'Yellow ink for printing', unit: 'ml' },
      { name: 'Ink - Black', description: 'Black ink for printing', unit: 'ml' },
      { name: 'Transfer Paper', description: 'Paper for heat transfer', unit: 'sheet' },
      { name: 'Lamination Film', description: 'Protective lamination film', unit: 'sqft' }
    ];

    for (const material of materials) {
      const { data, error } = await supabaseAdmin
        .from('raw_materials')
        .insert(material)
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating material ${material.name}:`, error);
      } else {
        console.log(`✓ Created material: ${material.name}`);
        
        // Add to central stock
        await supabaseAdmin
          .from('central_stock')
          .insert({
            raw_material_id: data.id,
            quantity: Math.floor(Math.random() * 1000) + 100,
            last_updated: new Date().toISOString()
          });
      }
    }

    // 4. Create sample finished products
    console.log('\nCreating sample finished products...');
    const products = [
      { name: 'Custom T-Shirt Print', description: 'Custom printed t-shirt', unit: 'piece', selling_price: 299.99 },
      { name: 'Coffee Mug Design', description: 'Custom printed coffee mug', unit: 'piece', selling_price: 199.99 },
      { name: 'Phone Case Print', description: 'Custom phone case design', unit: 'piece', selling_price: 149.99 },
      { name: 'Poster Print - A3', description: 'A3 size poster print', unit: 'piece', selling_price: 99.99 },
      { name: 'Banner Print', description: 'Custom banner printing', unit: 'sqft', selling_price: 25.00 }
    ];

    for (const product of products) {
      const { data, error } = await supabaseAdmin
        .from('finished_products')
        .insert(product)
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating product ${product.name}:`, error);
      } else {
        console.log(`✓ Created product: ${product.name}`);
        
        // Add to store stock for each store
        for (const storeCode of ['MAIN', 'STA', 'STB', 'STC']) {
          if (storeIds[storeCode]) {
            await supabaseAdmin
              .from('store_stock')
              .insert({
                store_id: storeIds[storeCode],
                finished_product_id: data.id,
                quantity: Math.floor(Math.random() * 50) + 10,
                last_updated: new Date().toISOString()
              });
          }
        }
      }
    }

    console.log('\n✅ Test data creation completed!');
    console.log('\n📋 Login Credentials:');
    console.log('Owner: owner@flexstock.com / owner123 (PIN: 111111)');
    console.log('Manager A: manager@flexstock.com / manager123 (PIN: 222222)');
    console.log('Manager B: managerb@flexstock.com / manager123 (PIN: 333333)');
    console.log('Manager C: managerc@flexstock.com / manager123 (PIN: 444444)');

  } catch (error) {
    console.error('Error during test data creation:', error);
  }
}

// Test database connection
async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    const { data, error } = await supabaseAdmin
      .from('stores')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
    
    console.log('✅ Database connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
}

async function main() {
  const isConnected = await testConnection();
  if (isConnected) {
    await createTestUsers();
  } else {
    console.log('Please fix connection issues before running this script again.');
  }
}

main();
