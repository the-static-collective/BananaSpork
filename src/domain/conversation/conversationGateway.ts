export type ConversationContractErrorCode =
  | 'EMPTY_CIRCLE_ID'
  | 'EMPTY_MESSAGE'
  | 'CROSS_CIRCLE_ROW';

export class ConversationContractError extends Error {
  constructor(public readonly code: ConversationContractErrorCode) {
    super(code);
    this.name = 'ConversationContractError';
  }
}

export interface CircleMessageRow {
  id: string;
  circle_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
}

export interface CircleMessageInsert {
  circle_id: string;
  body: string;
}

export interface CircleMessage {
  id: string;
  circleId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
}

export interface ConversationTransport {
  list(circleId: string): Promise<CircleMessageRow[]>;
  insert(payload: CircleMessageInsert): Promise<CircleMessageRow>;
  subscribe(
    circleId: string,
    handler: (row: CircleMessageRow) => void,
  ): () => void;
}

export interface ConversationGateway {
  list(circleId: string): Promise<CircleMessage[]>;
  send(circleId: string, body: string): Promise<CircleMessage>;
  subscribe(circleId: string, handler: (message: CircleMessage) => void): () => void;
}

function requireCircleId(circleId: string): string {
  const normalized = circleId.trim();
  if (!normalized) {
    throw new ConversationContractError('EMPTY_CIRCLE_ID');
  }
  return normalized;
}

function mapRow(row: CircleMessageRow, expectedCircleId: string): CircleMessage {
  if (row.circle_id !== expectedCircleId) {
    throw new ConversationContractError('CROSS_CIRCLE_ROW');
  }

  return {
    id: row.id,
    circleId: row.circle_id,
    senderUserId: row.sender_user_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function createConversationGateway(
  transport: ConversationTransport,
): ConversationGateway {
  return {
    async list(circleId) {
      const normalizedCircleId = requireCircleId(circleId);
      const rows = await transport.list(normalizedCircleId);
      return rows
        .map((row) => mapRow(row, normalizedCircleId))
        .sort((left, right) => {
          const byTime = left.createdAt.localeCompare(right.createdAt);
          return byTime !== 0 ? byTime : left.id.localeCompare(right.id);
        });
    },

    async send(circleId, body) {
      const normalizedCircleId = requireCircleId(circleId);
      const normalizedBody = body.trim();
      if (!normalizedBody) {
        throw new ConversationContractError('EMPTY_MESSAGE');
      }

      // Deliberately do not send sender_user_id. The authenticated database
      // constitution must derive/validate sender identity; the browser does
      // not get to assert who authored a shared Campfire message.
      const row = await transport.insert({
        circle_id: normalizedCircleId,
        body: normalizedBody,
      });
      return mapRow(row, normalizedCircleId);
    },

    subscribe(circleId, handler) {
      const normalizedCircleId = requireCircleId(circleId);
      return transport.subscribe(normalizedCircleId, (row) => {
        handler(mapRow(row, normalizedCircleId));
      });
    },
  };
}
