import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Fire welcome notification once per customer on first sign-in.
        // Run async + deferred so we never block auth state.
        if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          const uid = session.user.id;
          setTimeout(() => {
            (async () => {
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('welcomed_at')
                  .eq('id', uid)
                  .maybeSingle();
                if (profile && !profile.welcomed_at) {
                  await supabase
                    .from('profiles')
                    .update({ welcomed_at: new Date().toISOString() })
                    .eq('id', uid);
                  await supabase.functions.invoke('enqueue-notification', {
                    body: { type: 'welcome', userId: uid, stepIndex: 0, immediate: true },
                  });
                }
              } catch (e) {
                console.warn('welcome notification skipped', e);
              }
            })();
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: { full_name?: string; phone?: string }) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    return { error: result.error || null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword
  };
}