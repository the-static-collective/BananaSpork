import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Plus,
  Share2,
  Check,
  ShieldCheck,
  Trees,
  GitFork,
  ArrowRight,
  Send,
  Heart,
  Package,
  Clock,
  UserCheck,
  Search,
  CheckCircle2,
  Lock,
  Layers,
  Leaf,
  Sprout,
  Flower2
} from 'lucide-react';
import {
  BasketOffer,
  ParticipationSeed,
  WitnessReceipt,
  BasketCategory,
  SeedStage
} from '../types';

interface JubileeHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  offers: BasketOffer[];
  seeds: ParticipationSeed[];
  receipts: WitnessReceipt[];
  runtimeMode?: 'shared_campfire' | 'this_device_demo';
  currentUserName?: string;
  onAddOffer: (offer: BasketOffer) => void;
  onAddSeed: (seed: ParticipationSeed) => void;
  onPledgeNeed: (seedId: string, needId: string, pledgedBy: string) => void;
  onConfirmFulfillment: (seedId: string, needId: string) => void;
  onSendToChatChannel: (text: string) => void;
}

export const JubileeHubModal: React.FC<JubileeHubModalProps> = ({
  isOpen,
  onClose,
  offers,
  seeds,
  receipts,
  runtimeMode = 'this_device_demo',
  currentUserName = 'Local Member (You)',
  onAddOffer,
  onAddSeed,
  onPledgeNeed,
  onConfirmFulfillment,
  onSendToChatChannel,
}) => {
  const [activeTab, setActiveTab] = useState<'offer' | 'join' | 'remember' | 'forest'>('offer');

  // Offer Form State
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferCategory, setNewOfferCategory] = useState<BasketCategory>('Tools');
  const [newOfferAvailability, setNewOfferAvailability] = useState('Weekends / Evening');
  const [newOfferBoundary, setNewOfferBoundary] = useState('Local neighborhood radius');
  const [newOfferIcon, setNewOfferIcon] = useState('🛻');

  // Seed / Need Form State
  const [showSeedForm, setShowSeedForm] = useState(false);
  const [newSeedTitle, setNewSeedTitle] = useState('');
  const [newSeedDesc, setNewSeedDesc] = useState('');
  const [newSeedNeedsText, setNewSeedNeedsText] = useState('');
  const [newSeedMakesPossible, setNewSeedMakesPossible] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  if (!isOpen) return null;

  const categories: string[] = ['All', 'Tools', 'Skills', 'Time', 'Food', 'Transport', 'Care', 'Creative'];

  const filteredOffers = offers.filter((off) => {
    const matchesSearch =
      off.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      off.contributorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'All' || off.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const filteredSeeds = seeds.filter((seed) => {
    return (
      seed.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seed.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreateOffer = () => {
    if (!newOfferTitle.trim()) return;
    const created: BasketOffer = {
      id: `off-${Date.now()}`,
      title: newOfferTitle.trim(),
      category: newOfferCategory,
      contributorName: currentUserName,
      availability: newOfferAvailability.trim() || 'Flexible',
      boundary: newOfferBoundary.trim() || 'Local neighborhood',
      icon: newOfferIcon,
      timestamp: 'Just now',
    };
    onAddOffer(created);
    setNewOfferTitle('');
    setShowOfferForm(false);
  };

  const handleCreateSeed = () => {
    if (!newSeedTitle.trim()) return;
    const rawNeeds = newSeedNeedsText
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line, idx) => ({
        id: `need-${Date.now()}-${idx}`,
        title: line.trim(),
        category: 'Tools' as BasketCategory,
        status: 'open' as const,
      }));

    const rawPossibilities = newSeedMakesPossible
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const created: ParticipationSeed = {
      id: `seed-${Date.now()}`,
      title: newSeedTitle.trim(),
      stage: 'Seed',
      authorName: currentUserName,
      description: newSeedDesc.trim() || 'A new community possibility seed.',
      needs: rawNeeds.length > 0 ? rawNeeds : [{ id: 'n-def', title: 'Community participants', category: 'Time', status: 'open' }],
      makesPossible: rawPossibilities.length > 0 ? rawPossibilities : ['Strengthened community capacity'],
      graftsCount: 1,
      harvestsCount: 0,
      timestamp: 'Just now',
    };

    onAddSeed(created);
    setNewSeedTitle('');
    setNewSeedDesc('');
    setNewSeedNeedsText('');
    setNewSeedMakesPossible('');
    setShowSeedForm(false);
  };

  const getStageBadge = (stage: SeedStage) => {
    switch (stage) {
      case 'Seed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-950 border border-amber-300 flex items-center space-x-1"><Sprout className="w-3 h-3 text-amber-700" /><span>Seed</span></span>;
      case 'Sprout':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 text-emerald-950 border border-emerald-300 flex items-center space-x-1"><Leaf className="w-3 h-3 text-emerald-700" /><span>Sprout</span></span>;
      case 'Growing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-200 text-teal-950 border border-teal-300 flex items-center space-x-1"><Trees className="w-3 h-3 text-teal-700" /><span>Growing</span></span>;
      case 'Flowering':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-950 border border-rose-300 flex items-center space-x-1"><Flower2 className="w-3 h-3 text-rose-700" /><span>Flowering</span></span>;
      case 'Harvest':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-amber-950 border border-amber-500 flex items-center space-x-1"><Package className="w-3 h-3 text-amber-900" /><span>Harvest</span></span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-stone-200 text-stone-800">Compost</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-950/60 backdrop-blur-sm p-2 sm:p-4">
      <div
        className="w-full max-w-3xl bg-amber-50 rounded-3xl shadow-2xl border-2 border-amber-300 max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
        id="jubilee-hub-container"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 p-3.5 sm:p-4 text-amber-950 flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center text-xl shadow-xs font-black">
              🌱
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base sm:text-lg leading-tight tracking-tight">
                  Jubilee: Proof of Participation
                </h3>
                <span className="bg-amber-900 text-amber-100 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-amber-900 font-semibold">
                Organizing participation as a first-class object • Zero market friction
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-amber-200 hover:bg-amber-100 text-amber-950 transition cursor-pointer"
            id="close-jubilee-hub-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Verbs Navigation Tabs */}
        <div className="flex border-b border-amber-200 bg-amber-100/80 p-1.5 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('offer')}
            className={`flex-1 min-w-[100px] py-2.5 px-3 text-xs font-extrabold rounded-2xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'offer'
                ? 'bg-amber-900 text-amber-50 shadow-xs'
                : 'text-amber-900 hover:bg-amber-200/70'
            }`}
            id="jubilee-tab-offer"
          >
            <span className="text-sm">🌱</span>
            <span>Offer What You Can</span>
            <span className="bg-amber-200/30 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {offers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 min-w-[100px] py-2.5 px-3 text-xs font-extrabold rounded-2xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'join'
                ? 'bg-amber-900 text-amber-50 shadow-xs'
                : 'text-amber-900 hover:bg-amber-200/70'
            }`}
            id="jubilee-tab-join"
          >
            <span className="text-sm">🌿</span>
            <span>Join What Is Growing</span>
            <span className="bg-amber-200/30 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {seeds.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('remember')}
            className={`flex-1 min-w-[100px] py-2.5 px-3 text-xs font-extrabold rounded-2xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'remember'
                ? 'bg-amber-900 text-amber-50 shadow-xs'
                : 'text-amber-900 hover:bg-amber-200/70'
            }`}
            id="jubilee-tab-remember"
          >
            <span className="text-sm">📜</span>
            <span>Witness Ledger</span>
            <span className="bg-amber-200/30 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {receipts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('forest')}
            className={`py-2.5 px-3 text-xs font-extrabold rounded-2xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'forest'
                ? 'bg-amber-900 text-amber-50 shadow-xs'
                : 'text-amber-900 hover:bg-amber-200/70'
            }`}
            id="jubilee-tab-forest"
          >
            <Trees className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Forest View</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
          {/* ================= OFFERS TAB ================= */}
          {activeTab === 'offer' && (
            <div className="space-y-4 animate-scale-up">
              {/* Header Banner */}
              <div className="bg-amber-100 p-3.5 rounded-2xl border border-amber-300 flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-black text-sm text-amber-950 flex items-center space-x-1.5">
                    <span>The Shared Community Basket</span>
                  </h4>
                  <p className="text-xs text-amber-800 font-medium mt-0.5">
                    No money, credits, or bargaining. List what you are happy to share (tools, skills, food, time).
                  </p>
                </div>

                {runtimeMode === 'this_device_demo' ? (
                  <button
                    onClick={() => setShowOfferForm(!showOfferForm)}
                    className="bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-xs px-3 py-2 rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                    id="add-new-offer-btn"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Local Offer</span>
                  </button>
                ) : (
                  <span className="max-w-56 rounded-xl bg-amber-200 px-3 py-2 text-[10px] font-bold text-amber-900">
                    Shared offers begin as pledges to an open need. Use Garden for the
                    role-gated action.
                  </span>
                )}
              </div>

              {/* Offer Creation Form */}
              {showOfferForm && runtimeMode === 'this_device_demo' && (
                <div className="bg-white p-4 rounded-2xl border-2 border-amber-400 shadow-md space-y-3">
                  <h5 className="font-extrabold text-amber-950 text-xs uppercase tracking-wide">
                    Create New Basket Offer:
                  </h5>

                  <div className="grid sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-amber-950 mb-1">
                        What can you share?
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Pickup truck, 2 hrs babysitting, Bread starter"
                        value={newOfferTitle}
                        onChange={(e) => setNewOfferTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-amber-50 text-amber-950 font-bold rounded-xl border border-amber-300"
                        id="offer-title-input"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-amber-950 mb-1">
                        Category:
                      </label>
                      <select
                        value={newOfferCategory}
                        onChange={(e) => setNewOfferCategory(e.target.value as BasketCategory)}
                        className="w-full px-3 py-2 bg-amber-50 text-amber-950 font-bold rounded-xl border border-amber-300"
                      >
                        {['Tools', 'Skills', 'Time', 'Food', 'Transport', 'Care', 'Creative'].map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-amber-950 mb-1">
                        Availability Notes:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Saturday mornings, Evenings"
                        value={newOfferAvailability}
                        onChange={(e) => setNewOfferAvailability(e.target.value)}
                        className="w-full px-3 py-1.5 bg-amber-50 text-amber-950 text-xs rounded-xl border border-amber-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-amber-950 mb-1">
                        Boundary / Conditions:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. First Campfire local radius"
                        value={newOfferBoundary}
                        onChange={(e) => setNewOfferBoundary(e.target.value)}
                        className="w-full px-3 py-1.5 bg-amber-50 text-amber-950 text-xs rounded-xl border border-amber-300"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      onClick={() => setShowOfferForm(false)}
                      className="px-3 py-1.5 bg-amber-200 text-amber-950 font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateOffer}
                      className="px-4 py-1.5 bg-amber-900 text-amber-50 font-extrabold rounded-xl shadow-xs"
                      id="save-offer-btn"
                    >
                      Save Offer to Basket
                    </button>
                  </div>
                </div>
              )}

              {/* Category Filter bar */}
              <div className="flex space-x-1.5 overflow-x-auto no-scrollbar pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-amber-900 text-amber-50 shadow-2xs'
                        : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100/80'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Offers Grid */}
              <div className="grid sm:grid-cols-2 gap-3">
                {filteredOffers.map((off) => (
                  <div
                    key={off.id}
                    className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-2xs space-y-2.5 hover:border-amber-400 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{off.icon}</span>
                        <div>
                          <h5 className="font-extrabold text-amber-950 text-xs">
                            {off.title}
                          </h5>
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                            {off.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] text-amber-900/90 font-medium bg-amber-50/70 p-2 rounded-xl border border-amber-100">
                      <div>👤 <strong>Offered by:</strong> {off.contributorName}</div>
                      <div>⏱️ <strong>When:</strong> {off.availability}</div>
                      <div>🔒 <strong>Boundary:</strong> {off.boundary}</div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-amber-100">
                      <span className="text-[10px] text-amber-800 font-medium">
                        {off.timestamp}
                      </span>

                      <button
                        onClick={() => {
                          onSendToChatChannel(`🌱 **Basket Offer**: ${off.contributorName} offered "${off.title}" (${off.category}). Available: ${off.availability}`);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[10px] rounded-lg transition flex items-center space-x-1"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Post to Chat</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= JOIN / SEEDS TAB ================= */}
          {activeTab === 'join' && (
            <div className="space-y-4 animate-scale-up">
              {/* Header Banner */}
              <div className="bg-amber-100 p-3.5 rounded-2xl border border-amber-300 flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-black text-sm text-amber-950 flex items-center space-x-1.5">
                    <span>Possibility Seeds & Open Needs</span>
                  </h4>
                  <p className="text-xs text-amber-800 font-medium mt-0.5">
                    {runtimeMode === 'shared_campfire'
                      ? 'Inspect durable needs and offer states here. Garden exposes only the actions authorized for this account.'
                      : 'See what may grow on this device and try the local pledge loop.'}
                  </p>
                </div>

                {runtimeMode === 'this_device_demo' ? (
                  <button
                    onClick={() => setShowSeedForm(!showSeedForm)}
                    className="bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-xs px-3 py-2 rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                    id="open-seed-form-btn"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Local Seed</span>
                  </button>
                ) : (
                  <span className="max-w-56 rounded-xl bg-amber-200 px-3 py-2 text-[10px] font-bold text-amber-900">
                    Shared creation starts as a Garden proposal and succeeds only through
                    an authority command.
                  </span>
                )}
              </div>

              {/* Seed Creation Form */}
              {showSeedForm && runtimeMode === 'this_device_demo' && (
                <div className="bg-white p-4 rounded-2xl border-2 border-amber-400 shadow-md space-y-3">
                  <h5 className="font-extrabold text-amber-950 text-xs uppercase tracking-wide">
                    Plant a Possibility Seed:
                  </h5>

                  <div>
                    <label className="block font-bold text-amber-950 mb-1">
                      Seed Name / Project:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Offline Seed Library, Porch Choir, Community Bread Oven"
                      value={newSeedTitle}
                      onChange={(e) => setNewSeedTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-amber-50 text-amber-950 font-bold rounded-xl border border-amber-300"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-amber-950 mb-1">
                      Description:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Briefly describe what this seed grows into..."
                      value={newSeedDesc}
                      onChange={(e) => setNewSeedDesc(e.target.value)}
                      className="w-full px-3 py-1.5 bg-amber-50 text-amber-950 text-xs rounded-xl border border-amber-300"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-amber-950 mb-1">
                        Needs (1 per line):
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Woodworking for box&#10;Volunteers for planting"
                        value={newSeedNeedsText}
                        onChange={(e) => setNewSeedNeedsText(e.target.value)}
                        className="w-full px-3 py-1.5 bg-amber-50 text-amber-950 text-xs rounded-xl border border-amber-300"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-amber-950 mb-1 flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Possibility Seed (Makes Possible...):</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="If this succeeds... what becomes possible next?&#10;e.g. Garden Saturdays"
                        value={newSeedMakesPossible}
                        onChange={(e) => setNewSeedMakesPossible(e.target.value)}
                        className="w-full px-3 py-1.5 bg-amber-50 text-amber-950 text-xs rounded-xl border border-amber-300"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      onClick={() => setShowSeedForm(false)}
                      className="px-3 py-1.5 bg-amber-200 text-amber-950 font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateSeed}
                      className="px-4 py-1.5 bg-amber-900 text-amber-50 font-extrabold rounded-xl shadow-xs"
                      id="save-seed-btn"
                    >
                      Plant Seed in Circle
                    </button>
                  </div>
                </div>
              )}

              {/* Seed Cards List */}
              <div className="space-y-3">
                {filteredSeeds.map((seed) => (
                  <div
                    key={seed.id}
                    className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between border-b border-amber-100 pb-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h5 className="font-extrabold text-amber-950 text-sm">
                            {seed.title}
                          </h5>
                          {getStageBadge(seed.stage)}
                        </div>
                        <p className="text-xs text-amber-800/90 font-medium mt-0.5">
                          {seed.description}
                        </p>
                      </div>

                      <span className="text-[10px] text-amber-800 font-semibold shrink-0">
                        by {seed.authorName}
                      </span>
                    </div>

                    {/* Needs checklist */}
                    <div className="space-y-1.5">
                      <h6 className="font-extrabold text-[11px] text-amber-900 uppercase tracking-wider">
                        Tangible Needs to Fulfill:
                      </h6>

                      <div className="space-y-1">
                        {seed.needs.map((nd) => (
                          <div
                            key={nd.id}
                            className="p-2 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-2">
                              {nd.status === 'confirmed' || nd.status === 'fulfilled' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : ['pledged', 'accepted', 'reported'].includes(nd.status) ? (
                                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              ) : (
                                <Package className="w-4 h-4 text-amber-800 shrink-0" />
                              )}
                              <span className="font-bold text-amber-950">{nd.title}</span>
                              <span className="text-[10px] bg-amber-200 text-amber-950 font-bold px-1.5 py-0.2 rounded">
                                {nd.category}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              {(nd.status === 'confirmed' || nd.status === 'fulfilled') && (
                                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                                  Fulfilled{nd.pledgedBy ? ` by ${nd.pledgedBy}` : ''}
                                </span>
                              )}

                              {runtimeMode === 'this_device_demo' && nd.status === 'pledged' && (
                                <button
                                  onClick={() => onConfirmFulfillment(seed.id, nd.id)}
                                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] rounded-lg transition"
                                >
                                  Confirm Arrival
                                </button>
                              )}

                              {runtimeMode === 'this_device_demo' && nd.status === 'open' && (
                                <button
                                  onClick={() => onPledgeNeed(seed.id, nd.id, currentUserName)}
                                  className="px-2.5 py-1 bg-amber-900 hover:bg-amber-950 text-amber-50 font-bold text-[10px] rounded-lg transition"
                                >
                                  Pledge
                                </button>
                              )}

                              {runtimeMode === 'shared_campfire' &&
                                nd.status !== 'confirmed' &&
                                nd.status !== 'fulfilled' && (
                                  <span className="rounded-md bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold capitalize text-amber-900">
                                    {nd.status.replace('_', ' ')}
                                  </span>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Possibility Seed Box */}
                    <div className="bg-amber-100/70 p-2.5 rounded-xl border border-amber-300 text-xs space-y-1">
                      <div className="flex items-center space-x-1.5 text-amber-950 font-extrabold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                        <span>Possibility Seed (Unlocked Future Capacity):</span>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {seed.makesPossible.map((poss, idx) => (
                          <span
                            key={idx}
                            className="bg-white text-amber-950 font-bold text-[10px] px-2 py-0.5 rounded-md border border-amber-200 flex items-center space-x-1"
                          >
                            <ArrowRight className="w-3 h-3 text-amber-600" />
                            <span>{poss}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= REMEMBER / WITNESS LEDGER TAB ================= */}
          {activeTab === 'remember' && (
            <div className="space-y-4 animate-scale-up">
              {/* Header Banner */}
              <div className="bg-amber-100 p-3.5 rounded-2xl border border-amber-300 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-amber-800" />
                    <h4 className="font-black text-sm text-amber-950">
                      {runtimeMode === 'shared_campfire'
                        ? 'Witness Ledger (Shared Campfire)'
                        : 'Device Activity Log (This-Device Demo)'}
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      runtimeMode === 'shared_campfire'
                        ? 'bg-emerald-200 text-emerald-950 border-emerald-400'
                        : 'bg-amber-200 text-amber-950 border-amber-400'
                    }`}
                  >
                    {runtimeMode === 'shared_campfire' ? 'Shared Campfire' : 'Demo / This device'}
                  </span>
                </div>
                <p className="text-xs text-amber-800 font-medium">
                  {runtimeMode === 'shared_campfire'
                    ? 'Authoritative witness event chain synchronized via Campfire database.'
                    : 'Local session activity history. Connect to Shared Campfire for multi-member authenticated witness ledger.'}
                </p>
              </div>

              {/* Receipt Chain Stream */}
              <div className="space-y-2">
                {receipts.map((rcpt) => (
                  <div
                    key={rcpt.id}
                    className="bg-white p-3 rounded-2xl border border-amber-200 text-xs space-y-1.5 shadow-2xs font-mono"
                  >
                    <div className="flex items-center justify-between font-sans">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-amber-900 text-amber-50 text-[10px] font-black flex items-center justify-center">
                          #{rcpt.sequence}
                        </span>
                        <h5 className="font-bold text-amber-950 text-xs">
                          {rcpt.title}
                        </h5>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full font-sans">
                        {rcpt.actorName}
                      </span>
                    </div>

                    <p className="text-[11px] font-sans text-amber-900/90 leading-snug">
                      {rcpt.details}
                    </p>

                    <div className="bg-amber-50 p-2 rounded-xl text-[9px] text-amber-800 space-y-0.5 border border-amber-200/80">
                      <div>🔑 <strong>Activity Hash:</strong> {rcpt.sha256Hash}</div>
                      <div>🔗 <strong>Predecessor:</strong> {rcpt.predecessorHash}</div>
                      <div>⏱️ <strong>Timestamp:</strong> {rcpt.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= FOREST VIEW TAB ================= */}
          {activeTab === 'forest' && (
            <div className="space-y-4 animate-scale-up">
              <div className="bg-amber-900 text-amber-50 p-4 rounded-2xl shadow-md space-y-2">
                <div className="flex items-center space-x-2">
                  <Trees className="w-5 h-5 text-amber-300" />
                  <h4 className="font-black text-sm">
                    Jubilee Forest View: Community Capacity Graph
                  </h4>
                </div>
                <p className="text-xs text-amber-200 font-medium leading-relaxed">
                  Every completed act leaves behind new capacity. Zoom out to see how individual seeds fork, flower, and unlock new possibilities across your village.
                </p>
              </div>

              {/* Tree Topology Diagram */}
              <div className="bg-white p-4 rounded-2xl border border-amber-300 space-y-4">
                <div className="space-y-3">
                  {seeds.map((sd) => (
                    <div key={sd.id} className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🌳</span>
                          <span className="font-extrabold text-xs text-amber-950">{sd.title}</span>
                          {getStageBadge(sd.stage)}
                        </div>
                        <span className="text-[10px] font-bold text-amber-800">
                          {sd.graftsCount} Grafts • {sd.harvestsCount} Harvests
                        </span>
                      </div>

                      <div className="pl-6 border-l-2 border-amber-300 space-y-1 text-xs">
                        {sd.makesPossible.map((m, idx) => (
                          <div key={idx} className="flex items-center space-x-1 text-amber-900 font-medium">
                            <GitFork className="w-3 h-3 text-amber-600" />
                            <span>{m}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
