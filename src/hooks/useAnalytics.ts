import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, endOfDay, format, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

export type AnalyticsPeriod = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface AnalyticsRange {
  start: Date;
  end: Date;
}

export interface AnalyticsMetric {
  label: string;
  value: number;
  previousValue: number;
  change: number;
  format: 'number' | 'decimal' | 'percent';
}

export interface AnalyticsKpis {
  uniqueVisitors: AnalyticsMetric;
  pageViews: AnalyticsMetric;
  sessions: AnalyticsMetric;
  pagesPerSession: AnalyticsMetric;
  conversionRate: AnalyticsMetric;
  bounceRate: AnalyticsMetric;
}

export interface AnalyticsBreakdownItem {
  name: string;
  value: number;
  percent: number;
}

export interface TopPageItem {
  path: string;
  views: number;
  exits: number;
  exitRate: number;
}

export interface CampaignItem {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
}

export interface DailyAnalyticsItem {
  date: string;
  views: number;
  sessions: number;
}

export interface FunnelStep {
  label: string;
  value: number;
  rate: number;
}

export interface CommerceFunnel {
  cartSessions: number;
  ordersCreated: number;
  ordersPaid: number;
}

export interface TopViewedProduct {
  id: string;
  handle: string;
  title: string;
  image: string | null;
  price: number;
  stock: number;
  views: number;
  uniqueViewers: number;
  cartSessions: number;
  checkoutOrders: number;
  paidOrders: number;
}

export interface AnalyticsData {
  rangeLabel: string;
  kpis: AnalyticsKpis;
  liveVisitors: number;
  daily: DailyAnalyticsItem[];
  trafficSources: AnalyticsBreakdownItem[];
  devices: AnalyticsBreakdownItem[];
  browsers: AnalyticsBreakdownItem[];
  hourlyTraffic: AnalyticsBreakdownItem[];
  topPages: TopPageItem[];
  campaigns: CampaignItem[];
  topReferrers: AnalyticsBreakdownItem[];
  funnel: FunnelStep[];
  topProducts: TopViewedProduct[];
  commerceFunnel: CommerceFunnel;
}

type PageViewRow = {
  session_id: string;
  user_id: string | null;
  page_path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  browser: string | null;
  created_at: string;
};

type SessionRow = {
  session_id: string;
  user_id: string | null;
  landing_page: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  browser: string | null;
  started_at: string;
  last_activity_at: string;
};

type OrderRow = {
  id: string;
  paid_at: string | null;
  created_at: string;
  status: string;
};

function calculateChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function getRange(period: AnalyticsPeriod, customRange?: AnalyticsRange) {
  const today = new Date();

  if (period === 'today') {
    return { start: startOfDay(today), end: endOfDay(today) };
  }

  if (period === 'custom' && customRange) {
    return { start: startOfDay(customRange.start), end: endOfDay(customRange.end) };
  }

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return {
    start: startOfDay(subDays(today, days - 1)),
    end: endOfDay(today),
  };
}

function getPreviousRange(current: AnalyticsRange): AnalyticsRange {
  const days = differenceInCalendarDays(current.end, current.start) + 1;
  const previousEnd = endOfDay(subDays(current.start, 1));
  const previousStart = startOfDay(subDays(current.start, days));
  return { start: previousStart, end: previousEnd };
}

function safeHostname(url: string | null | undefined) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function getSourceLabel(session: Pick<SessionRow, 'utm_source' | 'referrer'>) {
  if (session.utm_source) return session.utm_source;
  return safeHostname(session.referrer) || 'Direto';
}

function getPercent(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function normalizeDevice(device: string | null) {
  if (device === 'mobile') return 'Mobile';
  if (device === 'desktop') return 'Desktop';
  if (device === 'tablet') return 'Tablet';
  return 'Outro';
}

function normalizeBrowser(browser: string | null) {
  if (!browser) return 'Outros';
  const map: Record<string, string> = {
    Chrome: 'Chrome',
    Safari: 'Safari',
    Firefox: 'Firefox',
    Edge: 'Edge',
    Opera: 'Opera',
  };
  return map[browser] || 'Outros';
}

function toBreakdown(record: Record<string, number>, limit?: number): AnalyticsBreakdownItem[] {
  const total = Object.values(record).reduce((sum, value) => sum + value, 0);
  const items = Object.entries(record)
    .map(([name, value]) => ({ name, value, percent: getPercent(value, total) }))
    .sort((a, b) => b.value - a.value);

  return typeof limit === 'number' ? items.slice(0, limit) : items;
}

function isPaidOrder(order: OrderRow) {
  return Boolean(order.paid_at || ['paid', 'shipped', 'delivered'].includes(order.status));
}

function getOrderReferenceDate(order: OrderRow) {
  return new Date(order.paid_at || order.created_at).getTime();
}

function buildMetrics(pageViews: PageViewRow[], sessions: SessionRow[], orders: OrderRow[]): AnalyticsKpis {
  const visitorKeys = new Set(sessions.map((session) => session.user_id || session.session_id));
  const sessionsCount = sessions.length;
  const pageViewsCount = pageViews.length;
  const pageViewsPerSession = new Map<string, number>();

  pageViews.forEach((view) => {
    pageViewsPerSession.set(view.session_id, (pageViewsPerSession.get(view.session_id) || 0) + 1);
  });

  const singlePageSessions = sessions.filter((session) => (pageViewsPerSession.get(session.session_id) || 0) <= 1).length;
  const paidOrders = orders.filter(isPaidOrder).length;

  const makeMetric = (label: string, value: number, previousValue: number, formatType: AnalyticsMetric['format']): AnalyticsMetric => ({
    label,
    value,
    previousValue,
    change: calculateChange(value, previousValue),
    format: formatType,
  });

  const previousVisitorKeys = new Set<string>();
  const previousPageViewsCount = 0;
  const previousSessionsCount = 0;
  const previousPagesPerSession = 0;
  const previousConversionRate = 0;
  const previousBounceRate = 0;

  return {
    uniqueVisitors: makeMetric('Visitantes únicos', visitorKeys.size, previousVisitorKeys.size, 'number'),
    pageViews: makeMetric('Visualizações', pageViewsCount, previousPageViewsCount, 'number'),
    sessions: makeMetric('Sessões', sessionsCount, previousSessionsCount, 'number'),
    pagesPerSession: makeMetric('Páginas / sessão', sessionsCount > 0 ? pageViewsCount / sessionsCount : 0, previousPagesPerSession, 'decimal'),
    conversionRate: makeMetric('Taxa de conversão', sessionsCount > 0 ? (paidOrders / sessionsCount) * 100 : 0, previousConversionRate, 'percent'),
    bounceRate: makeMetric('Bounce rate', sessionsCount > 0 ? (singlePageSessions / sessionsCount) * 100 : 0, previousBounceRate, 'percent'),
  };
}

function mergeMetrics(current: AnalyticsKpis, previous: AnalyticsKpis): AnalyticsKpis {
  const attach = (currentMetric: AnalyticsMetric, previousMetric: AnalyticsMetric): AnalyticsMetric => ({
    ...currentMetric,
    previousValue: previousMetric.value,
    change: calculateChange(currentMetric.value, previousMetric.value),
  });

  return {
    uniqueVisitors: attach(current.uniqueVisitors, previous.uniqueVisitors),
    pageViews: attach(current.pageViews, previous.pageViews),
    sessions: attach(current.sessions, previous.sessions),
    pagesPerSession: attach(current.pagesPerSession, previous.pagesPerSession),
    conversionRate: attach(current.conversionRate, previous.conversionRate),
    bounceRate: attach(current.bounceRate, previous.bounceRate),
  };
}

function buildAnalyticsData(pageViews: PageViewRow[], sessions: SessionRow[], orders: OrderRow[]): Omit<AnalyticsData, 'rangeLabel' | 'liveVisitors'> {
  const dailyMap: Record<string, { views: number; sessions: Set<string> }> = {};
  const sourceMap: Record<string, number> = {};
  const deviceMap: Record<string, number> = {};
  const browserMap: Record<string, number> = {};
  const hourlyMap: Record<string, number> = Object.fromEntries(Array.from({ length: 24 }, (_, hour) => [String(hour).padStart(2, '0'), 0]));
  const pageMap: Record<string, number> = {};
  const exitMap: Record<string, number> = {};
  const campaignMap: Record<string, number> = {};
  const referrerMap: Record<string, number> = {};
  const viewsBySession = new Map<string, PageViewRow[]>();

  sessions.forEach((session) => {
    const source = getSourceLabel(session);
    sourceMap[source] = (sourceMap[source] || 0) + 1;

    const device = normalizeDevice(session.device_type);
    deviceMap[device] = (deviceMap[device] || 0) + 1;

    const browser = normalizeBrowser(session.browser);
    browserMap[browser] = (browserMap[browser] || 0) + 1;

    const hour = format(new Date(session.started_at), 'HH');
    hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;

    if (session.utm_campaign) {
      const key = `${session.utm_source || 'Direto'}|${session.utm_medium || '—'}|${session.utm_campaign}`;
      campaignMap[key] = (campaignMap[key] || 0) + 1;
    }

    const hostname = safeHostname(session.referrer);
    const currentHost = typeof window !== 'undefined' ? window.location.hostname.replace(/^www\./, '') : '';
    if (hostname && hostname !== currentHost && !hostname.includes('id-preview--') && !hostname.includes('storenatalhapardal.lovable.app')) {
      referrerMap[hostname] = (referrerMap[hostname] || 0) + 1;
    }
  });

  pageViews.forEach((view) => {
    const dayKey = format(new Date(view.created_at), 'dd/MM', { locale: ptBR });
    if (!dailyMap[dayKey]) dailyMap[dayKey] = { views: 0, sessions: new Set() };
    dailyMap[dayKey].views += 1;
    dailyMap[dayKey].sessions.add(view.session_id);

    pageMap[view.page_path] = (pageMap[view.page_path] || 0) + 1;

    const list = viewsBySession.get(view.session_id) || [];
    list.push(view);
    viewsBySession.set(view.session_id, list);
  });

  viewsBySession.forEach((sessionViews) => {
    sessionViews.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const lastView = sessionViews[sessionViews.length - 1];
    if (lastView) {
      exitMap[lastView.page_path] = (exitMap[lastView.page_path] || 0) + 1;
    }
  });

  const topPages = Object.entries(pageMap)
    .map(([path, views]) => {
      const exits = exitMap[path] || 0;
      return { path, views, exits, exitRate: getPercent(exits, views) };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const campaignData = Object.entries(campaignMap)
    .map(([key, sessionsValue]) => {
      const [source, medium, campaign] = key.split('|');
      return { source, medium, campaign, sessions: sessionsValue };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  const totalSessions = sessions.length;
  const productSessions = new Set(pageViews.filter((view) => view.page_path.startsWith('/product/')).map((view) => view.session_id));
  const checkoutSessions = new Set(pageViews.filter((view) => view.page_path.startsWith('/checkout')).map((view) => view.session_id));
  const paidOrders = orders.filter(isPaidOrder).length;

  return {
    kpis: buildMetrics(pageViews, sessions, orders),
    daily: Object.entries(dailyMap).map(([date, item]) => ({ date, views: item.views, sessions: item.sessions.size })),
    trafficSources: toBreakdown(sourceMap, 6),
    devices: toBreakdown(deviceMap),
    browsers: toBreakdown(browserMap),
    hourlyTraffic: toBreakdown(hourlyMap),
    topPages,
    campaigns: campaignData,
    topReferrers: toBreakdown(referrerMap, 10),
    funnel: [
      { label: 'Visitantes', value: totalSessions, rate: 100 },
      { label: 'Viu produto', value: productSessions.size, rate: getPercent(productSessions.size, totalSessions) },
      { label: 'Checkout', value: checkoutSessions.size, rate: getPercent(checkoutSessions.size, totalSessions) },
      { label: 'Pagamento', value: paidOrders, rate: getPercent(paidOrders, totalSessions) },
    ],
    topProducts: [],
    commerceFunnel: {
      cartSessions: checkoutSessions.size,
      ordersCreated: orders.length,
      ordersPaid: paidOrders,
    },
  };
}

async function fetchAnalyticsWindowData(windowRange: AnalyticsRange) {
  const [pageViewsResult, sessionsResult, ordersResult] = await Promise.all([
    supabase
      .from('page_views')
      .select('session_id, user_id, page_path, referrer, utm_source, utm_medium, utm_campaign, device_type, browser, created_at')
      .gte('created_at', windowRange.start.toISOString())
      .lte('created_at', windowRange.end.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('user_sessions')
      .select('session_id, user_id, landing_page, referrer, utm_source, utm_medium, utm_campaign, device_type, browser, started_at, last_activity_at')
      .gte('started_at', windowRange.start.toISOString())
      .lte('started_at', windowRange.end.toISOString())
      .order('started_at', { ascending: true }),
    supabase
      .from('orders')
      .select('id, paid_at, created_at, status')
      .or(`and(paid_at.gte.${windowRange.start.toISOString()},paid_at.lte.${windowRange.end.toISOString()}),and(created_at.gte.${windowRange.start.toISOString()},created_at.lte.${windowRange.end.toISOString()},status.in.(paid,shipped,delivered))`),
  ]);

  if (pageViewsResult.error) throw pageViewsResult.error;
  if (sessionsResult.error) throw sessionsResult.error;
  if (ordersResult.error) throw ordersResult.error;

  return {
    pageViews: (pageViewsResult.data || []) as PageViewRow[],
    sessions: (sessionsResult.data || []) as SessionRow[],
    orders: (ordersResult.data || []) as OrderRow[],
  };
}

function isWithinRange(dateValue: string, range: AnalyticsRange) {
  const time = new Date(dateValue).getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

async function fetchTopViewedProducts(
  pageViews: PageViewRow[],
  orders: OrderRow[],
): Promise<TopViewedProduct[]> {
  const stats = new Map<string, { views: number; viewers: Set<string>; sessions: Set<string> }>();
  const checkoutSessions = new Set<string>();
  for (const view of pageViews) {
    if (view.page_path?.startsWith('/checkout')) {
      if (view.session_id) checkoutSessions.add(view.session_id);
    }
  }
  for (const view of pageViews) {
    if (!view.page_path?.startsWith('/product/')) continue;
    const handle = decodeURIComponent(view.page_path.replace('/product/', '').split('?')[0].split('/')[0]);
    if (!handle) continue;
    const entry = stats.get(handle) || { views: 0, viewers: new Set<string>(), sessions: new Set<string>() };
    entry.views += 1;
    entry.viewers.add(view.user_id || view.session_id);
    if (view.session_id) entry.sessions.add(view.session_id);
    stats.set(handle, entry);
  }

  const ranked = Array.from(stats.entries())
    .map(([handle, s]) => {
      let cartSessions = 0;
      s.sessions.forEach((sid) => { if (checkoutSessions.has(sid)) cartSessions += 1; });
      return { handle, views: s.views, uniqueViewers: s.viewers.size, cartSessions };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  if (ranked.length === 0) return [];

  const handles = ranked.map((r) => r.handle);
  const [productsResult, imagesResult, variantsResult] = await Promise.all([
    supabase.from('products').select('id, handle, title, price').in('handle', handles),
    supabase.from('product_images').select('product_id, url, position').order('position', { ascending: true }),
    supabase.from('product_variants').select('product_id, inventory_quantity'),
  ]);

  const products = productsResult.data || [];
  const productByHandle = new Map(products.map((p: any) => [p.handle, p]));
  const productIds = new Set(products.map((p: any) => p.id));

  const imageByProduct = new Map<string, string>();
  (imagesResult.data || []).forEach((img: any) => {
    if (!productIds.has(img.product_id)) return;
    if (!imageByProduct.has(img.product_id)) imageByProduct.set(img.product_id, img.url);
  });

  const stockByProduct = new Map<string, number>();
  (variantsResult.data || []).forEach((v: any) => {
    if (!productIds.has(v.product_id)) return;
    stockByProduct.set(v.product_id, (stockByProduct.get(v.product_id) || 0) + (v.inventory_quantity || 0));
  });

  // Per-product order counts within current period
  const checkoutByProduct = new Map<string, Set<string>>();
  const paidByProduct = new Map<string, Set<string>>();
  const orderIds = orders.map((o) => o.id);
  const productIdArray = Array.from(productIds) as string[];
  if (orderIds.length > 0 && productIdArray.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, product_id')
      .in('order_id', orderIds)
      .in('product_id', productIdArray);
    const orderById = new Map(orders.map((o) => [o.id, o]));
    const paidStatuses = new Set(['paid', 'shipped', 'delivered']);
    (items || []).forEach((it: any) => {
      if (!it.product_id) return;
      const order = orderById.get(it.order_id);
      if (!order) return;
      if (!checkoutByProduct.has(it.product_id)) checkoutByProduct.set(it.product_id, new Set());
      checkoutByProduct.get(it.product_id)!.add(it.order_id);
      if (order.paid_at || paidStatuses.has(order.status)) {
        if (!paidByProduct.has(it.product_id)) paidByProduct.set(it.product_id, new Set());
        paidByProduct.get(it.product_id)!.add(it.order_id);
      }
    });
  }

  return ranked
    .map((r) => {
      const p: any = productByHandle.get(r.handle);
      if (!p) return null;
      return {
        id: p.id,
        handle: p.handle,
        title: p.title,
        image: imageByProduct.get(p.id) || null,
        price: Number(p.price) || 0,
        stock: stockByProduct.get(p.id) || 0,
        views: r.views,
        uniqueViewers: r.uniqueViewers,
        cartSessions: r.cartSessions,
        checkoutOrders: checkoutByProduct.get(p.id)?.size || 0,
        paidOrders: paidByProduct.get(p.id)?.size || 0,
      } as TopViewedProduct;
    })
    .filter((x): x is TopViewedProduct => x !== null);
}

export function useAnalytics(period: AnalyticsPeriod = '7d', customRange?: AnalyticsRange, enabled = true) {
  const range = useMemo(() => getRange(period, customRange), [period, customRange]);
  const previousRange = useMemo(() => getPreviousRange(range), [range]);
  const periodKey = period === 'custom'
    ? `custom:${range.start.toISOString()}:${range.end.toISOString()}`
    : period;

  const analyticsQuery = useQuery({
    queryKey: ['analytics-dashboard', periodKey],
    enabled,
    queryFn: async (): Promise<AnalyticsData> => {
      const windowRange = { start: previousRange.start, end: range.end };
      const windowData = await fetchAnalyticsWindowData(windowRange);

      const current = {
        pageViews: windowData.pageViews.filter((item) => isWithinRange(item.created_at, range)),
        sessions: windowData.sessions.filter((item) => isWithinRange(item.started_at, range)),
        orders: windowData.orders.filter((item) => {
          const referenceDate = new Date(item.paid_at || item.created_at).toISOString();
          return isWithinRange(referenceDate, range);
        }),
      };

      const previous = {
        pageViews: windowData.pageViews.filter((item) => isWithinRange(item.created_at, previousRange)),
        sessions: windowData.sessions.filter((item) => isWithinRange(item.started_at, previousRange)),
        orders: windowData.orders.filter((item) => {
          const referenceDate = new Date(item.paid_at || item.created_at).toISOString();
          return isWithinRange(referenceDate, previousRange);
        }),
      };

      const currentData = buildAnalyticsData(current.pageViews, current.sessions, current.orders);
      const previousData = buildAnalyticsData(previous.pageViews, previous.sessions, previous.orders);

      const topProducts = await fetchTopViewedProducts(current.pageViews, current.orders);

      return {
        ...currentData,
        rangeLabel: `${format(range.start, 'dd/MM/yyyy')} — ${format(range.end, 'dd/MM/yyyy')}`,
        liveVisitors: 0,
        kpis: mergeMetrics(currentData.kpis, previousData.kpis),
        topProducts,
      };
    },
  });

  const liveVisitorsQuery = useQuery({
    queryKey: ['analytics-live-visitors'],
    enabled,
    queryFn: async () => {
      const threshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('user_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('last_activity_at', threshold);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  return {
    ...analyticsQuery,
    data: analyticsQuery.data
      ? {
          ...analyticsQuery.data,
          liveVisitors: liveVisitorsQuery.data || 0,
        }
      : undefined,
    isLoading: analyticsQuery.isLoading,
    refetchAll: async () => {
      await Promise.all([analyticsQuery.refetch(), liveVisitorsQuery.refetch()]);
    },
  };
}
