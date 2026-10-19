import React, { useMemo, useState } from 'react';
import { admitHelpSlipCarrier } from './envelope';
import { preparePennyCandidate, PENNY_CANDIDATE_SCHEMA, PENNY_SOURCE_LABEL } from '../penny/pennyHelpSlip';
import {
  describeHeldHelpCase,
  type CampfirePourPreview,
  type LinkedNeedConfirmation,
  type PourHeldRequirementResult,
} from './pour';
import type { GardenHeldHelpCase } from './types';
import type { HelpSlipHoldResult } from './holdStore';
import { HelpSlipDetailModal } from './HelpSlipDetailModal';

interface HelpSlipInboxProps {
  heldCases: GardenHeldHelpCase[];
  activeCircle?: { circleId: string; circleLabel: string };
  linkedNeeds: LinkedNeedConfirmation[];
  sharedState: 'current' | 'stale' | 'unavailable';
  onHold: (
    rawText: string,
    metadata: { occurrenceId: string; receivedAt: string }
  ) => HelpSlipHoldResult;
  onPour: (
    heldCase: GardenHeldHelpCase,
    preview: CampfirePourPreview
  ) => Promise<PourHeldRequirementResult>;
  onDiscard: (localCaseId: string) => void;
}

function newOccurrenceId(): string {
  try {
    return `help-slip-arrival:${crypto.randomUUID()}`;
  } catch {
    return `help-slip-arrival:${Date.now()}`;
  }
}

export const HelpSlipInbox: React.FC<HelpSlipInboxProps> = ({
  heldCases,
  activeCircle,
  linkedNeeds,
  sharedState,
  onHold,
  onPour,
  onDiscard,
}) => {
  const [importOpen, setImportOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [previewedRaw, setPreviewedRaw] = useState<string>();
  const [pennyCandidate, setPennyCandidate] = useState(false);
  const [pennyReviewed, setPennyReviewed] = useState(false);
  const [error, setError] = useState<string>();
  const [selectedCaseId, setSelectedCaseId] = useState<string>();

  const selectedCase = useMemo(
    () => heldCases.find((candidate) => candidate.localCaseId === selectedCaseId),
    [heldCases, selectedCaseId]
  );
  const previewAdmission = previewedRaw ? admitHelpSlipCarrier(previewedRaw) : undefined;

  const handlePreview = () => {
    let carrier = rawText;
    let isPenny = false;
    try {
      const parsed: unknown = JSON.parse(rawText);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
          'schema' in parsed && parsed.schema === PENNY_CANDIDATE_SCHEMA) {
        const prepared = preparePennyCandidate(rawText);
        if (prepared.disposition === 'refused') {
          setError(`PENNY candidate refused: ${prepared.reason}`);
          setPreviewedRaw(undefined);
          return;
        }
        carrier = prepared.carrier;
        isPenny = true;
      }
    } catch {
      // The normal Help Slip admission path reports invalid JSON.
    }
    const admission = admitHelpSlipCarrier(carrier);
    if (admission.disposition === 'refused') {
      setError(`Import refused: ${admission.reason}`);
      setPreviewedRaw(undefined);
      return;
    }
    setError(undefined);
    // Importing the already-normalized fulfillment envelope must not bypass
    // the same explicit human review as importing a raw PENNY candidate.
    setPennyCandidate(isPenny || admission.payload.source.system === PENNY_SOURCE_LABEL);
    setPennyReviewed(false);
    setPreviewedRaw(carrier);
  };

  const handleHold = () => {
    if (!previewedRaw) return;
    if (pennyCandidate && !pennyReviewed) {
      setError('Review the PENNY candidate before holding it on this device.');
      return;
    }
    try {
      const result = onHold(previewedRaw, {
        occurrenceId: newOccurrenceId(),
        receivedAt: new Date().toISOString(),
      });
      if (result.disposition === 'refused') {
        setError(`Import refused: ${result.reason}`);
        return;
      }
      setRawText('');
      setPreviewedRaw(undefined);
      setPennyCandidate(false);
      setPennyReviewed(false);
      setImportOpen(false);
      setSelectedCaseId(result.heldCase.localCaseId);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not hold Help Slip.');
    }
  };

  return (
    <section className="rounded-3xl border border-amber-300 bg-white p-4 shadow-xs space-y-3" aria-labelledby="help-slip-inbox-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="help-slip-inbox-heading" className="font-black text-sm text-amber-950">
            Help Slip Inbox
          </h3>
          <p className="text-[11px] text-amber-800 font-medium">
            RECEIVE → HOLD on this device. Nothing is shared until you explicitly pour a requirement.
          </p>
        </div>
        <button
          onClick={() => {
            setImportOpen((value) => !value);
            setError(undefined);
            setPreviewedRaw(undefined);
            setPennyReviewed(false);
          }}
          className="min-h-[44px] px-3 rounded-xl bg-amber-900 text-amber-50 text-xs font-black"
        >
          Import Help Slip
        </button>
      </div>

      {importOpen && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-3">
          <textarea
            value={rawText}
            onChange={(event) => {
              setRawText(event.target.value);
              setPreviewedRaw(undefined);
              setPennyReviewed(false);
              setError(undefined);
            }}
            rows={6}
            placeholder="Paste fulfillment-envelope/v0 or penny-box-candidate/v0 JSON here"
            className="w-full rounded-xl border border-amber-300 bg-white p-3 text-xs font-mono"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setImportOpen(false);
                setRawText('');
                setPreviewedRaw(undefined);
                setPennyReviewed(false);
                setError(undefined);
              }}
              className="min-h-[44px] rounded-xl border border-amber-300 bg-white text-xs font-bold text-amber-900"
            >
              Cancel
            </button>
            <button
              onClick={handlePreview}
              className="min-h-[44px] rounded-xl bg-amber-800 text-amber-50 text-xs font-black"
            >
              Preview import
            </button>
          </div>

          {previewAdmission?.disposition === 'admitted' && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-950 space-y-2">
              <div><strong>Purpose:</strong> {previewAdmission.payload.purpose}</div>
              <div><strong>Source:</strong> {previewAdmission.payload.source.system}</div>
              {previewAdmission.payload.source.recipeId && (
                <div><strong>Recipe ID:</strong> {previewAdmission.payload.source.recipeId}</div>
              )}
              <div><strong>Envelope ID:</strong> {previewAdmission.payload.envelopeId}</div>
              <div className="space-y-1">
                {previewAdmission.payload.requirements.map((requirement) => (
                  <div key={requirement.id}>
                    • {requirement.description}
                    {requirement.quantity !== undefined ? ` — ${requirement.quantity} ${requirement.unit}` : ''}
                    {requirement.neededBy ? ` — needed by ${requirement.neededBy}` : ''}
                  </div>
                ))}
              </div>
              {pennyCandidate && (
                <div className="rounded-lg border border-amber-400 bg-amber-50 p-2 space-y-2 text-amber-950">
                  <strong>PENNY BOX candidate — not independently verified.</strong>
                  <p>Review for private details, requester permission, and accuracy. This
                  preparation neither certifies a steward nor authorizes publication.</p>
                  <label className="flex gap-2 items-start">
                    <input
                      type="checkbox"
                      checked={pennyReviewed}
                      onChange={(event) => setPennyReviewed(event.target.checked)}
                      className="mt-1"
                    />
                    <span>I reviewed this candidate for a device-local HOLD. Any later
                    Campfire sharing requires a separate human POUR.</span>
                  </label>
                </div>
              )}
              <div className="font-bold">Not shared. Holding is device-local.</div>
              <button
                onClick={handleHold}
                disabled={pennyCandidate && !pennyReviewed}
                className="w-full min-h-[44px] rounded-xl bg-emerald-800 text-emerald-50 text-xs font-black"
              >
                Hold on this device
              </button>
            </div>
          )}
          {error && <div className="text-xs font-bold text-red-800" role="alert">{error}</div>}
        </div>
      )}

      {heldCases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-300 p-4 text-xs text-amber-800">
          No Help Slips are held on this device.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {heldCases.map((heldCase) => {
            const description = describeHeldHelpCase(heldCase, linkedNeeds, sharedState);
            return (
              <article key={heldCase.localCaseId} className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <div className="flex flex-wrap gap-1">
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-950">
                    {description.truthLabel}
                  </span>
                  <span className="rounded-full bg-white border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    {description.sharingLabel}
                  </span>
                </div>
                <div className="font-extrabold text-sm text-amber-950">{heldCase.payload.purpose}</div>
                <div className="text-[11px] text-amber-800">
                  {heldCase.payload.requirements.length} requirement(s) • {description.occurrenceCount} arrival(s)
                </div>
                <button
                  onClick={() => setSelectedCaseId(heldCase.localCaseId)}
                  className="w-full min-h-[44px] rounded-xl border border-amber-300 bg-white text-xs font-black text-amber-950"
                >
                  Review
                </button>
              </article>
            );
          })}
        </div>
      )}

      {selectedCase && (
        <HelpSlipDetailModal
          heldCase={selectedCase}
          activeCircle={activeCircle}
          linkedNeeds={linkedNeeds}
          sharedState={sharedState}
          onClose={() => setSelectedCaseId(undefined)}
          onPour={onPour}
          onDiscard={onDiscard}
        />
      )}
    </section>
  );
};
