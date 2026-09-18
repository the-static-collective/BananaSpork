import React, { useEffect, useMemo, useState } from 'react';
import type { GardenHeldHelpCase } from './types';
import {
  buildCampfirePourPreview,
  projectHelpSlipResidual,
  type CampfirePourPreview,
  type LinkedNeedConfirmation,
  type PourHeldRequirementResult,
} from './pour';

interface HelpSlipDetailModalProps {
  heldCase: GardenHeldHelpCase;
  activeCircle?: { circleId: string; circleLabel: string };
  linkedNeeds: LinkedNeedConfirmation[];
  sharedState: 'current' | 'stale' | 'unavailable';
  onClose: () => void;
  onPour: (
    heldCase: GardenHeldHelpCase,
    preview: CampfirePourPreview
  ) => Promise<PourHeldRequirementResult>;
}

export const HelpSlipDetailModal: React.FC<HelpSlipDetailModalProps> = ({
  heldCase,
  activeCircle,
  linkedNeeds,
  sharedState,
  onClose,
  onPour,
}) => {
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>();
  const [preview, setPreview] = useState<CampfirePourPreview>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  const residuals = useMemo(
    () => projectHelpSlipResidual(heldCase, linkedNeeds),
    [heldCase, linkedNeeds]
  );

  const selectableRequirements = heldCase.payload.requirements.filter(
    (requirement) =>
      !activeCircle ||
      !heldCase.requirementLinks.some(
        (link) =>
          link.requirementId === requirement.id &&
          link.circleId === activeCircle.circleId
      )
  );

  useEffect(() => {
    setSelectedRequirementId(selectableRequirements[0]?.id);
    setPreview(undefined);
    setNotice(undefined);
  }, [heldCase.localCaseId, activeCircle?.circleId, selectableRequirements.length]);

  const handlePreview = () => {
    if (!activeCircle || !selectedRequirementId) return;
    setPreview(buildCampfirePourPreview(heldCase, selectedRequirementId, activeCircle));
    setNotice(undefined);
  };

  const handlePour = async () => {
    if (!preview) return;
    setBusy(true);
    setNotice(undefined);
    try {
      const result = await onPour(heldCase, preview);
      if (result.status === 'authority_failed') {
        setNotice(`Not shared: ${result.error}`);
      } else if (result.status === 'shared_refresh_failed') {
        setNotice(`Shared; status refresh failed: ${result.error}`);
      } else if (result.status === 'already_shared') {
        setNotice('Already shared to this Campfire; no duplicate need was created.');
      } else {
        setNotice('Shared to Campfire. The source Help Slip remains unchanged.');
      }
      setPreview(undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/45 flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-amber-200 shadow-xl p-4 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">
              Held on this device
            </div>
            <h3 className="text-lg font-black text-amber-950">{heldCase.payload.purpose}</h3>
            <p className="text-xs text-amber-800 mt-1">
              Imported source is immutable. Sharing creates a separate Campfire need.
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] px-3 rounded-xl border border-amber-200 text-xs font-bold text-amber-900"
          >
            Close
          </button>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
          <div><strong>Source:</strong> {heldCase.payload.source.system}</div>
          {heldCase.payload.source.recipeId && (
            <div><strong>Recipe ID:</strong> {heldCase.payload.source.recipeId}</div>
          )}
          <div><strong>Envelope ID:</strong> {heldCase.payload.envelopeId}</div>
          <div><strong>Arrivals:</strong> {heldCase.arrivals.length}</div>
          <div><strong>Payload hash:</strong> <code className="break-all">{heldCase.payloadHash}</code></div>
          {sharedState !== 'current' && (
            <div className="font-bold text-amber-950">Shared status unavailable / stale</div>
          )}
        </div>

        <div className="space-y-3">
          {heldCase.payload.requirements.map((requirement) => {
            const residual = residuals.find((item) => item.requirementId === requirement.id);
            const links = heldCase.requirementLinks.filter(
              (link) => link.requirementId === requirement.id
            );
            return (
              <div key={requirement.id} className="rounded-2xl border border-amber-200 p-3 space-y-2">
                <div className="font-extrabold text-sm text-amber-950">{requirement.description}</div>
                <div className="text-xs text-amber-800">
                  {requirement.quantity !== undefined
                    ? `Requested: ${requirement.quantity} ${requirement.unit}`
                    : 'Qualitative requirement — no numeric quantity in source'}
                  {requirement.neededBy ? ` • Needed by: ${requirement.neededBy}` : ''}
                </div>
                {residual?.sourceQuantity !== undefined && (
                  <div className="text-xs font-semibold text-amber-900">
                    Campfire confirmed: {residual.confirmedUnits} {residual.sourceUnit} •
                    Residual: {residual.confirmedResidual} {residual.sourceUnit}
                  </div>
                )}
                {links.map((link) => (
                  <div key={`${link.circleId}:${link.authorityNeedId}`} className="text-[10px] text-emerald-800">
                    Shared lineage: {link.circleId} / {link.authorityNeedId}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 space-y-3">
          <div>
            <div className="font-black text-sm text-amber-950">Pour one requirement</div>
            <div className="text-xs text-amber-800">
              Import is not publication. This action creates shared Campfire history only after confirmation.
            </div>
          </div>

          {!activeCircle ? (
            <div className="text-xs font-bold text-amber-900">
              Sign in and select an accessible Campfire before sharing.
            </div>
          ) : selectableRequirements.length === 0 ? (
            <div className="text-xs font-bold text-emerald-800">
              Every requirement is already linked to this Campfire.
            </div>
          ) : (
            <>
              <select
                value={selectedRequirementId ?? ''}
                onChange={(event) => {
                  setSelectedRequirementId(event.target.value);
                  setPreview(undefined);
                }}
                className="w-full rounded-xl border border-amber-300 bg-white p-3 text-sm"
              >
                {selectableRequirements.map((requirement) => (
                  <option key={requirement.id} value={requirement.id}>
                    {requirement.description}
                  </option>
                ))}
              </select>
              <button
                onClick={handlePreview}
                className="w-full min-h-[44px] rounded-xl bg-amber-900 text-amber-50 text-xs font-black"
              >
                Preview Pour
              </button>
            </>
          )}

          {preview && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 space-y-2 text-xs">
              <div className="font-black text-emerald-950">
                Will share to {preview.circleLabel}
              </div>
              <pre className="whitespace-pre-wrap break-words text-[11px] text-emerald-950">
                {JSON.stringify(preview.command, null, 2)}
              </pre>
              {preview.qualitativeQuantityNotice && (
                <div className="font-bold text-amber-900">
                  This source had no numeric quantity. Campfire representation will be 1 item.
                </div>
              )}
              <div className="text-[10px] text-emerald-900">
                Kept local: recipe ID, envelope ID, payload hash, source system, full purpose, and all unselected requirements.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPreview(undefined)}
                  className="min-h-[44px] rounded-xl border border-amber-300 bg-white font-bold text-amber-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handlePour()}
                  disabled={busy}
                  className="min-h-[44px] rounded-xl bg-emerald-800 text-emerald-50 font-black disabled:opacity-50"
                >
                  {busy ? 'Sharing…' : 'Pour into this Campfire'}
                </button>
              </div>
            </div>
          )}

          {notice && <div className="text-xs font-bold text-amber-950" role="status">{notice}</div>}
        </div>
      </div>
    </div>
  );
};
