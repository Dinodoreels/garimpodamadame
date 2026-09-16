import { assertAdmin, callBling, corsHeaders, getSupabaseAdmin, jsonResponse } from "../_shared/bling.ts";

type Candidate = {
  title?: string | null;
  description?: string | null;
  product_type?: string | null;
  vendor?: string | null;
  manufacturer?: string | null;
  gtin?: string | null;
  price?: number | null;
  cost?: number | null;
  weight_grams?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  colors?: string[];
  sizes?: string[];
  images?: string[];
};

const text = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
const digits = (value: unknown, max = 14) => text(value, max).replace(/\D/g, "").slice(0, max);
const finite = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : null;

function imageUrls(raw: Record<string, any>) {
  const media = raw?.midia?.imagens ?? {};
  const rows = [
    ...(Array.isArray(media?.externas) ? media.externas : []),
    ...(Array.isArray(media?.internas) ? media.internas : []),
    ...(Array.isArray(media?.imagensURL) ? media.imagensURL : []),
    ...(Array.isArray(raw?.imagens) ? raw.imagens : []),
  ];
  return [...new Set(rows.flatMap((row: any) => typeof row === "string"
    ? [row]
    : [row?.link, row?.url, row?.linkMiniatura, row?.imagemURL])
    .map((value: unknown) => text(value, 2000))
    .filter((value: string) => /^https?:\/\//i.test(value)))].slice(0, 8);
}

function fromBling(raw: Record<string, any>): Candidate {
  const dimensions = raw?.dimensoes ?? {};
  return {
    title: text(raw?.nome, 120) || null,
    description: text(raw?.descricaoCurta ?? raw?.descricaoComplementar, 5000) || null,
    product_type: text(raw?.categoria?.descricao ?? raw?.categoria?.nome, 120) || null,
    vendor: text(raw?.marca?.nome ?? raw?.marca, 120) || null,
    manufacturer: text(raw?.fabricante?.nome ?? raw?.fabricante, 120) || null,
    gtin: digits(raw?.gtin),
    price: finite(raw?.preco),
    cost: finite(raw?.precoCusto),
    weight_grams: raw?.pesoLiquido == null ? null : finite(Number(raw.pesoLiquido) * 1000),
    length_cm: finite(dimensions?.profundidade),
    width_cm: finite(dimensions?.largura),
    height_cm: finite(dimensions?.altura),
    images: imageUrls(raw),
  };
}

async function lookupLocal(gtin: string): Promise<Candidate | null> {
  if (!gtin) return null;
  const db = getSupabaseAdmin();
  const { data } = await db.from("product_variants")
    .select("gtin, barcode, price, cost, products(title, description, product_type, vendor, manufacturer, weight_grams, length_cm, width_cm, height_cm, product_images(url, position))")
    .or(`gtin.eq.${gtin},barcode.eq.${gtin}`)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const product = data.products as unknown as Record<string, any> | null;
  if (!product) return null;
  return {
    title: product.title,
    description: product.description,
    product_type: product.product_type,
    vendor: product.vendor,
    manufacturer: product.manufacturer,
    gtin: data.gtin ?? data.barcode,
    price: finite(data.price),
    cost: finite(data.cost),
    weight_grams: finite(product.weight_grams),
    length_cm: finite(product.length_cm),
    width_cm: finite(product.width_cm),
    height_cm: finite(product.height_cm),
    images: (product.product_images ?? []).sort((a: any, b: any) => Number(a.position) - Number(b.position)).map((row: any) => row.url),
  };
}

async function lookupCosmos(gtin: string): Promise<Candidate | null> {
  const token = Deno.env.get("COSMOS_API_TOKEN");
  if (!gtin || !token) return null;
  const response = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${encodeURIComponent(gtin)}.json`, {
    headers: { "X-Cosmos-Token": token, "User-Agent": "Vanguard Store Catalog/1.0", Accept: "application/json" },
  });
  if (!response.ok) return null;
  const raw = await response.json();
  return {
    title: text(raw?.description ?? raw?.product?.description, 120) || null,
    product_type: text(raw?.ncm?.description ?? raw?.category?.description, 120) || null,
    vendor: text(raw?.brand?.name ?? raw?.brand, 120) || null,
    gtin,
    images: [raw?.thumbnail, raw?.image].filter((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value)),
  };
}

async function lookupBling(query: string, gtin: string): Promise<Candidate | null> {
  if (!query && !gtin) return null;
  const response = await callBling({ path: "/produtos", query: { criterio: gtin || query, limite: 20 } });
  if (response.status >= 400) return null;
  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  if (!rows.length) return null;
  let selected = rows.find((row: any) => digits(row?.gtin) === gtin || digits(row?.codigo) === gtin) ?? rows[0];
  if (selected?.id) {
    const detail = await callBling({ path: `/produtos/${selected.id}` });
    if (detail.status < 400 && detail.data?.data) selected = detail.data.data;
  }
  return fromBling(selected);
}

async function readResponseStream(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === "response.output_text.delta") output += event.delta ?? "";
      } catch {
        // Ignore non-JSON keepalive events.
      }
    }
  }
  return output;
}

async function analyzeWithAi(input: Record<string, unknown>, categories: string[]): Promise<Candidate | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("A análise por foto não está configurada.");
  const image = text(input.image_data_url, 8_000_000);
  const current = {
    title: text(input.title, 120),
    description: text(input.description, 5000),
    product_type: text(input.product_type, 120),
    vendor: text(input.vendor, 120),
    gtin: digits(input.gtin),
  };
  const content: Record<string, unknown>[] = [{
    type: "input_text",
    text: `Analise o produto e devolva sugestões comerciais em JSON. Use somente o que estiver visível ou informado. Não invente marca, código de barras, preço, custo, peso, dimensões, dados fiscais, certificações ou tamanhos. Categorias permitidas: ${categories.join(", ")}. Dados atuais: ${JSON.stringify(current)}.`,
  }];
  if (image) content.push({ type: "input_image", image_url: image, detail: "high" });
  const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      reasoning: { effort: "low", summary: "auto" },
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "product_suggestions",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: ["string", "null"] },
              description: { type: ["string", "null"] },
              product_type: { type: ["string", "null"] },
              vendor: { type: ["string", "null"] },
              colors: { type: "array", items: { type: "string" } },
              sizes: { type: "array", items: { type: "string" } },
            },
            required: ["title", "description", "product_type", "vendor", "colors", "sizes"],
          },
        },
      },
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    const error = new Error(message || "Falha na análise por foto.");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  const output = await readResponseStream(response);
  return output ? JSON.parse(output) : null;
}

function mergeCandidates(entries: Array<{ source: string; data: Candidate | null }>) {
  const merged: Candidate = {};
  const sources: Record<string, string> = {};
  const scalarKeys: Array<keyof Candidate> = ["title", "description", "product_type", "vendor", "manufacturer", "gtin", "price", "cost", "weight_grams", "length_cm", "width_cm", "height_cm"];
  for (const entry of entries) {
    if (!entry.data) continue;
    for (const key of scalarKeys) {
      const value = entry.data[key];
      if ((merged[key] == null || merged[key] === "") && value != null && value !== "") {
        (merged as Record<string, unknown>)[key] = value;
        sources[String(key)] = entry.source;
      }
    }
    for (const key of ["colors", "sizes", "images"] as const) {
      if (!merged[key]?.length && entry.data[key]?.length) {
        merged[key] = entry.data[key];
        sources[key] = entry.source;
      }
    }
  }
  return { suggestions: merged, sources };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await assertAdmin(req);
    const body = await req.json().catch(() => ({}));
    const gtin = digits(body?.gtin);
    const title = text(body?.title, 120);
    const imageDataUrl = text(body?.image_data_url, 8_000_000);
    if (!gtin && !title && !imageDataUrl) return jsonResponse({ error: "Adicione uma foto, código de barras ou título." }, 400);

    const db = getSupabaseAdmin();
    const { data: categoryRows } = await db.from("product_categories").select("value").order("position");
    const categories = (categoryRows ?? []).map((row: { value: string }) => row.value);
    const warnings: string[] = [];
    const settled = await Promise.allSettled([
      lookupLocal(gtin),
      lookupBling(title, gtin),
      lookupCosmos(gtin),
      analyzeWithAi({ ...body, image_data_url: imageDataUrl }, categories),
    ]);
    const names = ["Catálogo", "Bling/plataformas", "Código de barras", "Foto/IA"];
    settled.forEach((result, index) => {
      if (result.status === "rejected") warnings.push(`${names[index]}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    });
    const candidate = (index: number) => settled[index].status === "fulfilled" ? settled[index].value : null;
    const merged = mergeCandidates([
      { source: "Catálogo", data: candidate(0) },
      { source: "Bling/plataformas", data: candidate(1) },
      { source: "Código de barras", data: candidate(2) },
      { source: "Foto/IA", data: candidate(3) },
    ]);
    const foundSources = [...new Set(Object.values(merged.sources))];
    if (!Object.keys(merged.suggestions).length) return jsonResponse({ error: "Nenhuma informação confiável foi encontrada.", warnings }, 404);
    return jsonResponse({ ...merged, found_sources: foundSources, warnings, needs_review: true });
  } catch (error) {
    if (error instanceof Response) return error;
    const status = (error as Error & { status?: number }).status;
    return jsonResponse({ error: error instanceof Error ? error.message : "Falha no preenchimento automático." }, status && [400, 401, 402, 403, 429].includes(status) ? status : 500);
  }
});