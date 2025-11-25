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
      description: 'Search inventory by free-text query (SKU, name, description, or common use-cases/tasks). Returns up to topK products.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query text (can be a SKU, product name, or a natural-language description of the task/use-case)' },
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
        if (!error && data && data.length) {
          console.log(`[searchInventory] SKU match on ${col} query="${q}" count=${data.length}`);
          return { products: data };
        }
      }

      // Next, try name match directly, but re-rank by task tokens so only suitable items float to the top
      const { data: nameData, error: nameError } = await supabase
        .from('products')
        .select('*')
        .ilike('name', `%${q}%`)
        .limit(200);
      const queryTokens_name = q
        .toLowerCase()
        .split(/\s+/)
        .map(t => t.replace(/[^a-z0-9]/g, ''))
        .filter(t => t.length > 2);
      if (!nameError && nameData && nameData.length && queryTokens_name.length) {
        const rescored = nameData
          .map(p => {
            const nameText = String(p.name || '').toLowerCase();
            const descText = String(p.description || '').toLowerCase();
            let usesText = '';
            if (Array.isArray(p.uses_cases)) usesText = p.uses_cases.join(' ').toLowerCase();
            else if (p.uses_cases) usesText = String(p.uses_cases).toLowerCase();
            const haystack = `${nameText} ${descText} ${usesText}`;
            let score = 0;
            for (const tok of queryTokens_name) if (haystack.includes(tok)) score++;
            return { product: p, score };
          })
          .filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, topK)
          .map(x => x.product);
        if (rescored.length) {
          console.log(`[searchInventory] name ilike match (rescored) query="${q}" count=${rescored.length}`);
          return { products: rescored };
        }
      }

      // Fallback: use-case–aware scoring across a broader slice of products.
      // This lets natural-language task descriptions ("splitting large logs for firewood")
      // match against description and the JSONB uses_cases field.
      console.log(`[searchInventory] entering uses-cases fallback query="${q}"`);
      const pageSize = 1000;
      const maxScan = 3000;
      let allData = [];
      for (let start = 0; start < maxScan; start += pageSize) {
        const end = start + pageSize - 1;
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .range(start, end);
        if (error) break;
        if (data && data.length) allData.push(...data);
        if (!data || data.length < pageSize) break;
      }

      if (!allData || !allData.length) {
        return { products: [] };
      }

      const queryTokens = q
        .toLowerCase()
        .split(/\s+/)
        .map(t => t.replace(/[^a-z0-9]/g, ''))
        .filter(t => t.length > 2);

      if (!queryTokens.length) {
        return { products: [] };
      }

      const scored = allData
        .map(p => {
          const nameText = String(p.name || '').toLowerCase();
          const descText = String(p.description || '').toLowerCase();
          let usesText = '';
          if (Array.isArray(p.uses_cases)) {
            usesText = p.uses_cases.join(' ').toLowerCase();
          } else if (p.uses_cases) {
            usesText = String(p.uses_cases).toLowerCase();
          }

          const haystack = `${nameText} ${descText} ${usesText}`;

          let score = 0;
          for (const tok of queryTokens) {
            if (haystack.includes(tok)) score++;
          }

          return { product: p, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(item => item.product);

      console.log(`[searchInventory] uses-cases fallback scanned=${allData.length} matched=${scored.length} query="${q}"`);
      return { products: scored };
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
