import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_STORE_DOMAIN = 'lovable-project-e9rng.myshopify.com';
const SHOPIFY_API_VERSION = '2025-01';

interface MediaData {
  base64?: string;
  filename?: string;
}

interface VariantData {
  id?: number;
  price: string;
  sku: string;
  option1?: string;
  option2?: string;
  inventory_quantity?: number;
  inventory_policy?: 'deny' | 'continue';
}

interface ProductData {
  title: string;
  body: string;
  product_type: string;
  vendor: string;
  tags: string;
  fulfillment_type?: 'in_stock' | 'dropship';
  dropship_lead_time?: number;
  dropship_message?: string;
  weight_grams?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  variants: VariantData[];
  options: Array<{
    name: string;
    values: string[];
  }>;
  images?: MediaData[];
  videos?: MediaData[];
}

async function verifyAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();

  return !error && data?.role === 'admin';
}

async function shopifyAdminRequest(endpoint: string, method: string, body?: any) {
  const accessToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
  
  if (!accessToken) {
    throw new Error('TOKEN_NOT_CONFIGURED: SHOPIFY_ACCESS_TOKEN não está configurado. Reconecte o Shopify em Configurações → Conectores.');
  }

  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;
  
  console.log(`Making ${method} request to: ${url}`);

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Shopify API error:', errorText);
    
    // Check for authentication errors
    if (response.status === 401 || response.status === 403) {
      throw new Error('TOKEN_INVALID: Token Shopify inválido ou expirado. Reconecte o Shopify em Configurações → Conectores.');
    }
    
    throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
  }

  if (method === 'DELETE') {
    return { success: true };
  }

  return response.json();
}

async function createProduct(data: ProductData) {
  // Build images array from base64 data
  const images: Array<{ attachment: string; filename?: string }> = [];
  
  if (data.images && data.images.length > 0) {
    for (const img of data.images) {
      if (img.base64) {
        images.push({
          attachment: img.base64,
          filename: img.filename,
        });
      }
    }
  }

  // Build options from data
  const productOptions = data.options.length > 0 
    ? data.options.map(o => ({ name: o.name, values: o.values }))
    : [{ name: 'Title', values: ['Default'] }];

  // Build variants with inventory
  const isDropship = data.fulfillment_type === 'dropship';
  
  const variants = data.variants.map((v) => ({
    price: v.price,
    sku: v.sku || '',
    option1: v.option1 || 'Default',
    option2: v.option2 || null,
    option3: null,
    inventory_management: isDropship ? null : 'shopify',
    inventory_quantity: isDropship ? 0 : (v.inventory_quantity || 0),
    inventory_policy: isDropship ? 'continue' : (v.inventory_policy || 'deny'),
  }));

  // Build metafields for dropship products
  const metafields = isDropship ? [
    {
      namespace: 'custom',
      key: 'fulfillment_type',
      value: 'dropship',
      type: 'single_line_text_field',
    },
    {
      namespace: 'custom',
      key: 'dropship_lead_time',
      value: String(data.dropship_lead_time || 7),
      type: 'number_integer',
    },
    {
      namespace: 'custom',
      key: 'dropship_message',
      value: data.dropship_message || 'Este item é sob encomenda.',
      type: 'single_line_text_field',
    }
  ] : [
    {
      namespace: 'custom',
      key: 'fulfillment_type',
      value: 'in_stock',
      type: 'single_line_text_field',
    }
  ];

  const productPayload = {
    product: {
      title: data.title,
      body_html: data.body || '',
      vendor: data.vendor || '',
      product_type: data.product_type || '',
      tags: data.tags || '',
      variants,
      options: productOptions,
      images: images.length > 0 ? images : undefined,
      metafields,
    },
  };

  console.log('Creating product with payload:', JSON.stringify({
    ...productPayload,
    product: {
      ...productPayload.product,
      images: images.length > 0 ? `[${images.length} images]` : undefined,
      variants: `[${variants.length} variants]`,
    }
  }, null, 2));
  
  const result = await shopifyAdminRequest('products.json', 'POST', productPayload);
  
  // Handle video uploads separately if provided
  if (data.videos && data.videos.length > 0 && result.product?.id) {
    console.log(`Product created with ID ${result.product.id}. Note: Video uploads require external URL hosting.`);
  }
  
  return result.product;
}

async function updateProduct(productId: number, data: ProductData) {
  // Build images array from base64 data
  const images: Array<{ attachment: string; filename?: string }> = [];
  
  if (data.images && data.images.length > 0) {
    for (const img of data.images) {
      if (img.base64) {
        images.push({
          attachment: img.base64,
          filename: img.filename,
        });
      }
    }
  }

  // Build options from data
  const productOptions = data.options.length > 0 
    ? data.options.map(o => ({ name: o.name, values: o.values }))
    : undefined;

  // Build variants with inventory
  // IMPORTANT: Shopify uses option1/option2/option3 in order. Our admin UI sometimes sends size as option2.
  // We normalize based on how many product options are configured to avoid creating duplicate "Default" variants.
  const isDropship = data.fulfillment_type === 'dropship';

  const optionCount = productOptions?.length ?? 0;

  // Fetch existing variants so we can attach IDs when updating (otherwise Shopify treats them as new variants)
  const existingProductResult = await shopifyAdminRequest(`products/${productId}.json`, 'GET');
  const existingVariants: any[] = existingProductResult?.product?.variants ?? [];

  const existingBySku = new Map<string, number>();
  const existingByOptions = new Map<string, number>();
  for (const ev of existingVariants) {
    if (ev?.sku) existingBySku.set(String(ev.sku), ev.id);
    const key = `${ev?.option1 ?? ''}|${ev?.option2 ?? ''}|${ev?.option3 ?? ''}`;
    existingByOptions.set(key, ev.id);
  }

  // When updating, if frontend sends fewer variants than needed, we should NOT send variants at all
  // to avoid the "Options cannot be blank" error. Shopify expects ALL variants when options are changed.
  // Only send variants if we have a reasonable number matching the option combinations.
  let variants: any[] | undefined = undefined;
  
  if (data.variants && data.variants.length > 0) {
    // Calculate expected variant count based on options
    const expectedVariantCount = productOptions 
      ? productOptions.reduce((acc, opt) => acc * opt.values.length, 1)
      : 1;
    
    // If we have significantly fewer variants than expected, DON'T update variants
    // This prevents partial updates that cause "Options cannot be blank" errors
    const hasEnoughVariants = data.variants.length >= expectedVariantCount * 0.5; // Allow some tolerance
    
    if (hasEnoughVariants || data.variants.length >= existingVariants.length) {
      variants = data.variants.map((v) => {
        const normalizedOption1 =
          optionCount >= 1
            ? (v.option1 || v.option2 || productOptions?.[0]?.values?.[0] || 'Default')
            : (v.option1 || 'Default');

        const normalizedOption2 =
          optionCount >= 2
            ? (v.option2 || null)
            : null;

        const normalizedOption3 = null;

        const variant: any = {
          price: v.price,
          sku: v.sku || '',
          option1: normalizedOption1,
          option2: normalizedOption2,
          option3: normalizedOption3,
          inventory_management: isDropship ? null : 'shopify',
          inventory_quantity: isDropship ? 0 : (v.inventory_quantity || 0),
          inventory_policy: isDropship ? 'continue' : (v.inventory_policy || 'deny'),
        };

        // Include variant ID if it exists or can be inferred
        const inferredId =
          (v.id ? Number(v.id) : undefined) ??
          (v.sku ? existingBySku.get(String(v.sku)) : undefined) ??
          existingByOptions.get(`${normalizedOption1}|${normalizedOption2 ?? ''}|${normalizedOption3 ?? ''}`);

        if (inferredId) variant.id = inferredId;

        return variant;
      });
    } else {
      console.log(`Skipping variant update: received ${data.variants.length} variants but expected ~${expectedVariantCount}. Keeping existing ${existingVariants.length} variants.`);
    }
  }
  
  // CRITICAL: If we're updating options but not variants, DON'T send options either
  // because Shopify requires variants to match options
  const shouldUpdateOptions = productOptions && variants && variants.length > 0;

  const productPayload: any = {
    product: {
      id: productId,
      title: data.title,
      body_html: data.body || '',
      vendor: data.vendor || '',
      product_type: data.product_type || '',
      tags: data.tags || '',
    },
  };

  // Add options only if we're also updating variants (they must stay in sync)
  if (shouldUpdateOptions) {
    productPayload.product.options = productOptions;
  }

  // Add variants if we have a valid set
  if (variants && variants.length > 0) {
    productPayload.product.variants = variants;
  }

  // Only add images if new ones are being uploaded
  if (images.length > 0) {
    productPayload.product.images = images;
  }

  console.log('Updating product with payload:', JSON.stringify({
    ...productPayload,
    product: {
      ...productPayload.product,
      images: images.length > 0 ? `[${images.length} images]` : undefined,
      variants: variants ? `[${variants.length} variants]` : undefined,
    }
  }, null, 2));
  
  const result = await shopifyAdminRequest(`products/${productId}.json`, 'PUT', productPayload);

  // Update metafields for dropship status
  if (data.fulfillment_type) {
    try {
      // Get existing metafields
      const metafieldsResult = await shopifyAdminRequest(`products/${productId}/metafields.json`, 'GET');
      const existingMetafields = metafieldsResult.metafields || [];
      
      // Find and update or create metafields
      const metafieldsToUpdate: Array<{ namespace: string; key: string; value: string; type: string }> = [
        {
          namespace: 'custom',
          key: 'fulfillment_type',
          value: data.fulfillment_type || 'in_stock',
          type: 'single_line_text_field',
        }
      ];

      if (isDropship) {
        metafieldsToUpdate.push(
          {
            namespace: 'custom',
            key: 'dropship_lead_time',
            value: String(data.dropship_lead_time || 7),
            type: 'number_integer',
          },
          {
            namespace: 'custom',
            key: 'dropship_message',
            value: data.dropship_message || 'Este item é sob encomenda.',
            type: 'single_line_text_field',
          }
        );
      }

      for (const mf of metafieldsToUpdate) {
        const existing = existingMetafields.find(
          (e: any) => e.namespace === mf.namespace && e.key === mf.key
        );
        
        if (existing) {
          await shopifyAdminRequest(`metafields/${existing.id}.json`, 'PUT', {
            metafield: { id: existing.id, value: mf.value, type: mf.type }
          });
        } else {
          await shopifyAdminRequest(`products/${productId}/metafields.json`, 'POST', {
            metafield: mf
          });
        }
      }
    } catch (metaError) {
      console.error('Error updating metafields:', metaError);
      // Don't fail the whole operation for metafield errors
    }
  }

  return result.product;
}

async function deleteProduct(productId: number) {
  console.log('Deleting product:', productId);
  await shopifyAdminRequest(`products/${productId}.json`, 'DELETE');
  return { success: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role
    const isAdmin = await verifyAdmin(supabase, user.id);
    if (!isAdmin) {
      console.log('User is not admin:', user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Acesso negado. Apenas administradores podem gerenciar produtos.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { action, productId, product } = body;

    console.log('Processing action:', action, 'for user:', user.id);

    let result;

    switch (action) {
      case 'create':
        if (!product) {
          throw new Error('Dados do produto são obrigatórios');
        }
        result = await createProduct(product);
        // Save weight/dimensions to local DB
        if (result?.id) {
          try {
            const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
            // Find the product in local DB by handle
            const handle = result.handle;
            if (handle) {
              await serviceClient
                .from('products')
                .update({
                  weight_grams: product.weight_grams || 300,
                  length_cm: product.length_cm || 20,
                  width_cm: product.width_cm || 15,
                  height_cm: product.height_cm || 10,
                })
                .eq('handle', handle);
            }
          } catch (e) {
            console.error('Error saving weight/dimensions:', e);
          }
        }
        break;

      case 'update':
        if (!productId || !product) {
          throw new Error('ID e dados do produto são obrigatórios');
        }
        result = await updateProduct(productId, product);
        // Update weight/dimensions in local DB
        if (result?.handle) {
          try {
            const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
            await serviceClient
              .from('products')
              .update({
                weight_grams: product.weight_grams || 300,
                length_cm: product.length_cm || 20,
                width_cm: product.width_cm || 15,
                height_cm: product.height_cm || 10,
              })
              .eq('handle', result.handle);
          } catch (e) {
            console.error('Error updating weight/dimensions:', e);
          }
        }
        break;

      case 'delete':
        if (!productId) {
          throw new Error('ID do produto é obrigatório');
        }
        result = await deleteProduct(productId);
        break;

      default:
        throw new Error(`Ação inválida: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, product: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in manage-product function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
