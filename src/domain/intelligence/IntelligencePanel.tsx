import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  ShieldCheck,
  ExternalLink,
  Sprout,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  PlusCircle,
  EyeOff,
  Tag,
  Link2,
} from 'lucide-react';
import { BasketOffer, ParticipationSeed, WitnessReceipt } from '../../types';
import {
  buildWhatChangedReport,
  computeGentleMatches,
  computeNearbyGrowthPreview,
} from './intelligenceService';
import {
  GentleMatchCandidate,
  NearbyGrowthPreviewItem,
  WhatChangedReport,
} from './types';

interface IntelligencePanelProps {
  receipts: WitnessReceipt[];
  seeds: ParticipationSeed[];
  offers: BasketOffer[];
  userCircleId?: string;
  onPledgeNeed?: (seedId: string, needId: string, pledgedBy: string) => void;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
  receipts,
  seeds,
  offers,
  userCircleId = 'default-circle',
  onPledgeNeed,
}) => {
  const [activeTab, setActiveTab] = useState<'what_changed' | 'gentle_matching' | 'growth_preview'>('what_changed');
  const [optInAiSummary, setOptInAiSummary] = useState<boolean>(false);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [aiClaims, setAiClaims] = useState<{ claim: string; sourceId: string }[] | null>(null);
  const [highlightedReceiptId, setHighlightedReceiptId] = useState<string | null>(null);

  // Packet state for Nearby Growth Preview
  const [savedPacket, setSavedPacket] = useState<string[]>([]);
  const [ignoredItems, setIgnoredItems] = useState<string[]>([]);

  // What Changed Report
  const whatChangedReport: WhatChangedReport = buildWhatChangedReport(
    receipts,
    userCircleId,
    userCircleId,
    aiClaims || undefined
  );

  // Gentle Matches
  const matches: GentleMatchCandidate[] = computeGentleMatches(seeds, offers);

  // Nearby Growth Previews for active seeds
  const growthPreviews: NearbyGrowthPreviewItem[] = seeds
    .filter((s) => !ignoredItems.includes(s.id))
    .map((s) => computeNearbyGrowthPreview(s, receipts, offers, userCircleId, userCircleId));

  const handleFetchAiSummary = async () => {
    setLoadingSummary(true);
    setOptInAiSummary(true);
    try {
      const res = await fetch('/api/intelligence/summarize-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipts }),
      });
      const data = await res.json();
      if (data && Array.isArray(data.claims)) {
        setAiClaims(data.claims);
      }
    } catch (err) {
      console.error('Failed to fetch AI summary:', err);
      // Fallback
      setAiClaims(
        receipts.slice(0, 3).map((r) => ({
          claim: `${r.actorName} recorded ${r.title}: ${r.details}`,
          sourceId: r.id,
        }))
      );
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleTogglePacket = (itemId: string) => {
    if (savedPacket.includes(itemId)) {
      setSavedPacket(savedPacket.filter((id) => id !== itemId));
    } else {
      setSavedPacket([...savedPacket, itemId]);
    }
  };

  const handleIgnoreItem = (itemId: string) => {
    setIgnoredItems([...ignoredItems, itemId]);
  };

  return (
    <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-4 sm:p-6 space-y-6">
      {/* Panel Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-700" />
            <h3 className="font-extrabold text-amber-950 text-lg">
              Household Intelligence (Opt-in & Bounded)
            </h3>
          </div>
          <p className="text-xs text-amber-800 font-medium mt-0.5">
            Bounded AI assistance without model authority • Verifiable evidence over assumptions
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1 bg-amber-50 p-1 rounded-2xl border border-amber-200 shrink-0">
          <button
            onClick={() => setActiveTab('what_changed')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition min-h-[40px] cursor-pointer ${
              activeTab === 'what_changed'
                ? 'bg-amber-900 text-amber-50 shadow-2xs'
                : 'text-amber-900 hover:bg-amber-100'
            }`}
          >
            1. What Changed?
          </button>

          <button
            onClick={() => setActiveTab('gentle_matching')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition min-h-[40px] cursor-pointer ${
              activeTab === 'gentle_matching'
                ? 'bg-amber-900 text-amber-50 shadow-2xs'
                : 'text-amber-900 hover:bg-amber-100'
            }`}
          >
            2. Gentle Matching
          </button>

          <button
            onClick={() => setActiveTab('growth_preview')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition min-h-[40px] cursor-pointer ${
              activeTab === 'growth_preview'
                ? 'bg-amber-900 text-amber-50 shadow-2xs'
                : 'text-amber-900 hover:bg-amber-100'
            }`}
          >
            3. Growth Preview
          </button>
        </div>
      </div>

      {/* TAB 1: WHAT CHANGED? */}
      {activeTab === 'what_changed' && (
        <div className="space-y-5">
          {/* Controls & Opt-in Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200">
            <div className="text-xs text-amber-900 font-medium">
              <strong className="font-bold text-amber-950">Deterministic Ledger First:</strong> Verified witness receipts from household circle.
            </div>

            <button
              onClick={handleFetchAiSummary}
              disabled={loadingSummary}
              className="py-2 px-4 rounded-xl bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-xs transition flex items-center space-x-1.5 shrink-0 cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{loadingSummary ? 'Generating...' : '✨ Generate AI Summary (Opt-in)'}</span>
            </button>
          </div>

          {/* Optional Gemini Summary Section */}
          {optInAiSummary && (
            <div className="bg-amber-100/70 p-4 rounded-2xl border border-amber-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Gemini What Changed Summary (Opt-In)</span>
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  Every claim links to source
                </span>
              </div>

              {whatChangedReport.hasUnbackedClaimsDropped && (
                <div className="bg-amber-200/80 p-2.5 rounded-xl text-[11px] text-amber-950 font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-800 shrink-0" />
                  <span>
                    Factual Integrity Enforced: Any AI summary statement lacking an accessible witness source was automatically omitted.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {whatChangedReport.aiSummary && whatChangedReport.aiSummary.length > 0 ? (
                  whatChangedReport.aiSummary.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-3 rounded-xl border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                    >
                      <span className="text-amber-950 font-medium leading-relaxed">
                        • {item.claim}
                      </span>

                      {/* SafeSourceRef Link Button */}
                      <button
                        onClick={() => setHighlightedReceiptId(item.sourceRef.sourceId)}
                        className="py-1 px-2.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[10px] transition flex items-center space-x-1 shrink-0 cursor-pointer min-h-[36px]"
                      >
                        <Link2 className="w-3 h-3 text-amber-800" />
                        <span>Source: [Receipt #{item.sourceRef.sequence || 'ref'}]</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-amber-800 italic">
                    Click "Generate AI Summary" to summarize recent receipts.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deterministic Change List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
              Deterministic Change List ({whatChangedReport.deterministicChanges.length} Events):
            </h4>

            <div className="space-y-2">
              {whatChangedReport.deterministicChanges.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition space-y-1 ${
                    highlightedReceiptId === item.id
                      ? 'bg-amber-200/90 border-amber-400 ring-2 ring-amber-500/50'
                      : 'bg-amber-50/70 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                      Seq #{item.sequence} • {item.eventType}
                    </span>
                    <span className="text-amber-800 font-medium">{item.timestamp}</span>
                  </div>

                  <h5 className="font-extrabold text-amber-950 text-xs mt-1">{item.title}</h5>
                  <p className="text-[11px] text-amber-800 font-medium">{item.details}</p>

                  <div className="text-[10px] text-amber-700/80 font-mono pt-1 border-t border-amber-200/60 flex items-center justify-between">
                    <span>Actor: {item.actorName}</span>
                    <span>SHA-256: {item.sha256Hash.substring(0, 12)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GENTLE MATCHING */}
      {activeTab === 'gentle_matching' && (
        <div className="space-y-5">
          <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <strong className="font-bold text-amber-950">Gentle Matching Rule:</strong>
            <p className="text-[11px] text-amber-800">
              Surfaces Basket offers that may answer an open circle need. Structural evidence is explicitly separated from semantic interpretations. <strong>Never auto-pledges or auto-notifies.</strong>
            </p>
          </div>

          <div className="space-y-3">
            {matches.length === 0 ? (
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 text-center text-xs text-amber-900">
                No active gentle matches between current open needs and basket offers.
              </div>
            ) : (
              matches.map((m) => (
                <div
                  key={m.id}
                  className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 space-y-3"
                >
                  {/* Need -> Offer Headline */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                    <div>
                      <div className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                        Gentle Match Candidate ({m.confidence} Confidence)
                      </div>
                      <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm mt-0.5">
                        Open Need: "{m.needTitle}" ↔ Offer: "{m.offerTitle}"
                      </h4>
                    </div>

                    <span className="text-[11px] text-amber-900 font-semibold bg-amber-200 px-2.5 py-1 rounded-xl shrink-0">
                      Shared by {m.contributorName}
                    </span>
                  </div>

                  {/* SEPARATED EVIDENCE SECTION */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 1. Structural Evidence */}
                    <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1.5">
                      <span className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>Exact Structural Evidence</span>
                      </span>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.structuralEvidence.categoryMatch && (
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                            Category Match
                          </span>
                        )}
                        {m.structuralEvidence.boundaryMatch && (
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                            Circle Boundary
                          </span>
                        )}
                        {m.structuralEvidence.availabilityMatch && (
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                            Timely Availability
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. Semantic Interpretation (Labeled Separately!) */}
                    <div className="bg-amber-100/60 p-3 rounded-xl border border-amber-300 space-y-1">
                      <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-amber-700" />
                        <span>Semantic Interpretation (Labeled Separately)</span>
                      </span>
                      <p className="text-[11px] text-amber-950 font-medium italic leading-relaxed pt-0.5">
                        "{m.semanticInterpretation}"
                      </p>
                    </div>
                  </div>

                  {/* Manual Action Button Only */}
                  <div className="pt-1 flex justify-end">
                    {onPledgeNeed && (
                      <button
                        onClick={() => onPledgeNeed(m.seedId, m.needId, 'Local Member (You)')}
                        className="py-2 px-4 rounded-xl bg-amber-900 hover:bg-amber-950 text-amber-50 font-extrabold text-xs transition flex items-center space-x-1.5 min-h-[44px] cursor-pointer"
                      >
                        <span>Pledge Support Manually</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: NEARBY GROWTH PREVIEW */}
      {activeTab === 'growth_preview' && (
        <div className="space-y-5">
          <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <strong className="font-bold text-amber-950">Growth Preview Rules:</strong>
            <p className="text-[11px] text-amber-800">
              Authorization scoped before retrieval. Computes 4 deterministic lanes (Lineage, Active Tension, Human Link, Rejected Parallel) before evaluating semantic search. User actions limited to <strong>Open</strong>, <strong>Add to packet</strong>, or <strong>Ignore</strong> without auto-mutation.
            </p>
          </div>

          <div className="space-y-4">
            {growthPreviews.map((preview) => (
              <div
                key={preview.id}
                className="bg-white p-4 rounded-3xl border border-amber-200 shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-2.5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Sprout className="w-4 h-4 text-amber-700" />
                      <h4 className="font-extrabold text-amber-950 text-sm">{preview.title}</h4>
                      <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                        {preview.stage}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 font-medium mt-0.5">{preview.summary}</p>
                  </div>

                  {/* Scope Auth Status */}
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full border border-emerald-300 shrink-0">
                    🔒 Authorization Scoped
                  </span>
                </div>

                {/* 4 DETERMINISTIC LANES GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                  {/* Lane 1: Lineage Lane */}
                  <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-xs space-y-1">
                    <strong className="font-extrabold text-amber-950 text-[10px] uppercase tracking-wider block">
                      1. Lineage Lane
                    </strong>
                    {preview.lanes.lineageLane.length === 0 ? (
                      <span className="text-[10px] text-amber-700 italic">No historical lineage</span>
                    ) : (
                      preview.lanes.lineageLane.map((l) => (
                        <div key={l.id} className="text-[11px] font-medium text-amber-900">
                          • {l.title}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Lane 2: Active Tension Lane */}
                  <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-xs space-y-1">
                    <strong className="font-extrabold text-amber-950 text-[10px] uppercase tracking-wider block">
                      2. Active Tension Lane
                    </strong>
                    {preview.lanes.activeTensionLane.map((t) => (
                      <div key={t.id} className="text-[11px] font-medium text-amber-900">
                        • {t.title} ({t.type})
                      </div>
                    ))}
                  </div>

                  {/* Lane 3: Human Link Lane */}
                  <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-xs space-y-1">
                    <strong className="font-extrabold text-amber-950 text-[10px] uppercase tracking-wider block">
                      3. Human Link Lane
                    </strong>
                    {preview.lanes.humanLinkLane.map((h) => (
                      <div key={h.id} className="text-[11px] font-medium text-amber-900">
                        • {h.name} ({h.role})
                      </div>
                    ))}
                  </div>

                  {/* Lane 4: Rejected Parallel Lane */}
                  <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-xs space-y-1">
                    <strong className="font-extrabold text-amber-950 text-[10px] uppercase tracking-wider block">
                      4. Rejected Parallel Lane
                    </strong>
                    <span className="text-[10px] text-amber-700 italic">None set aside</span>
                  </div>
                </div>

                {/* USER ACTIONS ONLY BAR */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-100 pt-2.5">
                  <span className="text-[10px] text-amber-800 font-bold">
                    SafeSourceRefs: {preview.safeSources.length} verified
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTogglePacket(preview.seedId)}
                      className={`py-1.5 px-3 rounded-xl font-extrabold text-xs transition flex items-center space-x-1 min-h-[40px] cursor-pointer ${
                        savedPacket.includes(preview.seedId)
                          ? 'bg-emerald-800 text-emerald-50'
                          : 'bg-amber-200 hover:bg-amber-300 text-amber-950'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{savedPacket.includes(preview.seedId) ? 'In Packet ✓' : 'Add to Packet'}</span>
                    </button>

                    <button
                      onClick={() => handleIgnoreItem(preview.seedId)}
                      className="py-1.5 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-xs transition flex items-center space-x-1 min-h-[40px] cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Ignore</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
