import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Send,
  Lock,
  ArrowRight,
  RotateCcw,
  Check,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  DonkeyContextMessage,
  DonkeyContextOption,
  DonkeyReframeResponse,
} from './types';
import { requestDonkeyReframe, saveHeldNote } from './donkeyService';

interface DonkeyModalProps {
  isOpen: boolean;
  initialDraft: string;
  contextMessages: DonkeyContextMessage[];
  channelId?: string;
  onClose: () => void;
  onSendOriginal: (draft: string) => void;
  onApplyVersion: (versionText: string) => void;
  onHoldPrivate: () => void;
}

export const DonkeyModal: React.FC<DonkeyModalProps> = ({
  isOpen,
  initialDraft,
  contextMessages,
  channelId,
  onClose,
  onSendOriginal,
  onApplyVersion,
  onHoldPrivate,
}) => {
  const [draftText, setDraftText] = useState(initialDraft);
  const [contextOption, setContextOption] = useState<DonkeyContextOption>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DonkeyReframeResponse | null>(null);
  const [selectedCard, setSelectedCard] = useState<'warm' | 'firm' | 'original' | 'hold'>('warm');
  const [heldSuccess, setHeldSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftText(initialDraft);
      setContextOption('none');
      setLoading(false);
      setError(null);
      setResult(null);
      setSelectedCard('warm');
      setHeldSuccess(false);
    }
  }, [isOpen, initialDraft]);

  if (!isOpen) return null;

  const getFilteredContext = () => {
    if (contextOption === 'none' || contextMessages.length === 0) return [];
    if (contextOption === 'previous') return contextMessages.slice(-1);
    return contextMessages.slice(-3);
  };

  const handleReframe = async () => {
    if (!draftText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setHeldSuccess(false);

    try {
      const selectedContext = getFilteredContext();
      const res = await requestDonkeyReframe({
        draft: draftText.trim(),
        contextOption,
        contextMessages: selectedContext,
      });

      setResult(res);
      if (res.safetyMode) {
        setSelectedCard('firm');
      } else {
        setSelectedCard('warm');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to reframe draft');
    } finally {
      setLoading(false);
    }
  };

  const handleHold = () => {
    const noteToHold = result?.holdNote || `[Private Hold Note - Unsent]: ${draftText.trim()}`;
    saveHeldNote(draftText.trim(), noteToHold, channelId);
    setHeldSuccess(true);
    setTimeout(() => {
      onHoldPrivate();
      onClose();
    }, 1200);
  };

  const selectedContext = getFilteredContext();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-2xl bg-amber-50 rounded-t-3xl sm:rounded-3xl border border-amber-300 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        id="donkey-modal-container"
      >
        {/* Header */}
        <div className="bg-amber-900 text-amber-50 px-4 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">🫏</span>
            <div>
              <h3 className="font-extrabold text-base leading-tight flex items-center space-x-1.5">
                <span>Donkey</span>
                <span className="text-[10px] font-bold bg-amber-800 text-amber-200 px-2 py-0.5 rounded-full border border-amber-700">
                  Pause & Translation Layer
                </span>
              </h3>
              <p className="text-[11px] text-amber-200/90 font-medium">
                Carrying emotional luggage for 30 seconds • Unsent draft reframer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-amber-800 text-amber-200 transition cursor-pointer"
            title="Close Donkey Sheet"
            id="donkey-modal-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Held Success Notification */}
          {heldSuccess && (
            <div className="bg-emerald-100 border border-emerald-400 text-emerald-950 p-3 rounded-2xl flex items-center space-x-2 text-xs font-bold animate-scale-up">
              <Check className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>Draft held privately on this device. Cleared from chat composer. No Witness Ledger write recorded.</span>
            </div>
          )}

          {/* Input & Context Section (if no result yet or user editing) */}
          {!result && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-amber-950 mb-1">
                  Unsent Draft Message:
                </label>
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Type or paste your tense draft message here..."
                  rows={3}
                  className="w-full p-3 bg-white text-amber-950 text-sm rounded-2xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium shadow-2xs resize-none"
                  id="donkey-draft-input"
                />
              </div>

              {/* Context Selector */}
              <div className="bg-amber-100/80 p-3 rounded-2xl border border-amber-300/80 space-y-2">
                <div className="text-xs font-bold text-amber-950 flex items-center justify-between">
                  <span>Include Conversation Context (Optional):</span>
                  <span className="text-[10px] text-amber-800 font-semibold">Default: No Context</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setContextOption('none')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      contextOption === 'none'
                        ? 'bg-amber-900 text-amber-50 border-amber-950 shadow-2xs'
                        : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50'
                    }`}
                    id="donkey-context-none-btn"
                  >
                    🚫 No Context
                  </button>

                  <button
                    onClick={() => setContextOption('previous')}
                    disabled={contextMessages.length === 0}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      contextOption === 'previous'
                        ? 'bg-amber-900 text-amber-50 border-amber-950 shadow-2xs'
                        : contextMessages.length === 0
                        ? 'bg-amber-50 text-amber-400 border-amber-200 cursor-not-allowed'
                        : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50'
                    }`}
                    id="donkey-context-prev-btn"
                  >
                    💬 Previous Msg
                  </button>

                  <button
                    onClick={() => setContextOption('last_three')}
                    disabled={contextMessages.length === 0}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      contextOption === 'last_three'
                        ? 'bg-amber-900 text-amber-50 border-amber-950 shadow-2xs'
                        : contextMessages.length === 0
                        ? 'bg-amber-50 text-amber-400 border-amber-200 cursor-not-allowed'
                        : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50'
                    }`}
                    id="donkey-context-last3-btn"
                  >
                    💬 Last 3 Msgs
                  </button>
                </div>

                {/* Quoted Context Preview */}
                {selectedContext.length > 0 && (
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 text-xs space-y-1">
                    <span className="font-extrabold text-[10px] text-amber-800 uppercase tracking-wider block">
                      Quoted Chat Context (Untrusted Reference):
                    </span>
                    {selectedContext.map((m, idx) => (
                      <div key={idx} className="text-amber-900 truncate">
                        <strong>{m.sender}:</strong> {m.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action trigger button */}
              <button
                onClick={handleReframe}
                disabled={loading || !draftText.trim()}
                className={`w-full py-3 px-4 rounded-2xl font-extrabold text-sm transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer ${
                  loading || !draftText.trim()
                    ? 'bg-amber-300/60 text-amber-700/60 cursor-not-allowed'
                    : 'bg-amber-900 hover:bg-amber-950 text-amber-50 active:scale-98'
                }`}
                id="donkey-reframe-submit-btn"
              >
                {loading ? (
                  <>
                    <span className="animate-spin text-lg">🫏</span>
                    <span>Carrying emotional luggage for 30s...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>🫏 Reframe Draft with Donkey</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Error Message if any */}
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-950 p-3 rounded-2xl flex items-start space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <div>
                <strong>Reframe Error: </strong> {error}
              </div>
            </div>
          )}

          {/* Reframed Results View */}
          {result && (
            <div className="space-y-4 animate-scale-up">
              {/* Safety Alert Banner */}
              {result.safetyMode && (
                <div className="bg-red-100 border-2 border-red-400 p-3.5 rounded-2xl text-red-950 space-y-2 shadow-xs">
                  <div className="flex items-center space-x-2 text-red-900 font-extrabold text-xs uppercase tracking-wider">
                    <ShieldAlert className="w-5 h-5 text-red-700" />
                    <span>⚠️ Safety Boundary Alert</span>
                  </div>
                  <p className="text-xs font-bold text-red-950">
                    {result.safetyReason ||
                      'Draft indicates high tension, physical threat, or immediate boundary concerns.'}
                  </p>
                  <p className="text-[11px] text-red-900 font-medium leading-relaxed">
                    Please prioritize your safety. You do not need to engage or soften necessary safety boundaries. Consider holding this draft privately or seeking immediate human support.
                  </p>
                </div>
              )}

              {/* Interpretation & Facts Summary */}
              <div className="bg-amber-100/90 p-3.5 rounded-2xl border border-amber-300 space-y-2 text-xs text-amber-950">
                <div className="bg-amber-200/90 p-2.5 rounded-xl border border-amber-300/80">
                  <span className="font-extrabold text-amber-950 block mb-0.5">
                    🛡️ What You May Be Protecting (Labelled Interpretation):
                  </span>
                  <p className="font-semibold text-amber-900 italic">"{result.protecting}"</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                    <span className="font-extrabold text-[10px] text-amber-800 uppercase tracking-wider block mb-1">
                      📍 Observable Plain Facts:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900 font-medium">
                      {result.facts.map((fact, idx) => (
                        <li key={idx} className="leading-snug">
                          {fact}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                    <span className="font-extrabold text-[10px] text-amber-800 uppercase tracking-wider block mb-1">
                      🎯 Clear Request / Boundary:
                    </span>
                    <p className="text-[11px] text-amber-950 font-bold leading-snug">
                      "{result.requestOrBoundary}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Version Card Switcher / Options */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-amber-950">
                  Select Version to Use:
                </label>

                {/* Cards Options */}
                <div className="space-y-2">
                  {/* Card 1: Warm Version */}
                  <div
                    onClick={() => setSelectedCard('warm')}
                    className={`p-3 rounded-2xl border-2 transition cursor-pointer space-y-1.5 ${
                      selectedCard === 'warm'
                        ? 'bg-amber-100 border-amber-900 shadow-xs'
                        : 'bg-white border-amber-200 hover:bg-amber-50'
                    }`}
                    id="donkey-card-warm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-950 flex items-center space-x-1.5">
                        <span>☀️ Warm Version</span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                          Lower Heat
                        </span>
                      </span>
                      <input
                        type="radio"
                        checked={selectedCard === 'warm'}
                        onChange={() => setSelectedCard('warm')}
                        className="accent-amber-900"
                      />
                    </div>
                    <p className="text-xs text-amber-900 font-medium leading-relaxed bg-white/80 p-2 rounded-xl border border-amber-200/60">
                      "{result.warmVersion}"
                    </p>
                  </div>

                  {/* Card 2: Firm Version */}
                  <div
                    onClick={() => setSelectedCard('firm')}
                    className={`p-3 rounded-2xl border-2 transition cursor-pointer space-y-1.5 ${
                      selectedCard === 'firm'
                        ? 'bg-amber-100 border-amber-900 shadow-xs'
                        : 'bg-white border-amber-200 hover:bg-amber-50'
                    }`}
                    id="donkey-card-firm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-950 flex items-center space-x-1.5">
                        <span>🛡️ Firm Version</span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                          Direct Boundary
                        </span>
                      </span>
                      <input
                        type="radio"
                        checked={selectedCard === 'firm'}
                        onChange={() => setSelectedCard('firm')}
                        className="accent-amber-900"
                      />
                    </div>
                    <p className="text-xs text-amber-900 font-medium leading-relaxed bg-white/80 p-2 rounded-xl border border-amber-200/60">
                      "{result.firmVersion}"
                    </p>
                  </div>

                  {/* Card 3: Original Draft */}
                  <div
                    onClick={() => setSelectedCard('original')}
                    className={`p-3 rounded-2xl border-2 transition cursor-pointer space-y-1.5 ${
                      selectedCard === 'original'
                        ? 'bg-amber-100 border-amber-900 shadow-xs'
                        : 'bg-white border-amber-200 hover:bg-amber-50'
                    }`}
                    id="donkey-card-original"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-950 flex items-center space-x-1.5">
                        <span>✏️ Original Draft</span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                          As Written
                        </span>
                      </span>
                      <input
                        type="radio"
                        checked={selectedCard === 'original'}
                        onChange={() => setSelectedCard('original')}
                        className="accent-amber-900"
                      />
                    </div>
                    <p className="text-xs text-amber-900 font-medium leading-relaxed bg-white/80 p-2 rounded-xl border border-amber-200/60">
                      "{draftText.trim()}"
                    </p>
                  </div>

                  {/* Card 4: Private Hold Note */}
                  <div
                    onClick={() => setSelectedCard('hold')}
                    className={`p-3 rounded-2xl border-2 transition cursor-pointer space-y-1.5 ${
                      selectedCard === 'hold'
                        ? 'bg-amber-100 border-amber-900 shadow-xs'
                        : 'bg-white border-amber-200 hover:bg-amber-50'
                    }`}
                    id="donkey-card-hold"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-950 flex items-center space-x-1.5">
                        <span>🔒 Private Hold Note</span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                          Unsent Reflection
                        </span>
                      </span>
                      <input
                        type="radio"
                        checked={selectedCard === 'hold'}
                        onChange={() => setSelectedCard('hold')}
                        className="accent-amber-900"
                      />
                    </div>
                    <p className="text-xs text-amber-900 font-medium leading-relaxed bg-white/80 p-2 rounded-xl border border-amber-200/60">
                      "{result.holdNote}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Reset Reframe button */}
              <div className="text-center pt-1">
                <button
                  onClick={() => setResult(null)}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 underline flex items-center justify-center space-x-1 mx-auto cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Adjust Draft / Change Context</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions Bar */}
        <div className="p-3 sm:p-4 bg-amber-100/90 border-t border-amber-300 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Privacy Guarantee Pill */}
          <div className="flex items-center space-x-1 text-[10px] text-amber-800 font-bold">
            <Lock className="w-3.5 h-3.5 text-amber-800" />
            <span>Never auto-sends • No Witness Ledger write</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            {/* Hold Button */}
            <button
              onClick={handleHold}
              className="flex-1 sm:flex-initial py-2 px-3 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-300 font-extrabold text-xs transition flex items-center justify-center space-x-1 cursor-pointer"
              title="Hold note privately on this device"
              id="donkey-action-hold-btn"
            >
              <Lock className="w-3.5 h-3.5 text-amber-800" />
              <span>Hold Note</span>
            </button>

            {/* Send / Apply Button based on selection */}
            {result ? (
              <button
                onClick={() => {
                  if (selectedCard === 'original') {
                    onSendOriginal(draftText.trim());
                    onClose();
                  } else if (selectedCard === 'hold') {
                    handleHold();
                  } else if (selectedCard === 'warm') {
                    onApplyVersion(result.warmVersion);
                    onClose();
                  } else if (selectedCard === 'firm') {
                    onApplyVersion(result.firmVersion);
                    onClose();
                  }
                }}
                className="flex-1 sm:flex-initial py-2 px-4 rounded-xl bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-xs transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer active:scale-95"
                id="donkey-action-apply-btn"
              >
                <span>
                  {selectedCard === 'original'
                    ? 'Send as Written'
                    : selectedCard === 'hold'
                    ? 'Hold Privately'
                    : 'Use Selected Version'}
                </span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>
            ) : (
              <button
                onClick={() => {
                  onSendOriginal(draftText.trim());
                  onClose();
                }}
                disabled={!draftText.trim()}
                className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl font-extrabold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  draftText.trim()
                    ? 'bg-amber-900 hover:bg-amber-950 text-amber-50 shadow-xs'
                    : 'bg-amber-200 text-amber-400 cursor-not-allowed'
                }`}
                id="donkey-action-send-direct-btn"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send as Written</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
