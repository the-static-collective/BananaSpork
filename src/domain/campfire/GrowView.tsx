import React from 'react';
import { Sprout, Plus, Heart, CheckCircle2 } from 'lucide-react';
import { ParticipationSeed } from '../../types';

interface GrowViewProps {
  seeds: ParticipationSeed[];
  onOpenUniversalComposer: () => void;
  onPledgeNeed: (seedId: string, needId: string, pledgedBy: string) => void;
  onConfirmFulfillment: (seedId: string, needId: string) => void;
}

export const GrowView: React.FC<GrowViewProps> = ({
  seeds,
  onOpenUniversalComposer,
  onPledgeNeed,
  onConfirmFulfillment,
}) => {
  return (
    <div className="flex-1 bg-amber-50/60 overflow-y-auto p-3 sm:p-6 pb-24 md:pb-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-950 to-amber-900 text-amber-50 p-4 sm:p-6 rounded-3xl border border-amber-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sprout className="w-6 h-6 text-amber-300" />
            <h2 className="font-extrabold text-xl sm:text-2xl text-amber-100">Grow: Participation Seeds</h2>
          </div>
          <p className="text-xs sm:text-sm text-amber-200 mt-1 font-medium">
            Shared capacity cultivation — Plant seeds, sprout needs, and harvest commitments together.
          </p>
        </div>

        <button
          onClick={onOpenUniversalComposer}
          className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs px-4 py-2.5 rounded-2xl transition flex items-center space-x-2 shadow-xs cursor-pointer min-h-[44px] shrink-0"
          id="grow-plant-seed-btn"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Plant New Seed</span>
        </button>
      </div>

      {/* Seeds List */}
      <div className="space-y-4">
        {seeds.map((seed) => (
          <div
            key={seed.id}
            className="bg-white p-4 sm:p-5 rounded-3xl border border-amber-200 shadow-2xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🌱</span>
                  <h3 className="font-extrabold text-amber-950 text-base">{seed.title}</h3>
                  <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                    Stage: {seed.stage}
                  </span>
                </div>
                <p className="text-xs text-amber-800 font-medium mt-1">{seed.description}</p>
              </div>
              <span className="text-[11px] text-amber-700 font-semibold self-start sm:self-auto">
                Planted by {seed.authorName} • {seed.timestamp}
              </span>
            </div>

            {/* Needs inside seed */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                Needs to Sprout this Seed:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {seed.needs.map((need) => (
                  <div
                    key={need.id}
                    className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                      need.status === 'confirmed'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : need.status === 'pledged'
                        ? 'bg-amber-100 border-amber-300 text-amber-950'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{need.title}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">
                        {need.status === 'confirmed'
                          ? '✅ Fulfilled'
                          : need.status === 'pledged'
                          ? `🤝 Pledged by ${need.pledgedBy || 'Neighbor'}`
                          : '🌿 Open Need'}
                      </div>
                    </div>

                    {need.status === 'open' && (
                      <button
                        onClick={() => onPledgeNeed(seed.id, need.id, 'Local Member (You)')}
                        className="py-1.5 px-3 rounded-xl bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-[11px] transition shrink-0 min-h-[44px] cursor-pointer"
                      >
                        Pledge
                      </button>
                    )}

                    {need.status === 'pledged' && (
                      <button
                        onClick={() => onConfirmFulfillment(seed.id, need.id)}
                        className="py-1.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-emerald-50 font-extrabold text-[11px] transition shrink-0 min-h-[44px] cursor-pointer"
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Makes Possible */}
            {seed.makesPossible && seed.makesPossible.length > 0 && (
              <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900">
                <strong className="font-bold text-amber-950">Makes Possible: </strong>
                {seed.makesPossible.join(' • ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
