import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../integrations/supabase/client';
import type { Database } from '../../integrations/supabase/types';
import type { CircleMessageRow, ConversationTransport } from './conversationGateway';

const SELECT_COLUMNS = 'id,circle_id,sender_user_id,body,created_at';

export function createSupabaseConversationTransport(
  client: SupabaseClient<Database> = supabase,
): ConversationTransport {
  return {
    async list(circleId) {
      const { data, error } = await client
        .from('circle_messages')
        .select(SELECT_COLUMNS)
        .eq('circle_id', circleId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CircleMessageRow[];
    },

    async insert(payload) {
      const { data, error } = await client
        .from('circle_messages')
        .insert(payload)
        .select(SELECT_COLUMNS)
        .single();
      if (error) throw error;
      return data as CircleMessageRow;
    },

    subscribe(circleId, handler) {
      const channel = client
        .channel(`circle-messages:${circleId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'circle_messages',
            filter: `circle_id=eq.${circleId}`,
          },
          (payload) => handler(payload.new as CircleMessageRow),
        )
        .subscribe();

      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}
