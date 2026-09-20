import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CURRENT_COOKIE_VERSION } from '@/lib/legalContent';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = 'cookie-consent';
const COOKIE_PREFERENCES_KEY = 'cookie-preferences';
const COOKIE_VERSION_KEY = 'cookie-policy-version';
const COOKIE_SESSION_KEY = 'cookie-session-id';
const COOKIE_EVENT = 'cookie-consent-changed';

const defaultPreferences: CookiePreferences = {
  essential: true, // Always true, cannot be disabled
  analytics: false,
  marketing: false,
};

export function useCookieConsent() {
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const [showBanner, setShowBanner] = useState(false);

  // Load consent status on mount
  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    const savedVersion = localStorage.getItem(COOKIE_VERSION_KEY);

    if (consent === null || savedVersion !== CURRENT_COOKIE_VERSION) {
      // First visit - show banner
      setShowBanner(true);
      setHasConsented(null);
    } else {
      setHasConsented(consent === 'true');
      setShowBanner(false);
    }

    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences({ ...defaultPreferences, ...parsed, essential: true });
      } catch {
        setPreferences(defaultPreferences);
      }
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      const saved = localStorage.getItem(COOKIE_PREFERENCES_KEY);
      if (saved) setPreferences({ ...defaultPreferences, ...JSON.parse(saved), essential: true });
      setHasConsented(localStorage.getItem(COOKIE_CONSENT_KEY) === 'true');
    };
    const open = () => setShowBanner(true);
    window.addEventListener(COOKIE_EVENT, sync);
    window.addEventListener('open-cookie-settings', open);
    return () => {
      window.removeEventListener(COOKIE_EVENT, sync);
      window.removeEventListener('open-cookie-settings', open);
    };
  }, []);

  const persist = useCallback((updated: CookiePreferences, action: 'accept_all' | 'reject_optional' | 'customize') => {
    let sessionId = localStorage.getItem(COOKIE_SESSION_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(COOKIE_SESSION_KEY, sessionId);
    }
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(updated));
    localStorage.setItem(COOKIE_VERSION_KEY, CURRENT_COOKIE_VERSION);
    setPreferences(updated);
    setHasConsented(true);
    setShowBanner(false);
    window.dispatchEvent(new Event(COOKIE_EVENT));
    void supabase.rpc('record_cookie_consent', {
      p_session_id: sessionId,
      p_policy_version: CURRENT_COOKIE_VERSION,
      p_action: action,
      p_analytics: updated.analytics,
      p_marketing: updated.marketing,
      p_user_agent: navigator.userAgent,
    }).then(({ error }) => { if (error) console.warn('cookie consent audit failed', error); });
  }, []);

  const acceptAll = useCallback(() => {
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    persist(allAccepted, 'accept_all');
  }, [persist]);

  const rejectAll = useCallback(() => {
    const onlyEssential: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
    };
    persist(onlyEssential, 'reject_optional');
  }, [persist]);

  const savePreferences = useCallback((newPreferences: Partial<CookiePreferences>) => {
    const updated: CookiePreferences = {
      ...preferences,
      ...newPreferences,
      essential: true, // Always keep essential true
    };
    persist(updated, 'customize');
  }, [preferences, persist]);

  const openSettings = useCallback(() => {
    setShowBanner(true);
  }, []);

  const closeBanner = useCallback(() => {
    setShowBanner(false);
  }, []);

  return {
    hasConsented,
    preferences,
    showBanner,
    acceptAll,
    rejectAll,
    savePreferences,
    openSettings,
    closeBanner,
  };
}
