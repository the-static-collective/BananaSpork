import React, { useState } from 'react';
import {
  CirculationLocalInbox,
  prepareCirculationInput,
  type PreparedCirculation,
  type CirculationLocalRecord,
} from './circulation002';

const localInbox = new CirculationLocalInbox();

/** A source-owned receiving bench, NOT an alternate Help Slip or Campfire entry. */
export const CirculationReviewBench: React.FC = () => {
  const [raw, setRaw] = useState('');
  const [candidate, setCandidate] = useState<PreparedCirculation>();
  const [reviewed, setReviewed] = useState(false);
  const [releaseId, setReleaseId] = useState<string>();
  const [records, setRecords] = useState<CirculationLocalRecord[]>(() => {
    try { return localInbox.list(); } catch { return []; }
  });
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  const preview = () => {
    setCandidate(undefined);
    setReviewed(false);
    setMessage(undefined);
    const prepared = prepareCirculationInput(raw);
    if (prepared.disposition === 'refused') {
      setError('Circulation import refused: ' + prepared.reason);
      return;
    }
    setCandidate(prepared);
    setError(undefined);
  };
  const choose = (choice: 'HOLD_LOCAL' | 'DECLINE_LOCAL') => {
    if (!candidate || !reviewed) return;
    try {
      const result = localInbox.choose(candidate, choice, reviewed);
      setRecords(localInbox.list());
      setMessage('Recorded on this device only: ' + result.reply.choice +
        '. No Help Slip, Campfire case, action, publication, or verified owner reply.');
      setRaw('');
      setCandidate(undefined);
      setReviewed(false);
      setError(undefined);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Local review failed.');
    }
  };
  const release = (offerId: string) => {
    if (releaseId !== offerId) {
      setReleaseId(offerId);
      return;
    }
    try {
      localInbox.releaseUnshared(offerId, true);
      setRecords(localInbox.list());
      setReleaseId(undefined);
      setMessage('Unshared local reply removed. Previously exported copies are unaffected.');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Local release refused.');
    }
  };
  const exportReply = (reply: CirculationLocalRecord['reply']) => {
    const data = JSON.stringify(reply, null, 2) + '\n';
    const blob = new Blob([data], { type: 'application/json' });
    const uri = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = uri;
    anchor.download = 'circulation-local-unverified-' + reply.offerId.slice(-12) + '.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(uri), 1200);
  };

  return (
    <section className="rounded-2xl border border-emerald-400 bg-emerald-50 p-3 space-y-3 text-emerald-950" aria-labelledby="circulation-heading">
      <div>
        <h3 id="circulation-heading" className="font-black text-sm">Circulation · independent proposal review</h3>
        <p className="text-[11px] mt-1">
          Experimental CIRCULATION-002 / synthetic only. Accept a source-pinned planZ proposal for
          local consideration. A question is never a Help Slip, a task, or proof of consent.
        </p>
      </div>
      <label className="block text-xs font-bold" htmlFor="circulation-import">Local fixture bundle JSON</label>
      <textarea
        id="circulation-import" rows={3} maxLength={85000} value={raw}
        className="w-full rounded-xl border border-emerald-300 bg-white p-2 font-mono text-[11px]"
        placeholder="Paste banana-spork.circulation-input/v0 (source_graph + offer_set)"
        onChange={(e) => { setRaw(e.target.value); setCandidate(undefined); setReviewed(false); setError(undefined); }}
      />
      <button type="button" onClick={preview} className="min-h-[44px] rounded-xl bg-emerald-900 text-white px-3 text-xs font-bold">
        Inspect possible invitation
      </button>
      {candidate && (
        <div className="space-y-2 rounded-xl border border-emerald-300 bg-white p-3 text-xs">
          <p className="font-bold">SIMULATED SOURCE · NOT VERIFIED HUMAN ACTIVITY</p>
          <p><strong>Original question:</strong> {candidate.sourceQuestion}</p>
          <p><strong>Invitation:</strong> {candidate.question}</p>
          <p><strong>Receiver:</strong> {candidate.destination} / CARE only</p>
          <p className="break-all font-mono text-[10px]">Free Graph {candidate.graphId}<br/>planZ {candidate.offerSetId}</p>
          <p>The other CULTURE invitation remains independent and is not imported here.</p>
          <label className="flex gap-2 items-start">
            <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
            <span>I reviewed this <strong>fictional</strong> proposal. A local reply does not create a need,
              certify a steward, authenticate an owner, send a message, or publish anything.</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!reviewed} onClick={() => choose('HOLD_LOCAL')}
              className="min-h-[44px] rounded-lg bg-emerald-900 disabled:opacity-40 text-white px-3 font-bold">
              Hold locally for review
            </button>
            <button type="button" disabled={!reviewed} onClick={() => choose('DECLINE_LOCAL')}
              className="min-h-[44px] rounded-lg border border-emerald-700 disabled:opacity-40 px-3 font-bold">
              Decline locally
            </button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <strong className="text-xs">Unshared local reply history ({records.length})</strong>
        {records.length === 0 && <p className="text-xs">No circulating questions are held or declined on this device.</p>}
        {records.map(({ reply, invitationQuestion }) => (
          <article className="rounded-xl bg-white border border-emerald-200 p-2 text-xs space-y-1" key={reply.offerId}>
            <p className="font-bold">{reply.choice} · FICTIONAL</p>
            <p>{invitationQuestion}</p>
            <p>Source-bound local record only · no Campfire or fulfillment effect</p>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className="rounded-lg border p-2 min-h-[44px]" onClick={() => exportReply(reply)}>
                Export unverified local reply JSON
              </button>
              <button type="button" className="rounded-lg border p-2 min-h-[44px]" onClick={() => release(reply.offerId)}>
                {releaseId === reply.offerId ? 'Confirm local release' : 'Release from device'}
              </button>
            </div>
          </article>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-red-800 font-bold">{error}</p>}
      {message && <p role="status" className="text-xs font-bold">{message}</p>}
    </section>
  );
};
