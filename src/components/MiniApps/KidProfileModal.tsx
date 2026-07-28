import React, { useState } from 'react';
import { User, X, Check, Save, Heart, ShieldAlert } from 'lucide-react';
import { KidProfile } from '../../types';

interface KidProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  kidProfile: KidProfile;
  onSaveProfile: (profile: KidProfile) => void;
}

const ALLERGY_OPTIONS = [
  'Peanuts 🥜',
  'Tree Nuts 🌰',
  'Milk / Dairy 🥛',
  'Eggs 🥚',
  'Soy 🫘',
  'Wheat / Gluten 🌾',
  'Sesame 🥯',
];

const DIP_OPTIONS = [
  'Ketchup 🥫',
  'Peanut / Seed Butter 🥜',
  'Ranch / Dip 🥗',
  'Yogurt / Honey 🥛',
  'Hummus 🧆',
  'Melted Cheese 🧀',
];

export const KidProfileModal: React.FC<KidProfileModalProps> = ({
  isOpen,
  onClose,
  kidProfile,
  onSaveProfile,
}) => {
  const [name, setName] = useState(kidProfile.name);
  const [age, setAge] = useState(kidProfile.age);
  const [pickiness, setPickiness] = useState(kidProfile.pickiness);
  const [allergies, setAllergies] = useState<string[]>(kidProfile.allergies || []);
  const [favoriteDips, setFavoriteDips] = useState<string[]>(kidProfile.favoriteDips || []);
  const [dislikes, setDislikes] = useState(kidProfile.dislikes || '');
  const [preferences, setPreferences] = useState(kidProfile.preferences || '');

  if (!isOpen) return null;

  const toggleAllergy = (item: string) => {
    if (allergies.includes(item)) {
      setAllergies(allergies.filter((a) => a !== item));
    } else {
      setAllergies([...allergies, item]);
    }
  };

  const toggleDip = (item: string) => {
    if (favoriteDips.includes(item)) {
      setFavoriteDips(favoriteDips.filter((d) => d !== item));
    } else {
      setFavoriteDips([...favoriteDips, item]);
    }
  };

  const handleSave = () => {
    onSaveProfile({
      name,
      age,
      pickiness,
      allergies,
      favoriteDips,
      dislikes,
      preferences,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4">
      <div
        className="w-full max-w-md bg-amber-50 rounded-3xl shadow-2xl border border-amber-300 max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        id="kid-profile-modal"
      >
        {/* Header */}
        <div className="bg-amber-200/80 p-4 text-amber-950 flex items-center justify-between border-b border-amber-300">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-300 flex items-center justify-center text-amber-950 font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                Child Preferences & Safety
              </h3>
              <p className="text-[11px] font-semibold text-amber-800">
                BananaBot personalizes every meal idea for this profile
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-amber-300 hover:bg-amber-400 text-amber-950 transition"
            id="close-kid-profile-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Name & Age */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-amber-950 mb-1">
                Child Name / Nickname:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Leo"
                className="w-full px-3 py-2 bg-white text-amber-950 font-semibold rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                id="kid-name-input"
              />
            </div>
            <div>
              <label className="block font-bold text-amber-950 mb-1">
                Age:
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 2.5 yrs"
                className="w-full px-3 py-2 bg-white text-amber-950 font-semibold rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                id="kid-age-input"
              />
            </div>
          </div>

          {/* Pickiness Level */}
          <div>
            <label className="block font-bold text-amber-950 mb-1">
              Pickiness Level:
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['Low', 'Moderate', 'High', 'Extreme'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPickiness(level)}
                  className={`py-2 px-1 rounded-xl font-bold text-[11px] border transition ${
                    pickiness === level
                      ? 'bg-amber-900 text-amber-50 border-amber-950 shadow-xs'
                      : 'bg-white text-amber-950 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Allergies / Safety Constraints */}
          <div>
            <label className="block font-bold text-amber-950 mb-1 flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              <span>Allergies / Dietary Restrictions:</span>
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-red-50/60 rounded-xl border border-red-200">
              {ALLERGY_OPTIONS.map((item) => {
                const isSelected = allergies.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAllergy(item)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center space-x-1 ${
                      isSelected
                        ? 'bg-red-600 text-white border-red-700 shadow-2xs'
                        : 'bg-white text-red-900 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3" /> : null}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Favorite Dips */}
          <div>
            <label className="block font-bold text-amber-950 mb-1 flex items-center space-x-1">
              <Heart className="w-3.5 h-3.5 text-amber-600" />
              <span>Favorite Dips / Sauce Enhancers:</span>
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-amber-100/50 rounded-xl border border-amber-200">
              {DIP_OPTIONS.map((dip) => {
                const isSelected = favoriteDips.includes(dip);
                return (
                  <button
                    key={dip}
                    type="button"
                    onClick={() => toggleDip(dip)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      isSelected
                        ? 'bg-amber-900 text-amber-50 border-amber-950'
                        : 'bg-white text-amber-950 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <span>{dip}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sensory Dislikes */}
          <div>
            <label className="block font-bold text-amber-950 mb-1">
              Sensory Dislikes / Rule (e.g. "No green specs", "Foods cannot touch"):
            </label>
            <input
              type="text"
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
              placeholder="e.g. No green specs, items must be separated"
              className="w-full px-3 py-2 bg-white text-amber-950 font-medium rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
              id="kid-dislikes-input"
            />
          </div>

          {/* Loved textures */}
          <div>
            <label className="block font-bold text-amber-950 mb-1">
              Loved Textures / Safe Foods:
            </label>
            <input
              type="text"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="e.g. Crunchy crackers, banana slices, cheese cubes"
              className="w-full px-3 py-2 bg-white text-amber-950 font-medium rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
              id="kid-preferences-input"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full py-3 bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-sm rounded-2xl shadow-md transition flex items-center justify-center space-x-2 active:scale-98 cursor-pointer mt-2"
            id="save-kid-profile-btn"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};
