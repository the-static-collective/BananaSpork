import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  Utensils,
  Plus,
  ArrowRight,
  Heart,
  Clock,
  ShieldAlert,
  Sprout,
  ShoppingBag,
  HelpCircle,
} from 'lucide-react';
import { BasketOffer, KidProfile, ParticipationSeed, WitnessReceipt } from '../../types';
import { ActionProposal, TodayProjection } from './types';
import { buildTodayProjection, confirmActionProposal } from './campfireService';
import { IntelligencePanel } from '../intelligence/IntelligencePanel';

interface TodayViewProps {
  seeds: ParticipationSeed[];
  offers: BasketOffer[];
  receipts: WitnessReceipt[];
  kidProfile: KidProfile;
  proposals: ActionProposal[];
  runtimeMode: string;
  onPledgeNeed: (seedId: string, needId: string, pledgedBy: string) => void;
  onConfirmFulfillment: (seedId: string, needId: string) => void;
  onConfirmProposal: (proposalId: string) => void;
  onOpenPantryRescue: () => void;
  onOpenUniversalComposer: () => void;
  onNavigateToTab: (tab: 'porch' | 'basket' | 'grow' | 'remember') => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  seeds,
  offers,
  receipts,
  kidProfile,
  proposals,
  runtimeMode,
  onPledgeNeed,
  onConfirmFulfillment,
  onConfirmProposal,
  onOpenPantryRescue,
  onOpenUniversalComposer,
  onNavigateToTab,
}) => {
  const projection: TodayProjection = buildTodayProjection(
    seeds,
    offers,
    receipts,
    kidProfile,
    proposals
  );

  return (
    <div className="flex-1 bg-amber-50/60 overflow-y-auto p-3 sm:p-6 pb-24 md:pb-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-950 to-amber-900 text-amber-50 p-4 sm:p-6 rounded-3xl border border-amber-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔥</span>
            <h2 className="font-extrabold text-xl sm:text-2xl text-amber-100">
              Campfire Household Today
            </h2>
            <span className="text-[10px] font-bold bg-amber-800 text-amber-200 px-2 py-0.5 rounded-full border border-amber-700">
              {runtimeMode === 'shared_campfire' ? 'Shared Circle' : 'This-Device Demo'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-amber-200 mt-1 font-medium max-w-xl">
            Shame-free household read projection • Offer. Join. Remember.
          </p>
        </div>

        {/* Quick Action Button */}
        <button
          onClick={onOpenUniversalComposer}
          className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs px-4 py-2.5 rounded-2xl transition flex items-center space-x-2 shadow-xs cursor-pointer min-h-[44px] shrink-0"
          id="today-quick-create-btn"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Universal Create</span>
        </button>
      </div>

      {/* THREE CORE QUESTIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* PANEL 1: WHAT NEEDS ATTENTION? */}
        <section
          className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-200 shadow-xs flex flex-col space-y-3"
          aria-labelledby="heading-needs-attention"
        >
          <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
            <h3
              id="heading-needs-attention"
              className="font-extrabold text-amber-950 text-sm flex items-center space-x-2"
            >
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>1. What Needs Attention?</span>
            </h3>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
              {projection.needsAttention.length} Items
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {projection.needsAttention.length === 0 ? (
              <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/80 text-center text-xs text-amber-900 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="font-bold">All clear for now!</p>
                <p className="text-[11px] text-amber-800">No urgent needs or pending proposals.</p>
              </div>
            ) : (
              projection.needsAttention.map((item) => (
                <div
                  key={item.id}
                  className="bg-amber-50/90 border border-amber-200 p-3 rounded-2xl space-y-2 hover:border-amber-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-extrabold bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                      {item.badge}
                    </span>
                    {item.type === 'meal_concern' && (
                      <span className="text-xs">🥦</span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-extrabold text-amber-950 text-xs">{item.title}</h4>
                    <p className="text-[11px] text-amber-800 font-medium leading-relaxed mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>

                  {/* Contextual Action Button */}
                  {item.type === 'meal_concern' ? (
                    <button
                      onClick={onOpenPantryRescue}
                      className="w-full py-2 px-3 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-extrabold text-xs transition flex items-center justify-center space-x-1.5 min-h-[44px] cursor-pointer"
                    >
                      <Utensils className="w-3.5 h-3.5 text-amber-800" />
                      <span>{item.actionLabel}</span>
                    </button>
                  ) : item.type === 'unconfirmed_proposal' && item.proposalId ? (
                    <button
                      onClick={() => onConfirmProposal(item.proposalId!)}
                      className="w-full py-2 px-3 rounded-xl bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-xs transition flex items-center justify-center space-x-1.5 min-h-[44px] cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                      <span>{item.actionLabel}</span>
                    </button>
                  ) : item.type === 'open_need' && item.seedId && item.needId ? (
                    <button
                      onClick={() => onPledgeNeed(item.seedId!, item.needId!, 'Local Member (You)')}
                      className="w-full py-2 px-3 rounded-xl bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-xs transition flex items-center justify-center space-x-1.5 min-h-[44px] cursor-pointer"
                    >
                      <Heart className="w-3.5 h-3.5 text-amber-300" />
                      <span>{item.actionLabel}</span>
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        {/* PANEL 2: WHAT CAN I DO? */}
        <section
          className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-200 shadow-xs flex flex-col space-y-3"
          aria-labelledby="heading-what-can-i-do"
        >
          <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
            <h3
              id="heading-what-can-i-do"
              className="font-extrabold text-amber-950 text-sm flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
              <span>2. What Can I Do?</span>
            </h3>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
              {projection.canDo.length} Actions
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {projection.canDo.map((item) => (
              <div
                key={item.id}
                className="bg-amber-50/90 border border-amber-200 p-3 rounded-2xl space-y-2 hover:border-amber-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-extrabold bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    {item.badge}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-amber-950 text-xs">{item.title}</h4>
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed mt-0.5">
                    {item.subtitle}
                  </p>
                </div>

                {item.type === 'active_pledge' && item.seedId && item.needId ? (
                  <button
                    onClick={() => onConfirmFulfillment(item.seedId!, item.needId!)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-emerald-50 font-extrabold text-xs transition flex items-center justify-center space-x-1.5 min-h-[44px] cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{item.actionLabel}</span>
                  </button>
                ) : item.type === 'available_offer' ? (
                  <button
                    onClick={() => onNavigateToTab('basket')}
                    className="w-full py-2 px-3 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-extrabold text-xs transition flex items-center justify-center space-x-1.5 min-h-[44px] cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-800" />
                    <span>{item.actionLabel}</span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenUniversalComposer}
                    className="w-full py-2 px-3 rounded-xl bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-xs transition flex items-center justify-center space-x-1.5 min-h-[44px] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300" />
                    <span>{item.actionLabel}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* PANEL 3: WHAT CHANGED? (INCLUDES PRIVATE HELD DONKEY NOTES) */}
        <section
          className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-200 shadow-xs flex flex-col space-y-3"
          aria-labelledby="heading-what-changed"
        >
          <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
            <h3
              id="heading-what-changed"
              className="font-extrabold text-amber-950 text-sm flex items-center space-x-2"
            >
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>3. What Changed?</span>
            </h3>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
              {projection.whatChanged.length} Updates
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {projection.whatChanged.length === 0 ? (
              <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/80 text-center text-xs text-amber-900">
                No recent activity recorded yet.
              </div>
            ) : (
              projection.whatChanged.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl space-y-1.5 border transition ${
                    item.isHeldNote
                      ? 'bg-amber-100/90 border-amber-300 shadow-2xs'
                      : 'bg-amber-50/90 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    {item.isHeldNote ? (
                      <span className="font-extrabold text-amber-950 flex items-center space-x-1 bg-amber-200 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3 text-amber-800" />
                        <span>Private Held Draft (This Device Only)</span>
                      </span>
                    ) : (
                      <span className="font-bold text-amber-800 uppercase tracking-wider">
                        Confirmed Remembrance
                      </span>
                    )}
                    <span className="text-amber-800/80 font-medium">{item.timestamp}</span>
                  </div>

                  <h4 className="font-extrabold text-amber-950 text-xs">{item.title}</h4>
                  <p className="text-[11px] text-amber-900 font-medium leading-relaxed italic">
                    {item.subtitle}
                  </p>

                  {item.isHeldNote && (
                    <div className="text-[10px] text-amber-800 font-semibold pt-0.5">
                      🔒 Never auto-sent • Excluded from Witness Ledger
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* HOUSEHOLD INTELLIGENCE PANEL (PASS 5) */}
      <IntelligencePanel
        receipts={receipts}
        seeds={seeds}
        offers={offers}
        onPledgeNeed={onPledgeNeed}
      />
    </div>
  );
};
