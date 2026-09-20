import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CURRENT_LEGAL_VERSION } from '@/lib/legalContent';
import { useAuth } from '@/hooks/useAuth';

const SESSION_KEY = 'legal-session-id';

export function getLegalSessionId() {
  let value = sessionStorage.getItem(SESSION_KEY);
  if (!value) {
    value = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, value);
  }
  return value;
}

export async function recordCurrentLegalAcceptance(source: 'signup' | 'login' | 'google' | 'reauthentication' | 'account') {
  return supabase.rpc('record_legal_acceptance', {
    p_terms_version: CURRENT_LEGAL_VERSION,
    p_privacy_version: CURRENT_LEGAL_VERSION,
    p_source: source,
    p_session_id: getLegalSessionId(),
    p_user_agent: navigator.userAgent,
  });
}

export function useLegalConsent() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [needsAcceptance, setNeedsAcceptance] = useState(false);

  const check = useCallback(async () => {
    if (!user) {
      setNeedsAcceptance(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('user_legal_consents')
      .select('document_key')
      .eq('user_id', user.id)
      .eq('document_version', CURRENT_LEGAL_VERSION)
      .in('document_key', ['terms', 'privacy']);
    setNeedsAcceptance(!error && new Set((data ?? []).map(item => item.document_key)).size < 2);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) void check();
  }, [authLoading, check]);

  const accept = useCallback(async () => {
    const { error } = await recordCurrentLegalAcceptance('reauthentication');
    if (!error) setNeedsAcceptance(false);
    return { error };
  }, []);

  return { loading: authLoading || loading, needsAcceptance, accept, refresh: check };
}