import { useState, useEffect, useCallback } from 'react';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = 'cookie-consent';
const COOKIE_PREFERENCES_KEY = 'cookie-preferences';

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

    if (consent === null) {
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

  const acceptAll = useCallback(() => {
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(allAccepted));
    setPreferences(allAccepted);
    setHasConsented(true);
    setShowBanner(false);
  }, []);

  const rejectAll = useCallback(() => {
    const onlyEssential: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(onlyEssential));
    setPreferences(onlyEssential);
    setHasConsented(true);
    setShowBanner(false);
  }, []);

  const savePreferences = useCallback((newPreferences: Partial<CookiePreferences>) => {
    const updated: CookiePreferences = {
      ...preferences,
      ...newPreferences,
      essential: true, // Always keep essential true
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(updated));
    setPreferences(updated);
    setHasConsented(true);
    setShowBanner(false);
  }, [preferences]);

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
