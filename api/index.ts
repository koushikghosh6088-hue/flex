import express from 'express';
import { createClient } from '@supabase/supabase-js';
import compression from 'compression';

const app = express();
app.use(compression());
app.use(express.json());

// Supabase Admin Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Audit Logging Helper
async function logAuditEvent(event: {
  event_type: 'STOCK_ADJUST' | 'SALE' | 'PURCHASE' | 'TRANSFER' | 'PAYMENT' | 'LOGIN',
  description: string,
  user_id: string,
  reference_id?: string,
  metadata?: any
}) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        ...event,
        created_at: new Date().toISOString()
      });
  } catch (e) {
    console.error('Failed to log audit event:', e);
  }
}

async function getSystemConfig(key: string, defaultValue: any) {
  if (!supabaseAdmin) return defaultValue;
  try {
    const { data, error } = await supabaseAdmin
      .from('system_configs')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    
    if (error || !data) return defaultValue;
    return data.value;
  } catch (e) {
    return defaultValue;
  }
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Full API is active',
    supabase: !!supabaseAdmin,
    env: {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      isVercel: !!process.env.VERCEL
    }
  });
});

// --- API Routes ---

// Create Raw Material
app.post('/api/inventory/raw-materials', async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Database connection not initialized' });
  const { name, unit, material_kind, roll_width_ft, description } = req.body;
  try {
    const { data, error } = await supabaseAdmin.from('raw_materials').insert([{ 
      name, 
      unit: unit || 'SQFT', 
      material_kind: material_kind || 'flex_roll',
      roll_width_ft: roll_width_ft ? Number(roll_width_ft) : null,
      description 
    }]).select().single();
    
    if (error) throw error;
    
    // Initialize central stock
    await supabaseAdmin.from('central_stock').insert([{ raw_material_id: data.id, quantity: 0 }]);
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Finished Product
app.post('/api/inventory/products', async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Database connection not initialized' });
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
  if (!supabaseAdmin) return res.status(503).json({ error: 'Database connection not initialized' });
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
  if (!supabaseAdmin) return res.status(503).json({ error: 'Database connection not initialized' });
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
  if (!supabaseAdmin) return res.status(503).json({ error: 'Database connection not initialized' });
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

// Record Purchase & Create Batches
app.post('/api/inventory/purchase', async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Database connection not initialized' });
  const { vendorId, invoice, date, items, userId } = req.body;
  if (!vendorId || !items || items.length === 0 || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let totalAmount = 0;
    const batchRecords = [];
    const wastagePerRoll = await getSystemConfig('wastage_per_roll_ft', 0.5);

    // 1. Create Purchase Header
    const { data: purchaseData, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .insert({
        vendor_id: vendorId,
        purchase_date: date || new Date().toISOString().split('T')[0],
        notes: invoice || 'N/A',
        created_by: userId,
        total_amount: 0 // Will update later
      })
      .select().single();

    if (purchaseError) throw purchaseError;

    // 2. Process Items and prepare batches
    for (const item of items) {
      const newQty = Number(item.quantity);
      const newRate = Number(item.rate);
      const subtotal = newQty * newRate;
      
      const { data: material } = await supabaseAdmin
        .from('raw_materials')
        .select('roll_width_ft, material_kind')
        .eq('id', item.materialId)
        .single();

      const rollWidth = material?.roll_width_ft || Number(item.rollWidth) || 0;
      const rollLength = 100;
      const usableArea = (rollWidth - wastagePerRoll) * rollLength;
      
      const numRolls = material?.material_kind === 'flex_roll' ? Math.max(1, Math.round(newQty)) : 1;
      const costPerRoll = subtotal / numRolls;
      const costPerSqFt = costPerRoll / (usableArea || 1);

      for (let i = 0; i < numRolls; i++) {
        batchRecords.push({
          raw_material_id: item.materialId,
          purchase_id: purchaseData.id,
          vendor_id: vendorId,
          roll_width_ft: rollWidth,
          roll_length_ft: rollLength,
          usable_area_sqft: usableArea,
          remaining_usable_area_sqft: usableArea,
          cost_per_sqft: costPerSqFt,
          created_at: new Date().toISOString()
        });
      }
      totalAmount += subtotal;

      // Update Central Stock
      const { data: currentStock } = await supabaseAdmin
        .from('central_stock')
        .select('quantity')
        .eq('raw_material_id', item.materialId).maybeSingle();
      
      const qtyToAdd = numRolls * usableArea;

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

    // 3. Update Purchase with total amount
    await supabaseAdmin.from('purchases').update({ total_amount: totalAmount }).eq('id', purchaseData.id);

    // 4. Create Batches
    if (batchRecords.length > 0) {
      await supabaseAdmin.from('material_batches').insert(batchRecords);
    }

    // 5. Update Vendor Ledger
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

    await logAuditEvent({
      event_type: 'PURCHASE',
      description: `Purchase of ${batchRecords.length} units from ${vendorId}.`,
      user_id: userId,
      reference_id: purchaseData.id
    });

    res.json({ status: 'success', purchaseId: purchaseData.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Transfer Stock
app.post('/api/inventory/transfer', async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Database connection not initialized' });
  const { materialId, toStoreId, quantity, remarks, userId } = req.body;
  try {
    const { data: materialData } = await supabaseAdmin.from('raw_materials').select('name').eq('id', materialId).single();
    const { data: centralStock } = await supabaseAdmin.from('central_stock').select('quantity').eq('raw_material_id', materialId).maybeSingle();

    if ((centralStock?.quantity || 0) < quantity) return res.status(400).json({ error: 'Insufficient central stock' });

    await supabaseAdmin.from('central_stock').update({ 
      quantity: (centralStock?.quantity || 0) - Number(quantity),
      last_updated: new Date().toISOString()
    }).eq('raw_material_id', materialId);

    const { data: storeStock } = await supabaseAdmin.from('store_stock').select('quantity').eq('store_id', toStoreId).eq('raw_material_id', materialId).maybeSingle();

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

    res.json({ status: 'success' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
