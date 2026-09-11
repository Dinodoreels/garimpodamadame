import { supabase } from '@/integrations/supabase/client';
import type { InboundEvent } from './types';

export interface AuditService {
  log(input: {
    entityType: string;
    entityId?: string | null;
    action: string;
    before?: unknown;
    after?: unknown;
  }): Promise<void>;
  list(entityType: string, entityId: string): Promise<InboundEvent[]>;
}

export const auditService: AuditService = {
  async log({ entityType, entityId, action, before, after }) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from('inbound_events').insert({
      entity_type: entityType,
      entity_id: entityId ?? null,
      action,
      before_data: (before ?? null) as never,
      after_data: (after ?? null) as never,
      actor_id: auth.user.id,
      source: 'app',
    });
  },

  async list(entityType, entityId) {
    const { data, error } = await supabase
      .from('inbound_events')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data || []) as InboundEvent[];
  },
};
