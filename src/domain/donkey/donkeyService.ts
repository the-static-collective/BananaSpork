import {
  DonkeyContextMessage,
  DonkeyContextOption,
  DonkeyHeldNote,
  DonkeyReframeRequest,
  DonkeyReframeResponse,
} from './types';
import { apiJson } from '../../lib/api';

const STORAGE_KEY_HELD_NOTES = 'bananagram_donkey_held_notes_v1';

// Safety triggers detector for local offline fallback worksheet
export function detectLocalSafetyTriggers(text: string): { isSafety: boolean; reason: string | null } {
  const lower = text.toLowerCase();
  const dangerKeywords = [
    'kill',
    'die',
    'shoot',
    'hit',
    'stab',
    'punch',
    'suicide',
    'self-harm',
    'stalk',
    'abuse',
    'threat',
    'violence',
    'hurt you',
    'destroy you',
    'call police',
  ];

  const matched = dangerKeywords.filter((kw) => lower.includes(kw));
  if (matched.length > 0) {
    return {
      isSafety: true,
      reason:
        'Draft contains language indicating high tension, physical threat, or immediate boundary concerns. Prioritize your safety and seek human support if needed.',
    };
  }
  return { isSafety: false, reason: null };
}

// Local Non-AI "Pause / Facts / Need / Boundary" Worksheet Fallback
export function generateLocalWorksheetFallback(
  draft: string,
  contextMessages: DonkeyContextMessage[] = []
): DonkeyReframeResponse {
  const cleanDraft = draft.trim();
  const { isSafety, reason } = detectLocalSafetyTriggers(cleanDraft);

  const contextNote =
    contextMessages.length > 0
      ? ` (Context included: ${contextMessages.map((m) => `${m.sender}: "${m.text}"`).join(' | ')})`
      : '';

  if (isSafety) {
    return {
      protecting:
        'Interpretation: You may be protecting your immediate physical, emotional, or boundary safety in a high-heat situation.',
      facts: [cleanDraft],
      requestOrBoundary:
        'Safety Boundary: "I need to stop this message exchange now and focus on safety."',
      warmVersion:
        'I am stepping away from this conversation right now. We can discuss next steps later when things are calm.',
      firmVersion:
        'I am pausing all communication right now. Please do not contact me further on this topic today.',
      holdNote: `[Private Hold Note - Unsent High-Heat Draft]: ${cleanDraft}${contextNote}`,
      safetyMode: true,
      safetyReason: reason,
    };
  }

  return {
    protecting:
      'Interpretation: What you may be protecting is your time, energy, or a desire for mutual respect and predictability.',
    facts: [cleanDraft],
    requestOrBoundary:
      'Clear Request: "I need us to pause and communicate clearly about expectations."',
    warmVersion:
      'Hey, I want us to get through this smoothly. Can we pause for a minute and reset when we both have a moment?',
    firmVersion:
      'I need to pause this discussion right now. Let\'s reconnect later with a clear plan.',
    holdNote: `[Private Hold Note - Unsent Reflection]: ${cleanDraft}${contextNote}`,
    safetyMode: false,
    safetyReason: null,
  };
}

// Runtime schema validator for Donkey response
export function validateDonkeyResponse(data: any): DonkeyReframeResponse | null {
  if (!data || typeof data !== 'object') return null;

  const protecting = typeof data.protecting === 'string' ? data.protecting : null;
  const facts = Array.isArray(data.facts) ? data.facts.filter((f: any) => typeof f === 'string') : [];
  const requestOrBoundary = typeof data.requestOrBoundary === 'string' ? data.requestOrBoundary : null;
  const warmVersion = typeof data.warmVersion === 'string' ? data.warmVersion : null;
  const firmVersion = typeof data.firmVersion === 'string' ? data.firmVersion : null;
  const holdNote = typeof data.holdNote === 'string' ? data.holdNote : null;
  const safetyMode = typeof data.safetyMode === 'boolean' ? data.safetyMode : false;
  const safetyReason = typeof data.safetyReason === 'string' ? data.safetyReason : null;

  if (!protecting || !requestOrBoundary || !warmVersion || !firmVersion || !holdNote) {
    return null;
  }

  return {
    protecting,
    facts: facts.length > 0 ? facts : [protecting],
    requestOrBoundary,
    warmVersion,
    firmVersion,
    holdNote,
    safetyMode,
    safetyReason,
  };
}

// Client service function to request reframe with timeout, abort, and fallback
export async function requestDonkeyReframe(
  request: DonkeyReframeRequest,
  signal?: AbortSignal
): Promise<DonkeyReframeResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  // Connect user's abort signal if provided
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const json = await apiJson<unknown>('/api/donkey/reframe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const validated = validateDonkeyResponse(json);

    if (!validated) {
      console.warn('[DonkeyService] Response failed schema validation. Using local worksheet fallback.');
      return generateLocalWorksheetFallback(request.draft, request.contextMessages);
    }

    return validated;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn('[DonkeyService] API call error or timeout. Using local worksheet fallback:', err?.message || err);
    return generateLocalWorksheetFallback(request.draft, request.contextMessages);
  }
}

// Local Held Notes Storage Management
let inMemoryHeldNotes: DonkeyHeldNote[] = [];

export function getHeldNotes(): DonkeyHeldNote[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_HELD_NOTES);
      return raw ? JSON.parse(raw) : [];
    }
    return inMemoryHeldNotes;
  } catch {
    return inMemoryHeldNotes;
  }
}

export function saveHeldNote(draft: string, holdNote: string, channelId?: string): DonkeyHeldNote {
  const heldNote: DonkeyHeldNote = {
    id: `held-${Date.now()}`,
    draft,
    holdNote,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    channelId,
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const current = getHeldNotes();
      const updated = [heldNote, ...current];
      localStorage.setItem(STORAGE_KEY_HELD_NOTES, JSON.stringify(updated));
    } else {
      inMemoryHeldNotes = [heldNote, ...inMemoryHeldNotes];
    }
  } catch (e) {
    inMemoryHeldNotes = [heldNote, ...inMemoryHeldNotes];
  }

  return heldNote;
}
