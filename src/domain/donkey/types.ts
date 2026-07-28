export interface DonkeyReframeResponse {
  protecting: string;
  facts: string[];
  requestOrBoundary: string;
  warmVersion: string;
  firmVersion: string;
  holdNote: string;
  safetyMode: boolean;
  safetyReason: string | null;
}

export type DonkeyContextOption = 'none' | 'previous' | 'last_three';

export interface DonkeyContextMessage {
  sender: string;
  text: string;
}

export interface DonkeyReframeRequest {
  draft: string;
  contextOption?: DonkeyContextOption;
  contextMessages?: DonkeyContextMessage[];
}

export interface DonkeyHeldNote {
  id: string;
  draft: string;
  holdNote: string;
  timestamp: string;
  channelId?: string;
}
