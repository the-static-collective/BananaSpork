import React, { useState } from 'react';
import { Sparkles, X, Plus, Check, Clock, ShieldCheck, Share2, RefreshCw } from 'lucide-react';
import { COMMON_PANTRY_INGREDIENTS } from '../../data/presetChannels';
import { KidProfile, RecipeCard } from '../../types';
import { apiJson } from '../../lib/api';

interface PantryRescueAppProps {
  isOpen: boolean;
  onClose: () => void;
  kidProfile: KidProfile;
  onSendRecipeToChat: (recipe: RecipeCard) => void;
}

export const PantryRescueApp: React.FC<PantryRescueAppProps> = ({
  isOpen,
  onClose,
  kidProfile,
  onSendRecipeToChat,
}) => {
  const hasPeanutAllergy = kidProfile?.allergies?.some((a) =>
    a.toLowerCase().includes('peanut') || a.toLowerCase().includes('nut')
  );

  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(() => [
    'Banana 🍌',
    'Bread / Toast 🍞',
    hasPeanutAllergy ? 'Sunbutter / Seed Butter 🌻' : 'Peanut Butter 🥜',
  ]);
  const [customInput, setCustomInput] = useState('');
  const [mood, setMood] = useState('2-Minute Hunger Emergency');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    ideas: RecipeCard[];
    momEncouragement?: string;
  } | null>(null);

  if (!isOpen) return null;

  const toggleIngredient = (name: string) => {
    if (selectedIngredients.includes(name)) {
      setSelectedIngredients(selectedIngredients.filter((i) => i !== name));
    } else {
      setSelectedIngredients([...selectedIngredients, name]);
    }
  };

  const handleAddCustom = () => {
    if (!customInput.trim()) return;
    const formatted = customInput.trim();
    if (!selectedIngredients.includes(formatted)) {
      setSelectedIngredients([...selectedIngredients, formatted]);
    }
    setCustomInput('');
  };

  const handleGenerate = async () => {
    if (selectedIngredients.length === 0) {
      alert('Please select or type at least 1 ingredient!');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const data = await apiJson<{
        ideas: RecipeCard[];
        momEncouragement?: string;
      }>('/api/pantry-rescue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: selectedIngredients,
          kidProfile,
          mood,
        }),
      });
      setResults(data);
    } catch (e) {
      console.error(e);
      setResults({
        ideas: [
          {
            title: '🍌 Deconstructed Happy Plate',
            timeMins: 2,
            ingredientsUsed: selectedIngredients.slice(0, 3),
            steps: [
              'Place 3 separate piles on a plate (no touching!)',
              'Add a toothpick or small spoon for fun',
              'Serve with a cup of water or milk',
            ],
            pickyHack: 'Keep items in isolated piles so textures do not mix.',
            meltdownRisk: 'Very Low',
          },
        ],
        momEncouragement:
          'AI service unavailable — this is a built-in, this-device fallback. Use only ingredients already known to be safe for your child and check allergy labels.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      {/* Mini App Window */}
      <div
        className="w-full max-w-lg bg-amber-50 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-amber-300 max-h-[90vh] flex flex-col overflow-hidden animate-slide-up"
        id="pantry-rescue-app-modal"
      >
        {/* Telegram Mini App Header */}
        <div className="bg-amber-400 p-4 text-amber-950 flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-lg shadow-2xs">
              ⚡
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded">
                Telegram Mini-App
              </span>
              <h3 className="font-extrabold text-base leading-tight">
                Pantry & Fridge Rescue
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-amber-300/80 hover:bg-amber-200 text-amber-950 transition"
            id="close-pantry-app-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Allergy Safety Indicator */}
          {kidProfile?.allergies && kidProfile.allergies.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 flex items-center space-x-2 text-xs text-amber-900 font-semibold shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Allergy Safety Active:</strong> Filtered for {kidProfile.name}&apos;s profile ({kidProfile.allergies.join(', ')}). Peanut-free options prioritized.
              </span>
            </div>
          )}

          {/* Step 1: Ingredient Picker */}
          <div>
            <label className="block text-xs font-extrabold text-amber-950 uppercase tracking-wide mb-1.5">
              1. Tap ingredients you have right now:
            </label>

            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2 bg-amber-100/50 rounded-2xl border border-amber-200">
              {COMMON_PANTRY_INGREDIENTS.map((item) => {
                const isSelected = selectedIngredients.includes(item.name);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleIngredient(item.name)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 border ${
                      isSelected
                        ? 'bg-amber-900 text-amber-50 border-amber-950 shadow-2xs'
                        : 'bg-white text-amber-950 border-amber-200 hover:bg-amber-100/80'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3 text-amber-300" /> : null}
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom ingredient add */}
            <div className="flex space-x-2 mt-2">
              <input
                type="text"
                placeholder="Add other ingredient (e.g., leftover rice, apple sauce)..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                className="flex-1 px-3 py-1.5 bg-white text-xs text-amber-950 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={handleAddCustom}
                className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-xl transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Selected summary */}
          <div className="text-xs font-semibold text-amber-900 flex items-center justify-between">
            <span>Selected ({selectedIngredients.length} ingredients)</span>
            {selectedIngredients.length > 0 && (
              <button
                onClick={() => setSelectedIngredients([])}
                className="text-[11px] text-amber-800 underline font-bold"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Step 2: Child Mood selector */}
          <div>
            <label className="block text-xs font-extrabold text-amber-950 uppercase tracking-wide mb-1.5">
              2. Child Current Situation:
            </label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full px-3 py-2 bg-white text-amber-950 font-semibold text-xs rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-2xs"
            >
              <option value="2-Minute Hunger Emergency">2-Minute Hunger Emergency 🚨</option>
              <option value="Fussy / Refusing Greens">Fussy / Refusing Greens 😤</option>
              <option value="Post-Nap Snack">Post-Nap Snack 😴</option>
              <option value="Bedtime Soothing Food">Bedtime Soothing Food 🌙</option>
              <option value="Sensory Overload">Sensory Overload / Picky Day 🧩</option>
            </select>
          </div>

          {/* Action Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || selectedIngredients.length === 0}
            className={`w-full py-3 px-4 rounded-2xl font-extrabold text-sm shadow-md transition flex items-center justify-center space-x-2 active:scale-98 ${
              loading || selectedIngredients.length === 0
                ? 'bg-amber-300/60 text-amber-800/60 cursor-not-allowed'
                : 'bg-amber-900 hover:bg-amber-950 text-amber-50 cursor-pointer'
            }`}
            id="generate-pantry-rescue-btn"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>BananaBot is cooking 3-step ideas...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Get 3-Step Kid Meals Now</span>
              </>
            )}
          </button>

          {/* Results Display */}
          {results && (
            <div className="space-y-3 pt-2">
              {results.momEncouragement && (
                <div className="bg-amber-200/80 p-3 rounded-2xl border border-amber-300 text-amber-950 text-xs font-semibold flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>{results.momEncouragement}</div>
                </div>
              )}

              <h4 className="font-extrabold text-xs text-amber-950 uppercase tracking-wide">
                Toddler-Approved Rescue Ideas:
              </h4>

              {results.ideas.map((idea, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-2xs space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                    <h5 className="font-bold text-amber-950 text-sm">
                      {idea.title}
                    </h5>
                    <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{idea.timeMins} min</span>
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-amber-900">3-Step Prep:</span>
                    <ol className="list-decimal list-inside space-y-1 mt-1 text-amber-900">
                      {idea.steps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="bg-amber-50 p-2 rounded-xl text-amber-900 text-[11px] border border-amber-200/80">
                    <strong className="text-amber-950">Picky Eater Hack: </strong>
                    {idea.pickyHack}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-amber-100">
                    <span className="text-[11px] font-bold text-emerald-700">
                      Scream Risk: {idea.meltdownRisk}
                    </span>
                    <button
                      onClick={() => {
                        onSendRecipeToChat(idea);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-amber-900 hover:bg-amber-950 text-amber-50 font-bold text-xs rounded-xl shadow-2xs transition flex items-center space-x-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Send to Chat</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
