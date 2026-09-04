import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Mantém o painel sincronizado: ouve mudanças (Realtime) nas tabelas
 * informadas e invalida as queries do React Query cujos primeiros segmentos
 * batem com algum prefixo em `queryKeyPrefixes`. Também refaz fetch quando
 * a aba volta a ficar visível (fallback para quando o Realtime cai).
 */
export function useRealtimeInvalidator(
  tables: string[],
  queryKeyPrefixes: string[],
) {
  const qc = useQueryClient();
  const timerRef = useRef<number | null>(null);

  const invalidate = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      queryKeyPrefixes.forEach((prefix) => {
        qc.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === prefix,
        });
      });
    }, 600);
  };

  useEffect(() => {
    const channel = supabase.channel(`rt-invalidator-${tables.join('-')}`);
    tables.forEach((table) => {
      channel.on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        () => invalidate(),
      );
    });
    channel.subscribe();

    const onVisible = () => {
      if (document.visibilityState === 'visible') invalidate();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join('|'), queryKeyPrefixes.join('|')]);
}

/**
 * Versão com callback: assina Realtime nas tabelas e chama `onChange`
 * (com debounce) sempre que algo muda. Útil para hooks que não usam
 * React Query. Também dispara em visibilitychange.
 */
export function useRealtimeRefetch(
  tables: string[],
  onChange: () => void,
  enabled: boolean = true,
) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;
    let timer: number | null = null;
    const fire = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => cbRef.current(), 600);
    };

    const channel = supabase.channel(`rt-refetch-${tables.join('-')}-${Math.random().toString(36).slice(2, 8)}`);
    tables.forEach((table) => {
      channel.on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        () => fire(),
      );
    });
    channel.subscribe();

    const onVisible = () => {
      if (document.visibilityState === 'visible') fire();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join('|'), enabled]);
}