import React, { useState, useEffect } from 'react';
import { ShieldAlert, Heart, Volume2, X, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { KidProfile } from '../types';
import { apiJson } from '../lib/api';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  kidProfile: KidProfile;
  audioMuted: boolean;
}

interface SosData {
  momGrounding: string;
  quickFixes: Array<{
    title: string;
    prepTime: string;
    whyItWorks: string;
    howToServe: string;
  }>;
  sensoryTrick: string;
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  onClose,
  kidProfile,
  audioMuted,
}) => {
  const [loading, setLoading] = useState(false);
  const [sosData, setSosData] = useState<SosData>({
    momGrounding:
      'Drop your shoulders, unshake your jaw, and take 3 deep belly breaths. You are safe, and this meltdown will pass in minutes.',
    quickFixes: [
      {
        title: 'The Cold Crunch Reset',
        prepTime: '30 seconds',
        whyItWorks: 'A familiar cold or crunchy food can offer a simple sensory focus without pressure.',
        howToServe: 'Hand over a cold cucumber spear, frozen berry, or crunchy cracker silently with zero pressure to eat.',
      },
      {
        title: 'Dipping Station',
        prepTime: '1 minute',
        whyItWorks: 'Dipping can offer a predictable choice and a low-pressure way to engage.',
        howToServe: 'Put 2 spoonfuls of yogurt, sunbutter/seed butter, or hummus in a small dip cup with pretzel sticks.',
      },
    ],
    sensoryTrick:
      'Reduce stimulation, use a calm voice, and offer a familiar quiet spot. Do not force food or drink.',
  });

  useEffect(() => {
    if (isOpen) {
      fetchSosData();
    }
  }, [isOpen]);

  const fetchSosData = async () => {
    setLoading(true);
    try {
      const data = await apiJson<SosData>('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kidProfile }),
      });
      setSosData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const speakSos = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const textToRead = `${sosData.momGrounding}. Here are quick fix ideas: ${sosData.quickFixes
      .map((f) => f.title + ': ' + f.howToServe)
      .join('. ')}. Sensory tip: ${sosData.sensoryTrick}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/60 backdrop-blur-sm p-3 sm:p-4">
      <div
        className="w-full max-w-lg bg-red-50 rounded-3xl shadow-2xl border-2 border-red-400 max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        id="sos-modal-window"
      >
        {/* Urgent Header */}
        <div className="bg-red-600 p-4 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white text-red-600 flex items-center justify-center font-bold text-xl shadow-xs">
              🚨
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                EMERGENCY MELTDOWN RESET
              </h3>
              <p className="text-xs text-red-100 font-medium">
                For {kidProfile.name || 'Toddler'} • Zero Guilt, Fast Calming
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={speakSos}
              className="p-1.5 rounded-xl bg-red-700 hover:bg-red-800 text-white transition flex items-center space-x-1 text-xs font-bold px-2"
              title="Listen out loud"
            >
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">Listen</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-red-700 hover:bg-red-800 text-white transition"
              id="close-sos-modal-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          <div className="rounded-2xl border border-red-300 bg-white p-3 text-[11px] font-semibold leading-relaxed text-red-900">
            This is general parenting support, not medical advice. For trouble breathing or
            swallowing, sudden swelling, fainting, or suspected anaphylaxis, follow your
            child&apos;s emergency allergy plan, use prescribed epinephrine, and contact
            emergency services immediately.
          </div>

          {/* Mom Grounding Note */}
          <div className="bg-red-100 border-l-4 border-red-600 p-3.5 rounded-r-2xl text-red-950 font-bold leading-relaxed shadow-2xs">
            <div className="flex items-center space-x-1.5 text-red-700 font-extrabold text-xs uppercase tracking-wider mb-1">
              <Heart className="w-4 h-4 fill-red-600 text-red-600" />
              <span>Deep Breath For Mom:</span>
            </div>
            <p className="text-sm font-semibold">{sosData.momGrounding}</p>
          </div>

          {/* Quick Fix Options */}
          <div>
            <h4 className="font-extrabold text-xs text-red-950 uppercase tracking-wide mb-2 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span>2-Minute Emergency Food Options:</span>
            </h4>

            {loading ? (
              <div className="p-6 text-center text-red-800 font-bold flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                <span>BananaBot is tailoring an emergency food plan...</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sosData.quickFixes.map((fix, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-3 rounded-2xl border border-red-200 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between border-b border-red-100 pb-1.5">
                      <h5 className="font-extrabold text-red-950 text-xs sm:text-sm">
                        {fix.title}
                      </h5>
                      <span className="text-[10px] font-bold bg-red-100 text-red-900 px-2 py-0.5 rounded-full">
                        Prep: {fix.prepTime}
                      </span>
                    </div>

                    <p className="text-red-900 font-medium">
                      <strong>How to serve: </strong>
                      {fix.howToServe}
                    </p>

                    <p className="text-[11px] text-red-700 bg-red-50 p-1.5 rounded-lg border border-red-100">
                      💡 <em>Why it works:</em> {fix.whyItWorks}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sensory Disruption Trick */}
          <div className="bg-amber-100 p-3 rounded-2xl border border-amber-300 text-amber-950">
            <h5 className="font-extrabold text-xs text-amber-900 uppercase tracking-wide mb-1 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
              <span>Sensory Disruption Trick:</span>
            </h5>
            <p className="font-bold text-xs leading-snug">{sosData.sensoryTrick}</p>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex space-x-2">
            <button
              onClick={fetchSosData}
              disabled={loading}
              className="flex-1 py-2.5 bg-red-200 hover:bg-red-300 text-red-950 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 border border-red-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>New Options</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5"
            >
              <span>I Got This • Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
