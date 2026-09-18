import { useCallback, useEffect, useMemo, useState } from 'react';
import { createConversationGateway, type CircleMessage } from './conversationGateway';
import { createSupabaseConversationTransport } from './SupabaseConversationTransport';

export type SharedConversationStatus = 'unavailable' | 'loading' | 'ready' | 'error';

function mergeMessages(
  current: readonly CircleMessage[],
  incoming: readonly CircleMessage[],
): CircleMessage[] {
  const byId = new Map(current.map((message) => [message.id, message] as const));
  for (const message of incoming) byId.set(message.id, message);
  return Array.from(byId.values()).sort((left, right) => {
    const byTime = left.createdAt.localeCompare(right.createdAt);
    return byTime !== 0 ? byTime : left.id.localeCompare(right.id);
  });
}

export function useSharedConversation(circleId?: string) {
  const gateway = useMemo(
    () => createConversationGateway(createSupabaseConversationTransport()),
    [],
  );
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [status, setStatus] = useState<SharedConversationStatus>(
    circleId ? 'loading' : 'unavailable',
  );
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!circleId) {
      setMessages([]);
      setStatus('unavailable');
      setError(undefined);
      return;
    }

    let active = true;
    setMessages([]);
    setStatus('loading');
    setError(undefined);

    const unsubscribe = gateway.subscribe(circleId, (message) => {
      if (active) setMessages((current) => mergeMessages(current, [message]));
    });

    void gateway.list(circleId)
      .then((rehydrated) => {
        if (!active) return;
        setMessages((current) => mergeMessages(current, rehydrated));
        setStatus('ready');
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setStatus('error');
        setError(
          reason instanceof Error
            ? reason.message
            : 'Could not load the shared Campfire conversation.',
        );
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [circleId, gateway]);

  const send = useCallback(async (body: string) => {
    if (!circleId) throw new Error('SHARED_CONVERSATION_UNAVAILABLE');
    const message = await gateway.send(circleId, body);
    setMessages((current) => mergeMessages(current, [message]));
    return message;
  }, [circleId, gateway]);

  return { messages, status, error, send };
}
