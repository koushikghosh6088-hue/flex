import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import compression from 'compression';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Only try to load .env.local if not on Vercel
if (!process.env.VERCEL) {
  try {
    const dotenv = await import('dotenv');
    dotenv.config({ path: resolve(__dirname, '.env.local') });
  } catch (e) {
    console.warn('Could not load dotenv, skipping...');
  }
}

export const app = express();
app.use(compression());
app.use(express.json());

// Supabase Admin Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: any;

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } else {
    console.error('Supabase credentials missing in server.ts');
  }
} catch (e) {
  console.error('Failed to initialize Supabase Admin:', e);
}

// Audit Logging Helper
async function logAuditEvent(event: {
  event_type: 'STOCK_ADJUST' | 'SALE' | 'PURCHASE' | 'TRANSFER' | 'PAYMENT' | 'LOGIN',
  description: string,
  user_id: string,
  reference_id?: string,
  metadata?: any
}) {
  if (!supabaseAdmin) return;
  const { error } = await supabaseAdmin
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
  if (!supabaseAdmin) return { error: 'Database not initialized', status: 500 };
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
  if (!supabaseAdmin) throw new Error('Database not initialized');
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
  if (!supabaseAdmin) throw new Error('Database not initialized');
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
  if (!supabaseAdmin) throw new Error('Database not initialized');
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
  if (!supabaseAdmin) return 0;
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
  if (!supabaseAdmin) return defaultValue;
  const { data, error } = await supabaseAdmin
    .from('system_configs')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  
  if (error || !data) return defaultValue;
  return data.value;
}

// Health Check & Diagnostics
app.get('/api/health', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ status: 'error', message: 'Supabase Admin not initialized' });
    }
    const { error } = await supabaseAdmin.from('stores').select('count', { count: 'exact', head: true });
    res.json({
      status: 'ok',
      supabase: error ? 'error' : 'connected',
      supabaseError: error ? error.message : null,
      env: {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        isVercel: !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// API Routes

// Create Raw Material
app.post('/api/inventory/raw-materials', async (req, res) => {
  const { name, unit, description } = req.body;
  try {
    const { data, error } = await supabaseAdmin.from('raw_materials').insert([{ name, unit, description }]).select().single();
    if (error) throw error;
    await supabaseAdmin.from('central_stock').insert([{ raw_material_id: data.id, quantity: 0 }]);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Finished Product
app.post('/api/inventory/products', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('finished_products').insert([req.body]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Vendor
app.post('/api/inventory/vendors', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('vendors').insert([req.body]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Store
app.post('/api/inventory/stores', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('stores').insert([req.body]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PIN Verification Endpoint
app.post('/api/auth/verify-pin', async (req, res) => {
  const { pin, storeId } = req.body;
  if (!pin) return res.status(400).json({ error: 'Missing PIN' });

  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('pin', pin)
      .single();

    if (userError || !userData) return res.status(404).json({ error: 'Invalid PIN' });
    if (storeId && userData.store_id !== storeId) return res.status(401).json({ error: 'User not authorized' });

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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Creation Endpoint
app.post('/api/users', async (req, res) => {
  const { email, password, name, role, store_id, pin } = req.body;
  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { name, role }
    });
    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id, email, name, role, store_id: store_id || null, pin,
        created_at: new Date().toISOString()
      });
    if (profileError) throw profileError;

    res.json({ status: 'success', uid: authData.user.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

// Record Purchase
app.post('/api/inventory/purchase', async (req, res) => {
  const { vendorId, invoice, date, items, userId } = req.body;
  if (!vendorId || !items || items.length === 0 || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let totalAmount = 0;
    const batchRecords = [];
    const wastagePerRoll = await getSystemConfig('wastage_per_roll_ft', 0.5);

    for (const item of items) {
      const newQty = Number(item.quantity);
      const newRate = Number(item.rate);
      const subtotal = newQty * newRate;
      
      const { data: material } = await supabaseAdmin
        .from('raw_materials')
        .select('roll_width_ft, material_kind')
        .eq('id', item.materialId)
        .single();

      const rollWidth = material?.roll_width_ft || 0;
      const rollLength = 100;
      const actualArea = rollWidth * rollLength;
      const usableArea = (rollWidth - wastagePerRoll) * rollLength;
      
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

    const { data: purchaseData, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .insert({
        vendor_id: vendorId,
        purchase_date: date || new Date().toISOString().split('T')[0],
        notes: invoice || 'N/A',
        created_by: userId,
        total_amount: totalAmount,
        created_at: new Date().toISOString()
      })
      .select().single();

    if (purchaseError) throw purchaseError;

    const { error: batchError } = await supabaseAdmin
      .from('material_batches')
      .insert(batchRecords.map(b => ({ ...b, purchase_id: purchaseData.id })));

    if (batchError) throw batchError;

    const { data: currentBalanceData } = await supabaseAdmin
      .from('vendor_ledger')
      .select('balance')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    
    const newBalance = (currentBalanceData?.balance || 0) + totalAmount;

    await supabaseAdmin.from('vendor_ledger').insert({
      vendor_id: vendorId,
      transaction_type: 'purchase',
      amount: totalAmount,
      balance: newBalance,
      reference_id: purchaseData.id,
      notes: `Purchase Invoice: ${invoice}`,
      created_at: new Date().toISOString()
    });

    for (const item of items) {
      const { data: currentStock } = await supabaseAdmin
        .from('central_stock')
        .select('quantity')
        .eq('raw_material_id', item.materialId).single();
      
      const qtyToAdd = batchRecords
        .filter(b => b.raw_material_id === item.materialId)
        .reduce((sum, b) => sum + b.usable_area_sqft, 0);

      if (currentStock) {
        await supabaseAdmin.from('central_stock').update({ 
          quantity: (currentStock.quantity || 0) + qtyToAdd,
          last_updated: new Date().toISOString()
        }).eq('raw_material_id', item.materialId);
      } else {
        await supabaseAdmin.from('central_stock').insert({
          raw_material_id: item.materialId,
          quantity: qtyToAdd,
          last_updated: new Date().toISOString()
        });
      }
    }

    await logAuditEvent({
      event_type: 'PURCHASE',
      description: `Purchase of ${batchRecords.length} rolls from ${vendorId}.`,
      user_id: userId,
      reference_id: purchaseData.id
    });

    res.json({ status: 'success' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Transfer Stock
app.post('/api/inventory/transfer', async (req, res) => {
  const { materialId, toStoreId, quantity, remarks, userId } = req.body;
  try {
    const { data: materialData } = await supabaseAdmin.from('raw_materials').select('name').eq('id', materialId).single();
    const { data: centralStock } = await supabaseAdmin.from('central_stock').select('quantity').eq('raw_material_id', materialId).single();

    if ((centralStock?.quantity || 0) < quantity) return res.status(400).json({ error: 'Insufficient central stock' });

    await supabaseAdmin.from('central_stock').update({ 
      quantity: (centralStock?.quantity || 0) - Number(quantity),
      last_updated: new Date().toISOString()
    }).eq('raw_material_id', materialId);

    const { data: storeStock } = await supabaseAdmin.from('store_stock').select('quantity').eq('store_id', toStoreId).eq('raw_material_id', materialId).single();

    if (storeStock) {
      await supabaseAdmin.from('store_stock').update({ 
        quantity: (storeStock.quantity || 0) + Number(quantity),
        last_updated: new Date().toISOString()
      }).eq('store_id', toStoreId).eq('raw_material_id', materialId);
    } else {
      await supabaseAdmin.from('store_stock').insert({
        store_id: toStoreId, raw_material_id: materialId, quantity: Number(quantity),
        last_updated: new Date().toISOString()
      });
    }

    const { data: transferData } = await supabaseAdmin.from('stock_transfers').insert({
      to_store_id: toStoreId, raw_material_id: materialId, quantity: Number(quantity),
      notes: remarks || '', created_by: userId, created_at: new Date().toISOString()
    }).select().single();

    await logAuditEvent({
      event_type: 'TRANSFER',
      description: `Transferred ${quantity} units of ${materialData?.name} to ${toStoreId}.`,
      user_id: userId,
      reference_id: transferData?.id
    });

    res.json({ status: 'success' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POS Sale
app.post('/api/pos/sale', async (req, res) => {
  const { storeId, userId, items, paymentMode, totalAmount, customerName, customerPhone } = req.body;
  try {
    const { data: saleId, error } = await supabaseAdmin.rpc('process_pos_sale', {
      p_store_id: storeId, p_user_id: userId, p_customer_name: customerName,
      p_customer_phone: customerPhone, p_items: items, p_payment_mode: paymentMode,
      p_total_amount: totalAmount
    });
    if (error) throw error;
    res.json({ status: 'success', saleId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reports
app.get('/api/reports/wastage', async (req, res) => {
  try {
    const { data } = await supabaseAdmin.from('sale_item_consumptions').select(`
      area_deducted_sqft, wastage_generated_sqft, created_at,
      sale_items(sale_id, width_ft, height_ft, quantity, sales(customer_name))
    `);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Only serve static files if not on Vercel
if (!process.env.VERCEL) {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.get('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Start listener only if run directly and NOT on Vercel
if (!process.env.VERCEL && (import.meta.url === `file://${fileURLToPath(import.meta.url)}` || process.env.NODE_ENV === 'development')) {
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
