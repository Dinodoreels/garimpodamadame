import { adminClient, resolveAdminUser, jsonResponse } from '../_shared/operator.ts';

const roleFor: Record<string, string[]> = {
  detail: ['admin','gestor_cd','inbound','qc','estoque','commerce','viewer'],
  list: ['admin','gestor_cd','inbound','qc','estoque','commerce','viewer'],
  locations: ['admin','gestor_cd','inbound','qc','estoque','commerce','viewer'],
  triage: ['admin','gestor_cd','inbound','qc'],
  qc: ['admin','gestor_cd','qc'],
  price: ['admin','gestor_cd','commerce'],
  create_location: ['admin','gestor_cd','estoque'],
  address: ['admin','gestor_cd','estoque'],
  stock: ['admin','gestor_cd','estoque'],
  release: ['admin','gestor_cd','commerce'],
  resolve_pending: ['admin','gestor_cd','inbound','qc'],
  users: ['admin'],
  assign_role: ['admin'],
  upload_photo: ['admin','gestor_cd','inbound','qc','estoque'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  const db = adminClient();
  const user = await resolveAdminUser(req, db);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? 'list');
  if (!user || !(roleFor[action] ?? []).some(role => user.roles.includes(role))) return jsonResponse({ ok: false, error: 'Sem permissão para esta etapa.' }, 403);

  try {
    if (action === 'users') {
      const { data: authData, error: authError } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (authError) throw authError;
      const ids = authData.users.map(account => account.id);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        db.from('profiles').select('id,full_name').in('id', ids),
        db.from('user_roles').select('user_id,role').in('user_id', ids),
      ]);
      return jsonResponse({ ok: true, users: authData.users.map(account => ({ id: account.id, email: account.email, full_name: profiles?.find(profile => profile.id === account.id)?.full_name ?? null, role: roles?.find(role => role.user_id === account.id)?.role ?? 'user' })) });
    }
    if (action === 'assign_role') {
      const allowedRoles = ['inbound','qc','estoque','commerce','gestor_cd'];
      const role = String(body.role ?? '');
      const target = String(body.user_id ?? '');
      if (!allowedRoles.includes(role) || !target) return jsonResponse({ ok: false, error: 'Usuário ou perfil inválido.' }, 400);
      const { error } = await db.from('user_roles').upsert({ user_id: target, role }, { onConflict: 'user_id' });
      if (error) throw error;
      await db.from('inbound_events').insert({ entity_type: 'user_role', entity_id: target, action: 'role_assigned', after_data: { role }, actor_id: user.id, source: 'workflow' });
      return jsonResponse({ ok: true });
    }
    if (action === 'list') {
      let query = db.from('inbound_items').select('id,lot_id,receipt_id,state,condition_code,barcode,quantity,sku,title,brand,category,photo_path,ai_source,ai_confidence,cost,suggested_price,approved_price,location_id,created_at,updated_at,lots(code),warehouse_locations(code)').order('created_at', { ascending: false }).limit(500);
      if (body.states?.length) query = query.in('state', body.states);
      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse({ ok: true, items: data ?? [] });
    }
    if (action === 'locations') {
      const { data, error } = await db.from('warehouse_locations').select('*').order('code');
      if (error) throw error;
      return jsonResponse({ ok: true, locations: data ?? [] });
    }
    if (action === 'create_location') {
      const code = String(body.code ?? '').trim().toUpperCase();
      if (!code) return jsonResponse({ ok: false, error: 'Informe o código do endereço.' }, 400);
      const { data, error } = await db.from('warehouse_locations').insert({ code, zone: body.zone || null, aisle: body.aisle || null, rack: body.rack || null, shelf: body.shelf || null, bin: body.bin || null, description: body.description || null, capacity: body.capacity || null, created_by: user.id }).select().single();
      if (error) throw error;
      await event(db, data.id, 'location_created', null, data, user.id);
      return jsonResponse({ ok: true, location: data });
    }
    const itemId = String(body.item_id ?? '');
    const { data: before, error: itemError } = await db.from('inbound_items').select('*,lots(code),warehouse_locations(code)').eq('id', itemId).maybeSingle();
    if (itemError || !before) return jsonResponse({ ok: false, error: 'SKU não encontrado.' }, 404);

    if (action === 'detail') {
      const [photos, identification, market, prices, qc, movements, events] = await Promise.all([
        db.from('inbound_item_photos').select('*').eq('item_id', itemId).order('created_at'),
        db.from('inbound_identification_results').select('*').eq('item_id', itemId).order('confidence', { ascending: false }),
        db.from('inbound_market_references').select('*').eq('item_id', itemId).order('captured_at', { ascending: false }),
        db.from('inbound_price_history').select('*').eq('item_id', itemId).order('created_at', { ascending: false }),
        db.from('inbound_qc_checks').select('*').eq('item_id', itemId).order('created_at', { ascending: false }),
        db.from('inbound_stock_movements').select('*,warehouse_locations(code)').eq('item_id', itemId).order('created_at', { ascending: false }),
        db.from('inbound_events').select('*').eq('entity_id', itemId).order('created_at', { ascending: false }),
      ]);
      const signedPhotos = await Promise.all((photos.data ?? []).map(async photo => {
        const { data: signed } = await db.storage.from('inbound-docs').createSignedUrl(photo.file_path, 900);
        return { ...photo, signed_url: signed?.signedUrl ?? null };
      }));
      return jsonResponse({ ok: true, item: before, photos: signedPhotos, identification: identification.data ?? [], market: market.data ?? [], prices: prices.data ?? [], qc: qc.data ?? [], movements: movements.data ?? [], events: events.data ?? [] });
    }
    if (action === 'upload_photo') {
      const encoded = String(body.photo_base64 ?? '');
      const match = encoded.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
      if (!match) return jsonResponse({ ok: false, error: 'Envie uma foto JPG, PNG ou WebP.' }, 400);
      const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
      if (bytes.byteLength > 5 * 1024 * 1024) return jsonResponse({ ok: false, error: 'A foto ultrapassa 5 MB.' }, 400);
      const kind = ['product','evidence','qc','label'].includes(String(body.kind)) ? String(body.kind) : 'evidence';
      const ext = match[1].includes('png') ? 'png' : match[1].includes('webp') ? 'webp' : 'jpg';
      const path = `items/${itemId}/${crypto.randomUUID()}.${ext}`;
      const upload = await db.storage.from('inbound-docs').upload(path, bytes, { contentType: match[1] });
      if (upload.error) throw upload.error;
      const { data: photo, error } = await db.from('inbound_item_photos').insert({ item_id: itemId, kind, file_path: path, caption: String(body.caption ?? '').trim() || null, mime_type: match[1], size_bytes: bytes.byteLength, created_by: user.id }).select().single();
      if (error) { await db.storage.from('inbound-docs').remove([path]); throw error; }
      await event(db, itemId, 'photo_added', null, { photo_id: photo.id, kind, caption: photo.caption }, user.id);
      return jsonResponse({ ok: true, photo });
    }
    if (action === 'triage') {
      if (!['RETURNED','QUARANTINE'].includes(before.state)) return jsonResponse({ ok: false, error: 'Somente devoluções e itens em quarentena podem voltar para triagem.' }, 409);
      await db.from('inbound_items').update({ state: 'TRIAGE' }).eq('id', itemId);
      await movement(db, before, 'TRIAGE', 'returned_to_triage', user.id, body.notes);
      await event(db, itemId, 'returned_to_triage', before, { state: 'TRIAGE' }, user.id);
      return jsonResponse({ ok: true, state: 'TRIAGE' });
    }
    if (action === 'qc') {
      if (!['IDENTIFIED','QC_PENDING'].includes(before.state)) return jsonResponse({ ok: false, error: 'Este item não está aguardando qualidade.' }, 409);
      const decision = String(body.decision ?? '');
      if (!['approved','quarantine','rejected'].includes(decision)) return jsonResponse({ ok: false, error: 'Decisão de qualidade inválida.' }, 400);
      const checklist = body.checklist && typeof body.checklist === 'object' ? body.checklist as Record<string, unknown> : {};
      if (decision === 'approved' && !['identity','condition','quantity','evidence'].every(field => checklist[field] === true)) return jsonResponse({ ok: false, error: 'Conclua toda a conferência de qualidade antes de aprovar.' }, 400);
      const next = decision === 'approved' ? 'QC_APPROVED' : decision === 'quarantine' ? 'QUARANTINE' : 'REJECTED';
      await db.from('inbound_qc_checks').insert({ item_id: itemId, decision, checklist, notes: body.notes ?? null, created_by: user.id });
      await db.from('inbound_items').update({ state: next, qc_by: user.id, qc_at: new Date().toISOString() }).eq('id', itemId);
      await movement(db, before, next, decision === 'approved' ? 'qc_approved' : decision, user.id, body.notes);
      await event(db, itemId, `qc_${decision}`, before, { state: next, checklist: body.checklist ?? {} }, user.id);
      return jsonResponse({ ok: true, state: next });
    }
    if (action === 'price') {
      if (!['QC_APPROVED','PRICED'].includes(before.state)) return jsonResponse({ ok: false, error: 'A qualidade precisa aprovar o item primeiro.' }, 409);
      const price = Number(body.price);
      if (!(price > 0)) return jsonResponse({ ok: false, error: 'Informe um preço válido.' }, 400);
      await db.from('inbound_price_history').insert({ item_id: itemId, price_type: 'approved', old_value: before.approved_price, new_value: price, reason: body.reason ?? null, created_by: user.id });
      await db.from('inbound_items').update({ approved_price: price, approved_by: user.id, approved_at: new Date().toISOString(), state: 'PRICED' }).eq('id', itemId);
      await event(db, itemId, 'price_approved', before, { state: 'PRICED', approved_price: price }, user.id);
      return jsonResponse({ ok: true, state: 'PRICED' });
    }
    if (action === 'address') {
      if (!['PRICED','ADDRESS_PENDING'].includes(before.state)) return jsonResponse({ ok: false, error: 'Aprove o preço antes de definir o endereço.' }, 409);
      const { data: location } = await db.from('warehouse_locations').select('id,code,is_active').eq('id', body.location_id).maybeSingle();
      if (!location?.is_active) return jsonResponse({ ok: false, error: 'Endereço inválido ou inativo.' }, 400);
      await db.from('inbound_items').update({ location_id: location.id, state: 'ADDRESS_PENDING' }).eq('id', itemId);
      await movement(db, before, 'ADDRESS_PENDING', 'addressed', user.id, location.code, location.id);
      await event(db, itemId, 'addressed', before, { state: 'ADDRESS_PENDING', location_id: location.id, code: location.code }, user.id);
      return jsonResponse({ ok: true, state: 'ADDRESS_PENDING' });
    }
    if (action === 'stock') {
      if (before.state !== 'ADDRESS_PENDING' || !before.location_id) return jsonResponse({ ok: false, error: 'Defina o endereço antes de guardar no estoque.' }, 409);
      await db.from('inbound_items').update({ state: 'STOCKED', stocked_at: new Date().toISOString() }).eq('id', itemId);
      await movement(db, before, 'STOCKED', 'stocked', user.id, body.notes);
      await event(db, itemId, 'stocked', before, { state: 'STOCKED', location_id: before.location_id }, user.id);
      return jsonResponse({ ok: true, state: 'STOCKED' });
    }
    if (action === 'release') {
      const { data, error } = await db.rpc('release_inbound_item', { p_item_id: itemId, p_actor_id: user.id, p_title: body.title, p_sku: body.sku, p_price: Number(body.price), p_notes: body.notes ?? null });
      if (error) throw error;
      return jsonResponse({ ok: true, release: data });
    }
    if (action === 'resolve_pending') {
      if (before.state !== 'SCAN_PENDING') return jsonResponse({ ok: false, error: 'Esta pendência já foi tratada.' }, 409);
      const title = String(body.title ?? '').trim();
      const sku = String(body.sku ?? '').trim().toUpperCase();
      if (!title) return jsonResponse({ ok: false, error: 'Informe o produto identificado.' }, 400);
      await db.from('inbound_items').update({ title, sku: sku || null, state: 'IDENTIFIED' }).eq('id', itemId);
      await db.from('inbound_pendings').update({ status: 'resolved', resolution: 'Identificado manualmente', resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', body.pending_id).eq('item_id', itemId).eq('status', 'open');
      await event(db, itemId, 'pending_resolved', before, { state: 'IDENTIFIED', title, sku: sku || null }, user.id);
      return jsonResponse({ ok: true, state: 'IDENTIFIED' });
    }
    return jsonResponse({ ok: false, error: 'Ação desconhecida.' }, 400);
  } catch (error) {
    console.error('inbound-workflow', error);
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : 'Falha no fluxo do SKU.' }, 400);
  }
});

async function event(db: ReturnType<typeof adminClient>, id: string, action: string, before: unknown, after: unknown, actor: string) {
  await db.from('inbound_events').insert({ entity_type: 'inbound_item', entity_id: id, action, before_data: before, after_data: after, actor_id: actor, source: 'workflow' });
}
async function movement(db: ReturnType<typeof adminClient>, before: Record<string, any>, state: string, type: string, actor: string, notes?: string, locationId?: string) {
  await db.from('inbound_stock_movements').insert({ item_id: before.id, variant_id: before.variant_id, location_id: locationId ?? before.location_id, movement_type: type, quantity: before.quantity, from_state: before.state, to_state: state, notes: notes ?? null, created_by: actor });
}