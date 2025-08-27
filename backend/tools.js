import { supabase } from './supabaseClient.js';

// Shared helper: robust SKU lookup across common casings
async function findProductBySku(rawSku) {
  const sku = String(rawSku || '').trim();
  if (!sku) return { data: null, error: new Error('Empty SKU') };
  const columns = ['sku', 'SKU', 'Sku'];
  // exact
  for (const col of columns) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq(col, sku)
        .maybeSingle();
      if (!error && data) return { data, error: null };
    } catch {}
  }
  // ilike exact pattern
  for (const col of columns) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike(col, sku)
        .maybeSingle();
      if (!error && data) return { data, error: null };
    } catch {}
  }
  // contains
  for (const col of columns) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike(col, `%${sku}%`)
        .limit(1);
      if (!error && data && data[0]) return { data: data[0], error: null };
    } catch {}
  }
  return { data: null, error: null };
}

export const tools = {
  searchInventory: {
    schema: {
      name: 'searchInventory',
      description: 'Search inventory by free-text query (name or SKU). Returns up to topK products.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query text' },
          topK: { type: 'integer', description: 'Max number of items to return', default: 8 }
        },
        required: ['query']
      }
    },
    execute: async ({ query, topK = 8 }) => {
      const q = String(query || '').trim();
      if (!q) return { products: [] };
      // Try SKU-like columns first
      const skuCols = ['sku', 'SKU', 'Sku'];
      for (const col of skuCols) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .ilike(col, `%${q}%`)
          .limit(topK);
        if (!error && data && data.length) return { products: data };
      }
      // Fallback: name match
      const { data } = await supabase
        .from('products')
        .select('*')
        .ilike('name', `%${q}%`)
        .limit(topK);
      return { products: data || [] };
    }
  },
  openProductDetail: {
    schema: {
      name: 'openProductDetail',
      description: 'Open detailed product view by SKU or exact identifier.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Product SKU or identifier' }
        },
        required: ['id']
      }
    },
    execute: async ({ id }) => {
      const { data } = await findProductBySku(id);
      return data ? { product: data } : { error: 'Product not found' };
    }
  },
  fileSearch: {
    schema: {
      name: 'fileSearch',
      description: 'Fetch a product document by filename (e.g., manual or safety sheet). Returns a URL if found.',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Filename to locate' }
        },
        required: ['filename']
      }
    },
    execute: async ({ filename }) => {
      // Placeholder: if you later store docs in a table or storage bucket, query it here
      // For now, return not implemented response
      return { error: 'fileSearch not implemented', filename };
    }
  }
};
