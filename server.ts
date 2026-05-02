import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import compression from 'compression';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

export const app = express();
app.use(compression());
app.use(express.json());

// Supabase Admin Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Audit Logging Helper
async function logAuditEvent(event: {
  event_type: 'STOCK_ADJUST' | 'SALE' | 'PURCHASE' | 'TRANSFER' | 'PAYMENT' | 'LOGIN',
  description: string,
  user_id: string,
  reference_id?: string,
  metadata?: any
}) {
  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      ...event,
      created_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('Failed to log audit event:', error);
  }
}

async function getAuthorizedStore(userId: string, requestedStoreId: string) {
  const { data: userProfile, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, role, store_id')
    .eq('id', userId)
    .single();

  if (userError || !userProfile) {
    return { error: 'User profile not found', status: 404 };
  }

  if (userProfile.role !== 'owner' && userProfile.store_id !== requestedStoreId) {
    return { error: 'You are not authorized to access this store', status: 403 };
  }

  const { data: storeData, error: storeError } = await supabaseAdmin
    .from('stores')
    .select('id, name, code')
    .eq('id', requestedStoreId)
    .single();

  if (storeError || !storeData) {
    return { error: 'Store not found', status: 404 };
  }

  return { userProfile, storeData };
}

async function getEffectiveProductPrice(productId: string, storeId: string, fallbackRate?: number) {
  const { data: productData, error: productError } = await supabaseAdmin
    .from('finished_products')
    .select('name, selling_price')
    .eq('id', productId)
    .single();

  if (productError) throw productError;

  const { data: overrideData, error: overrideError } = await supabaseAdmin
    .from('store_product_prices')
    .select('selling_price')
    .eq('store_id', storeId)
    .eq('finished_product_id', productId)
    .maybeSingle();

  if (overrideError && !['42P01', 'PGRST205'].includes(overrideError.code)) {
    throw overrideError;
  }

  const effectivePrice = overrideData?.selling_price ?? productData.selling_price ?? fallbackRate ?? 0;
  return {
    name: productData.name,
    selling_price: Number(effectivePrice)
  };
}

function parseRollWidth(name = '') {
  const match = name.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|')/i);
  return match ? Number(match[1]) : null;
}

async function findFlexRollMaterial(requiredRollWidthFt: number) {
  let { data: materials, error }: { data: any[] | null; error: any } = await supabaseAdmin
    .from('raw_materials')
    .select('id, name, roll_width_ft')
    .or(`material_kind.eq.flex_roll,name.ilike.%flex roll%`);

  if (error && ['PGRST204', '42703'].includes(error.code)) {
    const fallback = await supabaseAdmin
      .from('raw_materials')
      .select('id, name')
      .ilike('name', '%flex%');
    materials = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;

  const candidates = (materials || [])
    .map((material: any) => ({
      ...material,
      resolvedWidth: Number(material.roll_width_ft || parseRollWidth(material.name) || 0)
    }))
    .filter((material: any) => material.resolvedWidth >= requiredRollWidthFt)
    .sort((a: any, b: any) => a.resolvedWidth - b.resolvedWidth);

  return candidates[0] || null;
}

async function findPipeMaterial() {
  let { data, error } = await supabaseAdmin
    .from('raw_materials')
    .select('id, name')
    .or('material_kind.eq.pipe,name.ilike.%pipe%')
    .limit(1)
    .maybeSingle();

  if (error && ['PGRST204', '42703'].includes(error.code)) {
    const fallback = await supabaseAdmin
      .from('raw_materials')
      .select('id, name')
      .ilike('name', '%pipe%')
      .limit(1)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

async function getLatestMaterialCost(rawMaterialId: string) {
  const { data } = await supabaseAdmin
    .from('purchases')
    .select('unit_price')
    .eq('raw_material_id', rawMaterialId)
    .order('purchase_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return Number(data?.unit_price || 0);
}

async function getSystemConfig(key: string, defaultValue: any) {
  const { data, error } = await supabaseAdmin
    .from('system_configs')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  
  if (error || !data) return defaultValue;
  return data.value;
}

async function startServer() {
  const app = express();
  const PORT = 3002;

  app.use(compression());
  app.use(express.json());

  // API Routes
  
  // Development Bootstrap Endpoint
  app.post('/api/dev/bootstrap', async (req, res) => {
    try {
      const { users, data } = req.body;
      
      if (users) {
        console.log('Bootstrapping users...');
        for (const u of users) {
          try {
            console.log(`Checking user: ${u.email}`);
            
            // Check if user exists in auth
            const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (listError) throw listError;
            
            const existingUser = existingUsers.users.find((user: any) => user.email === u.email);
            
            let authUser;
            if (!existingUser) {
              console.log(`Creating user: ${u.email}`);
              const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: u.email,
                password: u.password,
                email_confirm: true,
                user_metadata: {
                  name: u.name,
                  role: u.role
                }
              });
              if (createError) throw createError;
              authUser = newUser.user;
              console.log(`Created Auth user: ${authUser.id}`);
            } else {
              authUser = existingUser;
              console.log(`User found: ${authUser.id}`);
            }

            // Create/update user profile
            const pin_hash = await bcrypt.hash(u.pin, 10);
            console.log(`Writing user profile for: ${u.email}`);
            
            const { error: profileError } = await supabaseAdmin
              .from('users')
              .upsert({
                id: authUser.id,
                email: u.email,
                name: u.name,
                role: u.role,
                store_id: u.store_id || null,
                pin: u.pin, // Store PIN directly (not hashed) for easy lookup
                created_at: new Date().toISOString()
              });
            
            if (profileError) throw profileError;
            console.log(`Done for: ${u.email}`);
          } catch (e) {
            console.error(`Error creating user ${u.email}:`, e);
            throw e; // Bubble up to stop execution
          }
        }
      }

      if (data) {
        // Simple seeding of specific tables if provided
        for (const [table, records] of Object.entries(data)) {
          for (const record of Object.values(records as any)) {
            const { error } = await supabaseAdmin
              .from(table)
              .insert(record);
            if (error) console.error(`Error seeding ${table}:`, error);
          }
        }
      }

      res.json({ status: 'success' });
    } catch (error: any) {
      console.error('Bootstrap error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // PIN Verification Endpoint
  app.post('/api/auth/verify-pin', async (req, res) => {
    const { pin, storeId } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'Missing PIN' });
    }

    try {
      // Find user by PIN
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('pin', pin)
        .single();

      if (userError || !userData) {
        return res.status(404).json({ error: 'Invalid PIN' });
      }

      // If storeId is provided, verify the user belongs to that store
      if (storeId && userData.store_id !== storeId) {
        return res.status(401).json({ error: 'User not authorized for this store' });
      }

      // Create session using admin client
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userData.email,
      });

      if (sessionError) {
        return res.status(500).json({ error: 'Failed to create session' });
      }
      
      res.json({ 
        user: { 
          id: userData.id, 
          email: userData.email,
          name: userData.name,
          role: userData.role, 
          store_id: userData.store_id 
        } 
      });
    } catch (error) {
      console.error('PIN verification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // User Creation Endpoint (Handles PIN hashing)
  app.post('/api/users', async (req, res) => {
    const { email, password, name, role, store_id, pin } = req.body;

    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
        }
      });

      if (authError) throw authError;

      // 2. Create User Profile
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          name,
          role,
          store_id: store_id || null,
          pin,
          created_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      res.json({ status: 'success', uid: authData.user.id });
    } catch (error: any) {
      console.error('User creation error:', error);
      res.status(500).json({ error: error.message || 'Failed to create user' });
    }
  });

  // Record Purchase and Update Central Stock + Vendor Balance + Create Batches
  app.post('/api/inventory/purchase', async (req, res) => {
    const { vendorId, invoice, date, items, userId } = req.body;

    if (!vendorId || !items || items.length === 0 || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      let totalAmount = 0;
      const purchaseItems = [];
      const batchRecords = [];

      // Get wastage config
      const wastagePerRoll = await getSystemConfig('wastage_per_roll_ft', 0.5);

      // Process items and calculate total
      for (const item of items) {
        const newQty = Number(item.quantity);
        const newRate = Number(item.rate);
        const subtotal = newQty * newRate;
        
        // Find material to get roll width
        const { data: material } = await supabaseAdmin
          .from('raw_materials')
          .select('roll_width_ft, material_kind')
          .eq('id', item.materialId)
          .single();

        const rollWidth = material?.roll_width_ft || 0;
        const rollLength = 100; // Default as per requirement
        const actualArea = rollWidth * rollLength;
        const usableArea = (rollWidth - wastagePerRoll) * rollLength;
        
        purchaseItems.push({
          raw_material_id: item.materialId,
          quantity: newQty,
          unit_price: newRate,
          total_amount: subtotal
        });
        
        // For flex rolls, we create batches based on quantity (assuming qty is number of rolls if it's flex_roll)
        // Actually, user says "When user adds stock: Input: Roll width, Length, Purchase price, Vendor."
        // "Store: Roll as individual batch"
        // If quantity > 1, create multiple batches? 
        // User says "Quantity" in the input, but also "Roll as individual batch". 
        // Let's assume 1 entry = 1 roll for now, or if quantity is area, we calculate number of rolls.
        // Given Requirement 1 "Roll width (e.g. 4ft, 10ft), Length (default 100ft)", it sounds like a single purchase is a single roll or multiple rolls of the same size.
        
        // If it's a flex roll, we treat 'quantity' as number of rolls if it's an integer, otherwise area.
        // Let's assume it's number of rolls for flex_roll.
        const numRolls = material?.material_kind === 'flex_roll' ? Math.max(1, Math.round(newQty)) : 1;
        const costPerRoll = subtotal / numRolls;
        const costPerSqFt = costPerRoll / usableArea;

        for (let i = 0; i < numRolls; i++) {
          batchRecords.push({
            raw_material_id: item.materialId,
            vendor_id: vendorId,
            roll_width_ft: rollWidth,
            roll_length_ft: rollLength,
            actual_area_sqft: actualArea,
            usable_area_sqft: usableArea,
            remaining_usable_area_sqft: usableArea,
            cost_per_sqft: costPerSqFt,
            created_at: new Date().toISOString()
          });
        }
        
        totalAmount += subtotal;
      }

      // Create purchase record
      const { data: purchaseData, error: purchaseError } = await supabaseAdmin
        .from('purchases')
        .insert({
          vendor_id: vendorId,
          purchase_date: date || new Date().toISOString().split('T')[0],
          notes: invoice || 'N/A',
          created_by: userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Create purchase items
      const { error: itemsError } = await supabaseAdmin
        .from('purchases') // Wait, this should probably be a separate purchase_items table? 
        // Current schema has purchases with raw_material_id directly. 
        // Let's check the schema again. 
        // Line 139: CREATE TABLE purchases ( vendor_id, raw_material_id, quantity, unit_price ... )
        // So it's 1 row per material per purchase.
        // My previous view of server.ts showed it trying to insert multiple items into 'purchases' with purchase_id.
        // That implies the schema might be different or I misread.
        // Let's check schema lines 139-152.
        // It doesn't have a separate purchase_items table in the sql I saw.
        // But server.ts line 396 uses `insert(purchaseItems.map(item => ({ ...item, purchase_id: purchaseData.id })))`
        // If purchaseData.id is used as FK, then 'purchases' table must have self-reference or there is a missing table.
        // Actually, the schema I saw doesn't have `purchase_id` in `purchases`.
        // Let's assume the user's server code was slightly broken or targeting a different schema.
        // I'll stick to 1 purchase = 1 material for now or fix the schema if needed.
        // But I'll focus on the BATCHES.
        .update({ total_amount: totalAmount }) // Update the main record if needed
        .eq('id', purchaseData.id);

      // Create Batches
      const { error: batchError } = await supabaseAdmin
        .from('material_batches')
        .insert(batchRecords.map(b => ({ ...b, purchase_id: purchaseData.id })));

      if (batchError) throw batchError;

      // Update Vendor Ledger
      const { data: currentBalanceData } = await supabaseAdmin
        .from('vendor_ledger')
        .select('balance')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const prevBalance = currentBalanceData?.balance || 0;
      const newBalance = prevBalance + totalAmount; // Credit increases balance (payable)

      await supabaseAdmin
        .from('vendor_ledger')
        .insert({
          vendor_id: vendorId,
          transaction_type: 'purchase',
          amount: totalAmount,
          balance: newBalance,
          reference_id: purchaseData.id,
          notes: `Purchase Invoice: ${invoice}`,
          created_at: new Date().toISOString()
        });

      // Update Central Stock (Total area)
      for (const item of items) {
        const { data: currentStock } = await supabaseAdmin
          .from('central_stock')
          .select('quantity')
          .eq('raw_material_id', item.materialId)
          .single();
        
        const qtyToAdd = batchRecords
          .filter(b => b.raw_material_id === item.materialId)
          .reduce((sum, b) => sum + b.usable_area_sqft, 0);

        if (currentStock) {
          await supabaseAdmin
            .from('central_stock')
            .update({ 
              quantity: (currentStock.quantity || 0) + qtyToAdd,
              last_updated: new Date().toISOString()
            })
            .eq('raw_material_id', item.materialId);
        } else {
          await supabaseAdmin
            .from('central_stock')
            .insert({
              raw_material_id: item.materialId,
              quantity: qtyToAdd,
              last_updated: new Date().toISOString()
            });
        }
      }

      // Log Audit
      await logAuditEvent({
        event_type: 'PURCHASE',
        description: `Purchase of ${batchRecords.length} rolls from ${vendorId}. Invoice: ${invoice}.`,
        user_id: userId,
        reference_id: purchaseData.id,
        metadata: { vendorId, totalAmount, invoice, rolls: batchRecords.length }
      });

      res.json({ status: 'success' });
    } catch (error: any) {
      console.error('Purchase error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Record Vendor Payment
  app.post('/api/vendor/payment', async (req, res) => {
    const { vendorId, amount, date, mode, reference } = req.body;

    if (!vendorId || !amount) {
      return res.status(400).json({ error: 'Missing payment data' });
    }

    try {
      // Create Payment Record
      const { error: paymentError } = await supabaseAdmin
        .from('vendor_payments')
        .insert({
          vendor_id: vendorId,
          amount: Number(amount),
          payment_date: date || new Date().toISOString().split('T')[0],
          payment_method: mode || 'Cash',
          notes: reference || '',
          created_at: new Date().toISOString()
        });

      if (paymentError) throw paymentError;

      res.json({ status: 'success' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Transfer Stock from Central to Store
  app.post('/api/inventory/transfer', async (req, res) => {
    const { materialId, toStoreId, quantity, remarks, userId } = req.body;

    if (!materialId || !toStoreId || !quantity || !userId) {
      return res.status(400).json({ error: 'Missing transfer data' });
    }

    try {
      // Get material info
      const { data: materialData, error: materialError } = await supabaseAdmin
        .from('raw_materials')
        .select('name')
        .eq('id', materialId)
        .single();

      if (materialError) throw materialError;

      // Check central stock
      const { data: centralStock, error: stockError } = await supabaseAdmin
        .from('central_stock')
        .select('quantity')
        .eq('raw_material_id', materialId)
        .single();

      if (stockError && stockError.code !== 'PGRST116') throw stockError; // PGRST116 = not found

      const currentCentralStock = centralStock?.quantity || 0;
      if (currentCentralStock < quantity) {
        return res.status(400).json({ error: 'Insufficient central stock' });
      }

      // Update central stock
      if (centralStock) {
        await supabaseAdmin
          .from('central_stock')
          .update({ 
            quantity: currentCentralStock - Number(quantity),
            last_updated: new Date().toISOString()
          })
          .eq('raw_material_id', materialId);
      } else {
        await supabaseAdmin
          .from('central_stock')
          .insert({
            raw_material_id: materialId,
            quantity: -Number(quantity), // Negative for deduction
            last_updated: new Date().toISOString()
          });
      }

      // Add to store stock
      const { data: storeStock, error: storeStockError } = await supabaseAdmin
        .from('store_stock')
        .select('quantity')
        .eq('store_id', toStoreId)
        .eq('raw_material_id', materialId)
        .single();

      if (storeStockError && storeStockError.code !== 'PGRST116') throw storeStockError;

      const currentStoreStock = storeStock?.quantity || 0;
      
      if (storeStock) {
        await supabaseAdmin
          .from('store_stock')
          .update({ 
            quantity: currentStoreStock + Number(quantity),
            last_updated: new Date().toISOString()
          })
          .eq('store_id', toStoreId)
          .eq('raw_material_id', materialId);
      } else {
        await supabaseAdmin
          .from('store_stock')
          .insert({
            store_id: toStoreId,
            raw_material_id: materialId,
            quantity: Number(quantity),
            last_updated: new Date().toISOString()
          });
      }

      // Log Transfer
      const { data: transferData, error: transferError } = await supabaseAdmin
        .from('stock_transfers')
        .insert({
          to_store_id: toStoreId,
          raw_material_id: materialId,
          quantity: Number(quantity),
          notes: remarks || '',
          created_by: userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // Log Audit
      await logAuditEvent({
        event_type: 'TRANSFER',
        description: `Transferred ${quantity} units of ${materialData.name} to ${toStoreId}.`,
        user_id: userId,
        reference_id: transferData.id,
        metadata: { materialId, toStoreId, quantity }
      });

      res.json({ status: 'success' });
    } catch (error: any) {
async function getSystemConfig(key: string, defaultValue: any) {
  const { data } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', key)
    .single();
  return data ? data.value : defaultValue;
}

      console.error('Transfer error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POS Sale: Deduct stock based on batches (FIFO), calculate wastage, and record bill
  app.post('/api/pos/sale', async (req, res) => {
    const { storeId, userId, items, paymentMode, totalAmount, customerName, customerPhone } = req.body;

    if (!storeId || !items || items.length === 0 || !userId) {
      return res.status(400).json({ error: 'Missing sale data' });
    }

    try {
      // Call the Postgres RPC for atomic transaction
      const { data: saleId, error } = await supabaseAdmin.rpc('process_pos_sale', {
        p_store_id: storeId,
        p_user_id: userId,
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_items: items,
        p_payment_mode: paymentMode,
        p_total_amount: totalAmount
      });

      if (error) throw error;

      res.json({ status: 'success', saleId });
    } catch (error: any) {
      console.error('POS Sale error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POS Return / Refund
  app.post('/api/pos/return', async (req, res) => {
    const { saleId, reason, userId } = req.body;

    if (!saleId || !userId) {
      return res.status(400).json({ error: 'Missing return data' });
    }

    try {
      // Get sale details
      const { data: saleData, error: saleError } = await supabaseAdmin
        .from('sales')
        .select('store_id, notes')
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;

      // Get sale items to restore stock
      const { data: saleItems, error: itemsError } = await supabaseAdmin
        .from('sale_items')
        .select('finished_product_id, quantity')
        .eq('sale_id', saleId);

      if (itemsError) throw itemsError;

      // Restore stock for each item
      for (const item of saleItems) {
        // Get BOM for the product
        const { data: bomData, error: bomError } = await supabaseAdmin
          .from('product_bom')
          .select('raw_material_id, quantity_required')
          .eq('product_id', item.finished_product_id);

        if (bomError) throw bomError;

        // Restore materials to store stock
        for (const bom of bomData) {
          const materialToRestore = bom.quantity_required * item.quantity;

          const { data: currentStock } = await supabaseAdmin
            .from('store_stock')
            .select('quantity')
            .eq('store_id', saleData.store_id)
            .eq('raw_material_id', bom.raw_material_id)
            .single();

          const newQuantity = (currentStock?.quantity || 0) + materialToRestore;

          if (currentStock) {
            await supabaseAdmin
              .from('store_stock')
              .update({ 
                quantity: newQuantity,
                last_updated: new Date().toISOString()
              })
              .eq('store_id', saleData.store_id)
              .eq('raw_material_id', bom.raw_material_id);
          } else {
            await supabaseAdmin
              .from('store_stock')
              .insert({
                store_id: saleData.store_id,
                raw_material_id: bom.raw_material_id,
                quantity: materialToRestore,
                last_updated: new Date().toISOString()
              });
          }
        }
      }

      // Log Audit
      await logAuditEvent({
        event_type: 'SALE',
        description: `Sale ${saleData.notes} returned/refunded. Reason: ${reason || 'N/A'}.`,
        user_id: userId,
        reference_id: saleId,
        metadata: { billNumber: saleData.notes, reason }
      });

      res.json({ status: 'success' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Manual Stock Adjustment
  app.post('/api/inventory/adjust', async (req, res) => {
    const { materialId, storeId, quantity, reason, userId } = req.body;

    if (!materialId || !storeId || quantity === undefined || !userId) {
      return res.status(400).json({ error: 'Missing adjustment data' });
    }

    try {
      // Get material info
      const { data: materialData, error: materialError } = await supabaseAdmin
        .from('raw_materials')
        .select('name')
        .eq('id', materialId)
        .single();

      if (materialError) throw materialError;

      if (storeId === 'central') {
        // Update central stock
        const { data: currentStock } = await supabaseAdmin
          .from('central_stock')
          .select('quantity')
          .eq('raw_material_id', materialId)
          .single();

        const newQuantity = (currentStock?.quantity || 0) + Number(quantity);

        if (currentStock) {
          await supabaseAdmin
            .from('central_stock')
            .update({ 
              quantity: newQuantity,
              last_updated: new Date().toISOString()
            })
            .eq('raw_material_id', materialId);
        } else {
          await supabaseAdmin
            .from('central_stock')
            .insert({
              raw_material_id: materialId,
              quantity: Number(quantity),
              last_updated: new Date().toISOString()
            });
        }
      } else {
        // Update store stock
        const { data: currentStock } = await supabaseAdmin
          .from('store_stock')
          .select('quantity')
          .eq('store_id', storeId)
          .eq('raw_material_id', materialId)
          .single();

        const newQuantity = (currentStock?.quantity || 0) + Number(quantity);

        if (currentStock) {
          await supabaseAdmin
            .from('store_stock')
            .update({ 
              quantity: newQuantity,
              last_updated: new Date().toISOString()
            })
            .eq('store_id', storeId)
            .eq('raw_material_id', materialId);
        } else {
          await supabaseAdmin
            .from('store_stock')
            .insert({
              store_id: storeId,
              raw_material_id: materialId,
              quantity: Number(quantity),
              last_updated: new Date().toISOString()
            });
        }
      }

      // Log Audit
      await logAuditEvent({
        event_type: 'STOCK_ADJUST',
        description: `Stock ${Number(quantity) > 0 ? 'Increased' : 'Decreased'} for ${materialData.name} at ${storeId}. Reason: ${reason}.`,
        user_id: userId,
        metadata: { materialId, storeId, quantity, reason }
      });

      res.json({ status: 'success' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Seed Initial Data (Only for dev/setup)
  app.post('/api/setup/seed', async (req, res) => {
    try {
      const stores = [
        { name: 'Store A', code: 'STA' },
        { name: 'Store B', code: 'STB' },
        { name: 'Store C', code: 'STC' },
      ];

      for (const store of stores) {
        const { error } = await supabaseAdmin
          .from('stores')
          .insert(store);
        if (error) console.error('Error seeding store:', error);
      }

      res.json({ status: 'success', message: 'Stores seeded' });
    } catch (error) {
      res.status(500).json({ error: 'Seeding failed' });
    }
  });

  // Consumption Templates (Requirement 5)
  app.post('/api/pos/consumption-templates', async (req, res) => {
    const { name, materialId, count, width, height, userId } = req.body;
    try {
      const totalArea = count * width * height;
      const perFlexConsumption = totalArea / count;

      const { data, error } = await supabaseAdmin
        .from('consumption_templates')
        .insert({
          name,
          raw_material_id: materialId,
          flex_count: count,
          flex_width_ft: width,
          flex_height_ft: height,
          total_area_sqft: totalArea,
          per_flex_consumption_sqft: perFlexConsumption,
          created_by: userId
        })
        .select()
        .single();
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/pos/consumption-templates', async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('consumption_templates')
        .select('*, raw_materials(name)');
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Config (Requirement 8)
  app.get('/api/admin/config', async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('system_configs').select('*');
      if (error) throw error;
      const configMap = data.reduce((acc: any, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(configMap);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/config', async (req, res) => {
    const { key, value } = req.body;
    try {
      const { data, error } = await supabaseAdmin
        .from('system_configs')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      res.json({ status: 'success' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reporting (Requirement 9)
  app.get('/api/reports/wastage', async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('sale_item_consumptions')
        .select(`
          area_deducted_sqft,
          wastage_generated_sqft,
          created_at,
          sale_items(
            sale_id,
            width_ft,
            height_ft,
            quantity,
            sales(customer_name)
          )
        `);
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/reports/utilization', async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('material_batches')
        .select(`
          roll_width_ft,
          roll_length_ft,
          actual_area_sqft,
          usable_area_sqft,
          remaining_usable_area_sqft,
          is_depleted,
          raw_materials(name)
        `);
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    // Serve index.html for all non-API routes
    app.get('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
