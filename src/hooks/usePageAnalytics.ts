import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCookieConsent } from './useCookieConsent';

const SESSION_KEY = 'pi-session-id';
const UTM_KEY = 'pi-utm-params';

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Other';
}

function getUTMParams(): UTMParams {
  const stored = sessionStorage.getItem(UTM_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Continue to check URL
    }
  }

  const params = new URLSearchParams(window.location.search);
  const utm: UTMParams = {};

  if (params.get('utm_source')) utm.utm_source = params.get('utm_source')!;
  if (params.get('utm_medium')) utm.utm_medium = params.get('utm_medium')!;
  if (params.get('utm_campaign')) utm.utm_campaign = params.get('utm_campaign')!;
  if (params.get('utm_content')) utm.utm_content = params.get('utm_content')!;
  if (params.get('utm_term')) utm.utm_term = params.get('utm_term')!;

  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  }

  return utm;
}

function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function usePageAnalytics() {
  const location = useLocation();
  const { preferences, hasConsented } = useCookieConsent();
  const isFirstPageView = useRef(true);
  const lastTrackedPath = useRef<string | null>(null);

  const trackPageView = useCallback(async () => {
    // Only track if user has consented to analytics
    if (!hasConsented || !preferences.analytics) {
      return;
    }

    const currentPath = location.pathname;
    
    // Avoid duplicate tracking
    if (lastTrackedPath.current === currentPath) {
      return;
    }
    lastTrackedPath.current = currentPath;

    const sessionId = getOrCreateSessionId();
    const utmParams = getUTMParams();
    const deviceType = getDeviceType();
    const browser = getBrowser();

    try {
      // Get current user if logged in - non-blocking
      let userId: string | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      } catch {
        // Auth check failed, continue without user
      }

      // Track page view - fire and forget
      supabase.from('page_views').insert({
        session_id: sessionId,
        user_id: userId,
        page_path: currentPath,
        page_title: document.title,
        referrer: document.referrer || null,
        utm_source: utmParams.utm_source || null,
        utm_medium: utmParams.utm_medium || null,
        utm_campaign: utmParams.utm_campaign || null,
        utm_content: utmParams.utm_content || null,
        utm_term: utmParams.utm_term || null,
        device_type: deviceType,
        browser: browser,
      }).then(({ error }) => {
        if (error) console.warn('Analytics: page_view insert failed silently');
      });

      // On first page view, also create/update session
      if (isFirstPageView.current) {
        isFirstPageView.current = false;

        supabase.from('user_sessions').upsert(
          {
            session_id: sessionId,
            user_id: userId,
            landing_page: currentPath,
            referrer: document.referrer || null,
            utm_source: utmParams.utm_source || null,
            utm_medium: utmParams.utm_medium || null,
            utm_campaign: utmParams.utm_campaign || null,
            device_type: deviceType,
            browser: browser,
            last_activity_at: new Date().toISOString(),
          },
          { onConflict: 'session_id' }
        ).then(({ error }) => {
          if (error) console.warn('Analytics: session upsert failed silently');
        });
      } else {
        supabase
          .from('user_sessions')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('session_id', sessionId)
          .then(({ error }) => {
            if (error) console.warn('Analytics: session update failed silently');
          });
      }
    } catch {
      // Analytics should never block the app
    }
  }, [location.pathname, preferences.analytics, hasConsented]);

  // Track page views on route change
  useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  return { trackPageView };
}
