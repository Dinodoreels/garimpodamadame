import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteContent } from '@/hooks/useSiteContent';
import { useCookieConsent } from '@/hooks/useCookieConsent';

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    ttq: any;
  }
}

interface PixelsConfig {
  meta: {
    enabled: boolean;
    pixelId: string;
    conversionApiToken: string;
    events: Record<string, boolean>;
  };
  google_analytics: {
    enabled: boolean;
    measurementId: string;
    events: Record<string, boolean>;
  };
  tiktok: {
    enabled: boolean;
    pixelId: string;
    events: Record<string, boolean>;
  };
  gtm: {
    enabled: boolean;
    containerId: string;
  };
  custom: {
    enabled: boolean;
    script: string;
  };
}

function injectMetaPixel(pixelId: string) {
  if (document.getElementById('meta-pixel-script')) return;
  const script = document.createElement('script');
  script.id = 'meta-pixel-script';
  script.innerHTML = `
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
    n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
    s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init','${pixelId}');
  `;
  document.head.appendChild(script);
  const noscript = document.createElement('noscript');
  noscript.id = 'meta-pixel-noscript';
  const img = document.createElement('img');
  img.height = 1; img.width = 1; img.style.display = 'none';
  img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
  noscript.appendChild(img);
  document.body.appendChild(noscript);
}

function injectGA4(measurementId: string) {
  if (document.getElementById('ga4-script')) return;
  const s1 = document.createElement('script');
  s1.id = 'ga4-script';
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(s1);
  const s2 = document.createElement('script');
  s2.innerHTML = `
    window.dataLayer=window.dataLayer||[];
    function gtag(){dataLayer.push(arguments);}
    gtag('js',new Date());
    gtag('config','${measurementId}');
  `;
  document.head.appendChild(s2);
}

function injectTikTok(pixelId: string) {
  if (document.getElementById('tiktok-pixel-script')) return;
  const script = document.createElement('script');
  script.id = 'tiktok-pixel-script';
  script.innerHTML = `
    !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
    ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
    ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
    for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
    ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
    ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
    ttq._o=ttq._o||{};ttq._o[e]=n||{};
    var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
    var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
    ttq.load('${pixelId}');ttq.page()}(window,document,'ttq');
  `;
  document.head.appendChild(script);
}

function injectGTM(containerId: string) {
  if (document.getElementById('gtm-script')) return;
  const script = document.createElement('script');
  script.id = 'gtm-script';
  script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${containerId}');
  `;
  document.head.appendChild(script);
  const noscript = document.createElement('noscript');
  noscript.id = 'gtm-noscript';
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${containerId}`;
  iframe.height = '0'; iframe.width = '0';
  iframe.style.display = 'none'; iframe.style.visibility = 'hidden';
  noscript.appendChild(iframe);
  document.body.appendChild(noscript);
}

function injectCustomScript(script: string) {
  if (document.getElementById('custom-pixel-script')) return;
  const container = document.createElement('div');
  container.id = 'custom-pixel-script';
  container.innerHTML = script;
  const scripts = container.querySelectorAll('script');
  scripts.forEach(s => {
    const newScript = document.createElement('script');
    if (s.src) newScript.src = s.src;
    else newScript.innerHTML = s.innerHTML;
    s.getAttributeNames().forEach(attr => {
      if (attr !== 'src') newScript.setAttribute(attr, s.getAttribute(attr)!);
    });
    document.head.appendChild(newScript);
  });
  const nonScripts = container.querySelectorAll(':not(script)');
  nonScripts.forEach(el => document.head.appendChild(el));
}

// Map internal event names to platform-specific event names
const META_EVENT_MAP: Record<string, string> = {
  PageView: 'PageView', ViewContent: 'ViewContent', AddToCart: 'AddToCart',
  InitiateCheckout: 'InitiateCheckout', Purchase: 'Purchase',
};
const GA4_EVENT_MAP: Record<string, string> = {
  PageView: 'page_view', ViewContent: 'view_item', AddToCart: 'add_to_cart',
  InitiateCheckout: 'begin_checkout', Purchase: 'purchase',
};
const TIKTOK_EVENT_MAP: Record<string, string> = {
  PageView: 'PageVisit', ViewContent: 'ViewContent', AddToCart: 'AddToCart',
  InitiateCheckout: 'InitiateCheckout', Purchase: 'CompletePayment',
};

export function trackPixelEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  const preferences = JSON.parse(localStorage.getItem('cookie-preferences') || '{}');
  if (!preferences.analytics && !preferences.marketing) return;
  // Meta
  if (window.fbq) {
    const mapped = META_EVENT_MAP[eventName] || eventName;
    window.fbq('track', mapped, params);
  }
  // GA4
  if (window.gtag) {
    const mapped = GA4_EVENT_MAP[eventName] || eventName;
    window.gtag('event', mapped, params);
  }
  // TikTok
  if (window.ttq) {
    const mapped = TIKTOK_EVENT_MAP[eventName] || eventName;
    window.ttq.track(mapped, params);
  }
}

export function PixelProvider({ children }: { children: React.ReactNode }) {
  const { data } = useSiteContent<PixelsConfig>('pixels_config');
  const { hasConsented, preferences } = useCookieConsent();
  const location = useLocation();

  useEffect(() => {
    if (!data || !hasConsented) return;
    if (preferences.marketing && data.meta?.enabled && data.meta.pixelId) injectMetaPixel(data.meta.pixelId);
    if (preferences.analytics && data.google_analytics?.enabled && data.google_analytics.measurementId) injectGA4(data.google_analytics.measurementId);
    if (preferences.marketing && data.tiktok?.enabled && data.tiktok.pixelId) injectTikTok(data.tiktok.pixelId);
    if (preferences.analytics && data.gtm?.enabled && data.gtm.containerId) injectGTM(data.gtm.containerId);
    if (preferences.marketing && data.custom?.enabled && data.custom.script) injectCustomScript(data.custom.script);
  }, [data, hasConsented, preferences.analytics, preferences.marketing]);

  useEffect(() => {
    if (!data || !hasConsented) return;
    if (preferences.marketing && data.meta?.enabled && data.meta.pixelId && data.meta.events?.pageView && window.fbq) {
      window.fbq('track', 'PageView');
    }
    if (preferences.analytics && data.google_analytics?.enabled && data.google_analytics.measurementId && data.google_analytics.events?.page_view && window.gtag) {
      window.gtag('event', 'page_view', { page_path: location.pathname });
    }
    if (preferences.marketing && data.tiktok?.enabled && data.tiktok.pixelId && data.tiktok.events?.PageVisit && window.ttq) {
      window.ttq.page();
    }
  }, [location.pathname, data, hasConsented, preferences.analytics, preferences.marketing]);

  return <>{children}</>;
}
