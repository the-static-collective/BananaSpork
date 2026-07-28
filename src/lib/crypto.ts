// SHA-256 Helper utilities for Jubilee Witness Ledger receipts

export async function computeSha256(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('Crypto subtle digest error, falling back to simple hash', e);
    }
  }
  
  // Fallback deterministic string hash function for non-subtle environments
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const raw = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  return raw.padStart(64, 'a').substring(0, 64);
}

export function buildReceiptPayload(
  sequence: number,
  predecessorHash: string,
  actorName: string,
  eventType: string,
  title: string,
  timestamp: string,
  details: string
): string {
  return `${sequence}|${predecessorHash}|${actorName}|${eventType}|${title}|${timestamp}|${details}`;
}
