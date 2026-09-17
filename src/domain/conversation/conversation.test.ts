import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ConversationContractError,
  createConversationGateway,
  type CircleMessageRow,
  type ConversationTransport,
} from './conversationGateway';

function transportFixture(rows: CircleMessageRow[] = []) {
  const inserts: Array<{ circle_id: string; body: string }> = [];
  const subscriptions: Array<{ circleId: string; handler: (row: CircleMessageRow) => void }> = [];

  const transport: ConversationTransport = {
    async list(circleId) {
      return rows.filter((row) => row.circle_id === circleId);
    },
    async insert(payload) {
      inserts.push(payload);
      return {
        id: `msg-${inserts.length}`,
        circle_id: payload.circle_id,
        sender_user_id: 'auth-user-1',
        body: payload.body,
        created_at: '2026-09-17T16:00:00Z',
      };
    },
    subscribe(circleId, handler) {
      subscriptions.push({ circleId, handler });
      return () => undefined;
    },
  };

  return { transport, inserts, subscriptions };
}

test('send delegates only circle and body; sender identity is not client-asserted', async () => {
  const fixture = transportFixture();
  const gateway = createConversationGateway(fixture.transport);

  const message = await gateway.send('circle-a', '  hello campfire  ');

  assert.deepEqual(fixture.inserts, [{ circle_id: 'circle-a', body: 'hello campfire' }]);
  assert.equal(message.senderUserId, 'auth-user-1');
  assert.equal(message.circleId, 'circle-a');
  assert.equal(message.body, 'hello campfire');
});

test('list rehydrates ordered durable rows without turning them into witness events', async () => {
  const fixture = transportFixture([
    {
      id: 'msg-1',
      circle_id: 'circle-a',
      sender_user_id: 'user-1',
      body: 'first',
      created_at: '2026-09-17T15:59:00Z',
    },
    {
      id: 'msg-2',
      circle_id: 'circle-a',
      sender_user_id: 'user-2',
      body: 'second',
      created_at: '2026-09-17T16:00:00Z',
    },
  ]);
  const gateway = createConversationGateway(fixture.transport);

  const messages = await gateway.list('circle-a');

  assert.deepEqual(messages.map((message) => message.id), ['msg-1', 'msg-2']);
  assert.equal('witnessEventId' in messages[0], false);
  assert.equal('authority' in messages[0], false);
});

test('blank messages and cross-circle transport leakage fail closed', async () => {
  const fixture = transportFixture();
  const gateway = createConversationGateway(fixture.transport);

  await assert.rejects(
    () => gateway.send('circle-a', '   '),
    (error: unknown) => error instanceof ConversationContractError && error.code === 'EMPTY_MESSAGE',
  );

  const leaking: ConversationTransport = {
    ...fixture.transport,
    async list() {
      return [{
        id: 'leak',
        circle_id: 'circle-b',
        sender_user_id: 'user-2',
        body: 'wrong campfire',
        created_at: '2026-09-17T16:00:00Z',
      }];
    },
  };

  await assert.rejects(
    () => createConversationGateway(leaking).list('circle-a'),
    (error: unknown) => error instanceof ConversationContractError && error.code === 'CROSS_CIRCLE_ROW',
  );
});

test('realtime callback rejects a row for another circle before exposing it to chat', () => {
  const fixture = transportFixture();
  const gateway = createConversationGateway(fixture.transport);
  const received: string[] = [];

  gateway.subscribe('circle-a', (message) => received.push(message.id));
  assert.equal(fixture.subscriptions.length, 1);

  assert.throws(
    () => fixture.subscriptions[0].handler({
      id: 'leak',
      circle_id: 'circle-b',
      sender_user_id: 'user-2',
      body: 'wrong campfire',
      created_at: '2026-09-17T16:00:00Z',
    }),
    (error: unknown) => error instanceof ConversationContractError && error.code === 'CROSS_CIRCLE_ROW',
  );
  assert.deepEqual(received, []);
});
