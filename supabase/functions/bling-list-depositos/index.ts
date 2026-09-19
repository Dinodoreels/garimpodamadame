import { assertAdmin, blingError, callBling, corsHeaders, jsonResponse } from "../_shared/bling.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const [dep, lojas] = await Promise.all([
      callBling({ path: "/depositos", query: { limite: 100 } }),
      callBling({ path: "/canais-venda", query: { limite: 100 } }).catch(() => ({ status: 200, data: { data: [] } })),
    ]);
    if (dep.status >= 400) return jsonResponse({ error: blingError(dep.status, dep.data) }, dep.status);
    return jsonResponse({
      depositos: (dep.data?.data ?? []).map((d: any) => ({ id: String(d.id), name: d.descricao ?? d.nome ?? `Depósito ${d.id}` })),
      canais: (lojas.data?.data ?? []).map((l: any) => ({
        id: String(l.id),
        name: l.descricao ?? l.nome ?? `Canal ${l.id}`,
        type: l.tipoIntegracao ?? l.tipo ?? null,
        situation: l.situacao ?? null,
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
