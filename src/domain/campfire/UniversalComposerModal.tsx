import React, { useState, useEffect } from 'react';
import {
  X,
  Mic,
  MicOff,
  Sparkles,
  Send,
  Plus,
  Calendar,
  CheckSquare,
  HeartHandshake,
  Sprout,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { BasketCategory } from '../../types';
import { ActionVerb } from './types';

interface UniversalComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitProposal: (
    verb: ActionVerb,
    title: string,
    description: string,
    details?: { category?: BasketCategory; dateOrTime?: string }
  ) => void;
}

export const UniversalComposerModal: React.FC<UniversalComposerModalProps> = ({
  isOpen,
  onClose,
  onSubmitProposal,
}) => {
  const [activeVerb, setActiveVerb] = useState<ActionVerb>('need');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BasketCategory>('Care');
  const [dateOrTime, setDateOrTime] = useState('');

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = 'en-US';

        recog.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setTitle((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
          setIsListening(false);
        };

        recog.onerror = () => {
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        setRecognition(recog);
      } else {
        setSpeechSupported(false);
      }
    }
  }, []);

  if (!isOpen) return null;

  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmitProposal(activeVerb, title.trim(), description.trim(), {
      category,
      dateOrTime: dateOrTime.trim(),
    });

    // Reset & Close
    setTitle('');
    setDescription('');
    setDateOrTime('');
    onClose();
  };

  const verbs: { id: ActionVerb; label: string; icon: string; desc: string }[] = [
    { id: 'need', label: 'Need', icon: '🌿', desc: 'Ask circle for help or open a capacity seed' },
    { id: 'offer', label: 'Offer', icon: '🌱', desc: 'Share tools, care, time, or surplus into basket' },
    { id: 'task', label: 'Task', icon: '📋', desc: 'Propose a household or circle task (Non-authoritative)' },
    { id: 'event', label: 'Event', icon: '📅', desc: 'Propose a gathering or playdate (Non-authoritative)' },
    { id: 'remember', label: 'Remember', icon: '📜', desc: 'Log a gratitude, source moment, or memory' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-amber-50 rounded-t-3xl sm:rounded-3xl border border-amber-300 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        id="universal-composer-modal"
      >
        {/* Header */}
        <div className="bg-amber-900 text-amber-50 px-4 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xl">✨</span>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Universal Create</h3>
              <p className="text-[11px] text-amber-200">
                Offer • Join • Remember — Creates a visible proposal for review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-amber-800 text-amber-200 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Close composer"
            id="universal-composer-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Verb Switcher */}
          <div>
            <label className="block text-xs font-extrabold text-amber-950 mb-1.5 uppercase tracking-wider">
              Select Action Verb:
            </label>
            <div className="grid grid-cols-5 gap-1.5 bg-amber-200/70 p-1.5 rounded-2xl border border-amber-300">
              {verbs.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveVerb(v.id)}
                  className={`py-2 px-1 rounded-xl text-center transition flex flex-col items-center justify-center cursor-pointer min-h-[44px] ${
                    activeVerb === v.id
                      ? 'bg-amber-900 text-amber-50 shadow-2xs font-extrabold scale-102'
                      : 'bg-white/60 text-amber-950 hover:bg-white/90 font-bold'
                  }`}
                  id={`verb-tab-${v.id}`}
                >
                  <span className="text-lg leading-none">{v.icon}</span>
                  <span className="text-[10px] mt-0.5">{v.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-amber-800 font-medium italic mt-1.5 ml-1">
              {verbs.find((v) => v.id === activeVerb)?.desc}
            </p>
          </div>

          {/* Title Input + Speech Button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-extrabold text-amber-950">
                Title / Summary:
              </label>
              {speechSupported ? (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center space-x-1 transition min-h-[36px] cursor-pointer ${
                    isListening
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-amber-200 text-amber-900 hover:bg-amber-300'
                  }`}
                  title="Speech-to-text dictation"
                  id="speech-dictation-btn"
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isListening ? 'Listening...' : 'Voice Dictation'}</span>
                </button>
              ) : (
                <span className="text-[10px] text-amber-700 font-semibold italic">
                  Voice dictation available in Chrome/Safari
                </span>
              )}
            </div>

            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                activeVerb === 'need'
                  ? 'e.g., Afternoon childcare support for Leo'
                  : activeVerb === 'offer'
                  ? 'e.g., 2 dozen fresh eggs from backyard flock'
                  : activeVerb === 'task'
                  ? 'e.g., Clean pantry shelves before Friday'
                  : activeVerb === 'event'
                  ? 'e.g., Neighborhood potluck campfire Saturday 5pm'
                  : 'e.g., Mama Sarah brought warm soup during rainstorm'
              }
              className="w-full p-3 bg-white text-amber-950 rounded-2xl border border-amber-300 focus:ring-2 focus:ring-amber-500 text-sm font-medium shadow-2xs"
              id="universal-proposal-title-input"
            />
          </div>

          {/* Additional Details */}
          {(activeVerb === 'need' || activeVerb === 'offer') && (
            <div>
              <label className="block text-xs font-extrabold text-amber-950 mb-1">Category:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BasketCategory)}
                className="w-full p-2.5 bg-white text-amber-950 text-xs rounded-xl border border-amber-300 font-bold"
              >
                <option value="Care">Care</option>
                <option value="Tools">Tools</option>
                <option value="Time">Time</option>
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Skills">Skills</option>
                <option value="Creative">Creative</option>
              </select>
            </div>
          )}

          {(activeVerb === 'task' || activeVerb === 'event') && (
            <div>
              <label className="block text-xs font-extrabold text-amber-950 mb-1">
                Target Date / Time (Optional):
              </label>
              <input
                type="text"
                value={dateOrTime}
                onChange={(e) => setDateOrTime(e.target.value)}
                placeholder="e.g., Saturday 5:00 PM or Before Friday"
                className="w-full p-2.5 bg-white text-amber-950 text-xs rounded-xl border border-amber-300 font-medium"
              />
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-extrabold text-amber-950 mb-1">
              Context / Notes (Optional):
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any details, boundaries, or helpful context..."
              rows={2}
              className="w-full p-2.5 bg-white text-amber-950 text-xs rounded-xl border border-amber-300 font-medium resize-none"
            />
          </div>

          {/* Non-authoritative notice for Task / Event */}
          {(activeVerb === 'task' || activeVerb === 'event') && (
            <div className="bg-amber-100/90 border border-amber-300 p-2.5 rounded-xl text-[11px] text-amber-900 flex items-start space-x-1.5">
              <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Household Proposal Note:</strong> Task and Event will be created as a visible proposal item. Confirmed tasks/events are recorded in the local household read-model with non-authoritative status.
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!title.trim()}
            className={`w-full py-3 px-4 rounded-2xl font-extrabold text-sm transition flex items-center justify-center space-x-2 shadow-sm min-h-[44px] cursor-pointer ${
              title.trim()
                ? 'bg-amber-900 hover:bg-amber-950 text-amber-50 active:scale-98'
                : 'bg-amber-300/60 text-amber-700/60 cursor-not-allowed'
            }`}
            id="universal-proposal-submit-btn"
          >
            <Send className="w-4 h-4 text-amber-300" />
            <span>Create {activeVerb.toUpperCase()} Proposal</span>
          </button>
        </form>
      </div>
    </div>
  );
};
