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
  const versions = await getCurrentLegalVersions();
  return supabase.rpc('record_legal_acceptance', {
    p_terms_version: versions.terms,
    p_privacy_version: versions.privacy,
    p_source: source,
    p_session_id: getLegalSessionId(),
    p_user_agent: navigator.userAgent,
  });
}

export async function getCurrentLegalVersions() {
  const { data } = await supabase.from('site_settings').select('key,value').in('key', ['legal_terms', 'legal_privacy']);
  const byKey = new Map((data ?? []).map(row => [row.key, row.value as { version?: string }]));
  return {
    terms: byKey.get('legal_terms')?.version || CURRENT_LEGAL_VERSION,
    privacy: byKey.get('legal_privacy')?.version || CURRENT_LEGAL_VERSION,
  };
}

export function useLegalConsent() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [versions, setVersions] = useState({ terms: CURRENT_LEGAL_VERSION, privacy: CURRENT_LEGAL_VERSION });

  const check = useCallback(async () => {
    if (!user) {
      setNeedsAcceptance(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const currentVersions = await getCurrentLegalVersions();
    setVersions(currentVersions);
    const { data, error } = await supabase
      .from('user_legal_consents')
      .select('document_key,document_version')
      .eq('user_id', user.id)
      .in('document_key', ['terms', 'privacy']);
    const accepted = new Set((data ?? []).map(item => `${item.document_key}:${item.document_version}`));
    setNeedsAcceptance(!error && (!accepted.has(`terms:${currentVersions.terms}`) || !accepted.has(`privacy:${currentVersions.privacy}`)));
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

  return { loading: authLoading || loading, needsAcceptance, versions, accept, refresh: check };
}