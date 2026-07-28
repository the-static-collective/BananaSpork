import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, ShieldAlert, Sparkles, User, Users, X, Heart, Smile } from 'lucide-react';
import { KidProfile } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  kidProfile: KidProfile;
  onSaveProfile: (profile: KidProfile) => void;
  onJoinGroup?: (groupName: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  kidProfile,
  onSaveProfile,
  onJoinGroup,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [parentName, setParentName] = useState('Mama Sarah');
  const [phone, setPhone] = useState('+1 (555) 019-2834');
  
  // Child form
  const [childName, setChildName] = useState(kidProfile.name || 'Leo');
  const [childAge, setChildAge] = useState(kidProfile.age || '2.5 years');
  const [pickiness, setPickiness] = useState(kidProfile.pickiness || 'High');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(kidProfile.allergies || []);

  const [selectedGroups, setSelectedGroups] = useState<string[]>([
    'BananaBot 🍌 24/7 Meal Rescue',
    'Partner / Co-Parent Sync 💬',
  ]);

  if (!isOpen) return null;

  const ALLERGY_OPTIONS = ['Peanuts 🥜', 'Dairy 🥛', 'Eggs 🥚', 'Gluten 🌾', 'Tree Nuts 🌰'];

  const toggleAllergy = (a: string) => {
    if (selectedAllergies.includes(a)) {
      setSelectedAllergies(selectedAllergies.filter((item) => item !== a));
    } else {
      setSelectedAllergies([...selectedAllergies, a]);
    }
  };

  const handleFinish = () => {
    onSaveProfile({
      ...kidProfile,
      name: childName,
      age: childAge,
      pickiness,
      allergies: selectedAllergies,
    });
    if (onJoinGroup) {
      selectedGroups.forEach((g) => onJoinGroup(g));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-950/60 backdrop-blur-sm p-3 sm:p-4">
      <div
        className="w-full max-w-md bg-amber-50 rounded-3xl shadow-2xl border-2 border-amber-300 flex flex-col overflow-hidden animate-scale-up"
        id="onboarding-modal-container"
      >
        {/* Header */}
        <div className="bg-amber-400 p-4 text-amber-950 flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center text-xl shadow-xs">
              🍌
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                Welcome to BananaGram
              </h3>
              <p className="text-xs text-amber-900 font-semibold">
                Step {step} of 3 • Zero-Frustration Telegram Fork
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-amber-300 hover:bg-amber-200 text-amber-950 transition"
            id="close-onboarding-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-amber-200 h-1.5">
          <div
            className="bg-amber-900 h-1.5 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Step Contents */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {step === 1 && (
            <div className="space-y-4 animate-scale-up">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-amber-200 text-2xl rounded-2xl mx-auto flex items-center justify-center mb-2 shadow-2xs">
                  👋
                </div>
                <h4 className="font-extrabold text-base text-amber-950">
                  Welcome, Mama!
                </h4>
                <p className="text-amber-800 font-medium">
                  We built BananaGram to remove 100% of the confusion from messaging and toddler meal stress.
                </p>
              </div>

              <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-amber-200">
                <div>
                  <label className="block font-bold text-amber-950 mb-1">
                    Your Name / Nickname:
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="e.g. Mama Sarah"
                    className="w-full px-3 py-2 bg-amber-50 text-amber-950 font-semibold rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    id="onboarding-parent-name-input"
                  />
                </div>

                <div>
                  <label className="block font-bold text-amber-950 mb-1">
                    Cell Number (for 1-tap SMS co-parent sync):
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 bg-amber-50 text-amber-950 font-semibold rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    id="onboarding-phone-input"
                  />
                  <p className="text-[10px] text-amber-700/80 mt-1 font-medium">
                    🔒 No passcodes or complicated log-ins required.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-sm rounded-2xl shadow-md transition flex items-center justify-center space-x-2 active:scale-98 cursor-pointer"
                id="onboarding-step1-next-btn"
              >
                <span>Next: Child Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-scale-up">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-amber-200 text-2xl rounded-2xl mx-auto flex items-center justify-center mb-2 shadow-2xs">
                  👶
                </div>
                <h4 className="font-extrabold text-base text-amber-950">
                  Tell BananaBot About Your Child
                </h4>
                <p className="text-amber-800 font-medium">
                  BananaBot customizes all 2-minute recipes based on your kiddo’s age and allergies.
                </p>
              </div>

              <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-amber-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-amber-950 mb-1">
                      Child Name:
                    </label>
                    <input
                      type="text"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-amber-50 text-amber-950 font-bold rounded-xl border border-amber-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-amber-950 mb-1">
                      Age / Stage:
                    </label>
                    <input
                      type="text"
                      value={childAge}
                      onChange={(e) => setChildAge(e.target.value)}
                      className="w-full px-3 py-1.5 bg-amber-50 text-amber-950 font-bold rounded-xl border border-amber-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-amber-950 mb-1">
                    Pickiness Level:
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['Low', 'Moderate', 'High', 'Extreme'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setPickiness(lvl)}
                        className={`py-1.5 text-[11px] font-bold rounded-lg border transition ${
                          pickiness === lvl
                            ? 'bg-amber-900 text-amber-50 border-amber-950'
                            : 'bg-amber-50 text-amber-950 border-amber-200'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-amber-950 mb-1 flex items-center space-x-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                    <span>Allergies to Block:</span>
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {ALLERGY_OPTIONS.map((a) => {
                      const sel = selectedAllergies.includes(a);
                      return (
                        <button
                          key={a}
                          onClick={() => toggleAllergy(a)}
                          className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition ${
                            sel
                              ? 'bg-red-600 text-white border-red-700'
                              : 'bg-amber-50 text-amber-950 border-amber-200'
                          }`}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setStep(1)}
                  className="py-3 px-4 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-2xl transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-sm rounded-2xl shadow-md transition flex items-center justify-center space-x-2 active:scale-98 cursor-pointer"
                  id="onboarding-step2-next-btn"
                >
                  <span>Next: Parent Groups</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-scale-up">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-amber-200 text-2xl rounded-2xl mx-auto flex items-center justify-center mb-2 shadow-2xs">
                  💬
                </div>
                <h4 className="font-extrabold text-base text-amber-950">
                  Join Your Parent Channels
                </h4>
                <p className="text-amber-800 font-medium">
                  Select which zero-drama parent communities you want pinned in your Telegram feed:
                </p>
              </div>

              <div className="space-y-2 bg-white p-3 rounded-2xl border border-amber-200 max-h-56 overflow-y-auto">
                {[
                  {
                    name: 'BananaBot 🍌 24/7 Meal Rescue',
                    desc: 'Instant AI recipe & meltdown support',
                  },
                  {
                    name: 'Partner / Co-Parent Sync 💬',
                    desc: '1-tap food logs for hubby or nanny',
                  },
                  {
                    name: '#Meltdown-SOS 🚨',
                    desc: 'Emergency sensory tricks for active crying',
                  },
                  {
                    name: '#5-Minute-Dinners ⏱️',
                    desc: '3-ingredient recipes for low energy days',
                  },
                ].map((grp) => {
                  const isChecked = selectedGroups.includes(grp.name);
                  return (
                    <div
                      key={grp.name}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedGroups(selectedGroups.filter((g) => g !== grp.name));
                        } else {
                          setSelectedGroups([...selectedGroups, grp.name]);
                        }
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start space-x-2.5 ${
                        isChecked
                          ? 'bg-amber-100 border-amber-400 text-amber-950'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0 ${
                          isChecked ? 'bg-amber-900 text-white' : 'bg-white border border-amber-300'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-amber-950">{grp.name}</div>
                        <div className="text-[11px] text-amber-800/80">{grp.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleFinish}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-sm rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 active:scale-98 cursor-pointer border border-amber-600/30"
                id="finish-onboarding-btn"
              >
                <Sparkles className="w-4 h-4 fill-amber-200" />
                <span>Launch BananaGram Messenger!</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
