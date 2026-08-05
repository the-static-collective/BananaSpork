import React, { useState } from 'react';
import { ShoppingBag, Plus, Filter, Heart, ArrowRight } from 'lucide-react';
import { BasketCategory, BasketOffer, ParticipationSeed } from '../../types';

interface BasketViewProps {
  offers: BasketOffer[];
  seeds: ParticipationSeed[];
  runtimeMode: 'shared_campfire' | 'this_device_demo';
  currentUserRole: string;
  onOpenUniversalComposer: () => void;
  onPledgeNeed: (seedId: string, needId: string, pledgedBy: string) => void;
}

export const BasketView: React.FC<BasketViewProps> = ({
  offers,
  seeds,
  runtimeMode,
  currentUserRole,
  onOpenUniversalComposer,
  onPledgeNeed,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Care', 'Tools', 'Time', 'Food', 'Transport', 'Skills', 'Creative'];

  const filteredOffers =
    selectedCategory === 'All'
      ? offers
      : offers.filter((o) => o.category === selectedCategory);

  // Extract open needs across seeds
  const openNeeds = seeds.flatMap((sd) =>
    sd.needs
      .filter((nd) => nd.status === 'open')
      .map((nd) => ({ ...nd, seedId: sd.id, seedTitle: sd.title, authorName: sd.authorName }))
  );

  return (
    <div className="flex-1 bg-amber-50/60 overflow-y-auto p-3 sm:p-6 pb-24 md:pb-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-950 text-amber-50 p-4 sm:p-6 rounded-3xl border border-amber-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-6 h-6 text-amber-300" />
            <h2 className="font-extrabold text-xl sm:text-2xl text-amber-100">
              {runtimeMode === 'shared_campfire'
                ? 'Shared Neighborhood Basket'
                : 'This-Device Basket'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-amber-200 mt-1 font-medium">
            Mutual care, tools, and available capacities shared with no transactional tracking.
          </p>
        </div>

        <button
          onClick={onOpenUniversalComposer}
          className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs px-4 py-2.5 rounded-2xl transition flex items-center space-x-2 shadow-xs cursor-pointer min-h-[44px] shrink-0"
          id="basket-add-offer-btn"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Share Offer into Basket</span>
        </button>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Filter className="w-4 h-4 text-amber-800 shrink-0 mr-1" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer min-h-[44px] ${
              selectedCategory === cat
                ? 'bg-amber-900 text-amber-50 shadow-2xs'
                : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid 1: Active Shared Basket Offers */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-amber-950 text-sm flex items-center space-x-1.5">
          <span>🌱 Active Basket Offers ({filteredOffers.length})</span>
        </h3>

        {filteredOffers.length === 0 ? (
          <div className="bg-white p-6 rounded-3xl border border-amber-200 text-center text-xs text-amber-900">
            No offers listed under "{selectedCategory}" yet. Click "+ Share Offer" to contribute!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOffers.map((offer) => (
              <div
                key={offer.id}
                className="bg-white p-4 rounded-3xl border border-amber-200 shadow-2xs hover:border-amber-300 transition flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{offer.icon}</span>
                    <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                      {offer.category}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-amber-950 text-sm">{offer.title}</h4>
                  <p className="text-xs text-amber-800 font-medium">
                    Contributed by <strong>{offer.contributorName}</strong>
                  </p>
                  <p className="text-[11px] text-amber-700 font-normal">
                    Availability: {offer.availability} • Boundary: {offer.boundary}
                  </p>
                </div>

                <div className="text-[10px] text-amber-800/80 font-semibold border-t border-amber-100 pt-2 flex items-center justify-between">
                  <span>Available to Household</span>
                  <span>{offer.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid 2: Open Household & Circle Needs */}
      <div className="space-y-3 pt-2">
        <h3 className="font-extrabold text-amber-950 text-sm flex items-center space-x-1.5">
          <span>🌿 Open Circle Needs ({openNeeds.length})</span>
        </h3>

        {openNeeds.length === 0 ? (
          <div className="bg-white p-6 rounded-3xl border border-amber-200 text-center text-xs text-amber-900">
            No open needs in the neighborhood circle right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {openNeeds.map((need) => (
              <div
                key={`${need.seedId}-${need.id}`}
                className="bg-amber-100/80 p-4 rounded-3xl border border-amber-300 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {need.category || 'Care'} Need
                  </span>
                  <h4 className="font-extrabold text-amber-950 text-sm mt-1">{need.title}</h4>
                  <p className="text-xs text-amber-800 font-medium">
                    Seed: "{need.seedTitle}" (By {need.authorName})
                  </p>
                </div>

                {currentUserRole !== 'household' ? (
                  <button
                    onClick={() => onPledgeNeed(need.seedId, need.id, 'Local Member (You)')}
                    className="w-full py-2.5 px-3 rounded-2xl bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-xs transition flex items-center justify-center space-x-1.5 min-h-[44px] cursor-pointer"
                  >
                    <Heart className="w-3.5 h-3.5 text-amber-300" />
                    <span>Pledge Support</span>
                  </button>
                ) : (
                  <p className="rounded-xl bg-amber-200/70 px-3 py-2 text-[11px] font-bold text-amber-900">
                    Household-origin need · awaiting a neighbor or steward offer.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
