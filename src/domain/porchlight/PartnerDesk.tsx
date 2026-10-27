import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, ClipboardCheck, ExternalLink,
  HandHeart, House, LockKeyhole, Mail, MapPin, RefreshCw, ShieldCheck,
  Sprout, Users, XCircle,
} from 'lucide-react';
import {
  advanceTrial, allGatesMet, DEMO_WORK_ORDERS, PARTNER_LEADS,
  setTrialGate, trialCounts, type Region, type StepAction, type TrialGates,
  type TrialWorkOrder,
} from './pilot';

const REGIONS: { id: Region; label: string; note: string }[] = [
  { id: 'all', label: 'All doors', note: 'Two trial geographies' },
  { id: 'la', label: 'Los Angeles', note: 'High-volume metro' },
  { id: 'humboldt', label: 'Humboldt County', note: 'Rural outlier' },
];

const GATE_LABELS: { key: keyof TrialGates; label: string }[] = [
  { key: 'operatorAccepted', label: 'Operator accepts responsibility' },
  { key: 'safeguardingApproved', label: 'Safeguarding / escalation reviewed' },
  { key: 'privacyApproved', label: 'Privacy and information scope approved' },
  { key: 'consentConfirmed', label: 'Participant choice and consent confirmed' },
];

const pill = 'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold';
const btn = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800';
const surface = 'rounded-3xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6';

function mailtoHref(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function PartnerDesk() {
  const [region, setRegion] = useState<Region>('all');
  const [orders, setOrders] = useState<TrialWorkOrder[]>(() => DEMO_WORK_ORDERS.map((item) => ({
    ...item, gates: { ...item.gates }, receipts: [],
  })));
  const [notice, setNotice] = useState('');
  const leads = useMemo(() => PARTNER_LEADS.filter((lead) => region === 'all' || lead.region === region), [region]);
  const shownOrders = useMemo(() => orders.filter((order) => region === 'all' || order.region === region), [region]);
  const counts = trialCounts(orders);

  function updateGate(id: string, gate: keyof TrialGates, checked: boolean) {
    setOrders((current) => current.map((item) => item.id === id ? setTrialGate(item, gate, checked) : item));
    setNotice('Fixture-only gate updated on this screen. No real approval was granted.');
  }

  function act(id: string, action: StepAction) {
    const actor = action === 'REPORT'
      ? { role: 'volunteer' as const, id: 'synthetic-helper' }
      : action === 'CONFIRM'
        ? { role: 'receiver' as const, id: 'synthetic-receiver' }
        : { role: 'operator' as const, id: 'synthetic-operator' };
    try {
      const next = orders.map((item) => item.id === id
        ? advanceTrial(item, action, actor, new Date().toISOString())
        : item);
      setOrders(next);
      setNotice(`${action} recorded in the synthetic lab only. No one has been contacted, housed or served.`);
    } catch (error: unknown) {
      setNotice(error instanceof Error ? `Refused: ${error.message}` : 'Action refused.');
    }
  }

  function resetLab() {
    setOrders(DEMO_WORK_ORDERS.map((item) => ({ ...item, gates: { ...item.gates }, receipts: [] })));
    setNotice('Synthetic work orders reset. This exercise never contained real participant records.');
  }

  return (
    <div className="min-h-screen w-full bg-[#f8f5ec] text-stone-900 selection:bg-amber-200">
      <header className="border-b border-stone-200 bg-white/90 px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <a href="#garden" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-stone-700 hover:text-amber-800">
            <ArrowLeft size={18} /> The Garden
          </a>
          <div className="inline-flex items-center gap-2 font-black tracking-tight text-amber-950">
            <House className="text-amber-700" size={23} />
            <span>PORCHLIGHT <span className="font-medium text-stone-500">/ Partner Desk</span></span>
          </div>
          <span className={`${pill} border-amber-300 bg-amber-50 text-amber-900`}>
            <LockKeyhole size={13} className="mr-1.5" /> Pilot design · not a live service
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-7 pb-20 sm:px-8 sm:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-stone-900 via-[#253d2e] to-[#436a43] p-7 text-white shadow-xl sm:p-10">
          <div className="grid gap-8 md:grid-cols-[1.35fr_0.65fr] md:items-center">
            <div>
              <span className={`${pill} border-emerald-200/50 bg-emerald-200/10 text-emerald-100`}>PORCHLIGHT-001 · 27 OCT 2026</span>
              <h1 className="mt-5 max-w-2xl font-serif text-4xl font-bold leading-tight sm:text-5xl">
                Build the relationship before the network.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-emerald-50/90">
                Find one unmet practical need. Help an existing service provider meet it.
                Confirm what actually happened. Give people a path toward stable housing,
                without turning them into public listings.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#porchlight-partner-leads" className={`${btn} bg-amber-300 text-stone-950 hover:bg-amber-200`}>
                  Explore partner doors <ArrowRight size={17} />
                </a>
                <a href="#porchlight-simulation" className={`${btn} border border-white/40 bg-white/10 text-white hover:bg-white/20`}>
                  Test the receipt loop
                </a>
              </div>
            </div>
            <div className="rounded-3xl border border-white/20 bg-black/20 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">What counts as progress?</p>
              <div className="mt-5 space-y-4">
                {[
                  ['01', 'A provider chooses a real problem.'],
                  ['02', 'A local steward approves the work.'],
                  ['03', 'Neighbors contribute under those rules.'],
                  ['04', 'The receiver confirms the result.'],
                ].map(([index, label]) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="font-mono text-xl font-bold text-amber-300">{index}</span>
                    <span className="pt-1 text-sm leading-snug text-white/90">{label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 border-t border-white/20 pt-4 text-xs leading-relaxed text-emerald-100/80">
                Neighbor support first. No unscreened guest–host introductions, overnight placements or public personal case files.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="Pilot readiness">
          {[
            { title: 'Partner relationships', value: '0 confirmed', detail: 'Three researched public leads', icon: Users },
            { title: 'Approved pilot locations', value: '0 live', detail: 'LA + Humboldt are candidates', icon: MapPin },
            { title: 'Verified help delivered', value: '0 acts', detail: 'Demo receipts never count', icon: ClipboardCheck },
          ].map((stat) => (
            <div key={stat.title} className={surface}>
              <stat.icon className="text-amber-700" size={23} />
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-stone-500">{stat.title}</p>
              <p className="mt-1 font-serif text-3xl font-bold">{stat.value}</p>
              <p className="mt-1 text-sm text-stone-600">{stat.detail}</p>
            </div>
          ))}
        </section>

        <section id="porchlight-partner-leads" className="space-y-5 scroll-mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-800">01 / Partner discovery</p>
              <h2 className="mt-1 font-serif text-3xl font-bold">Doors we can knock on</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">
                These organizations have relevant public programs. None has been contacted through Porchlight or agreed to participate.
              </p>
            </div>
            <a href="https://github.com/the-static-collective/BananaSpork/issues/25"
               target="_blank" rel="noopener noreferrer"
               className={`${btn} border border-stone-300 bg-white text-stone-800 hover:bg-stone-100`}>
              Field tracker <ExternalLink size={15} />
            </a>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter partner leads by geography">
            {REGIONS.map((choice) => (
              <button key={choice.id} type="button" onClick={() => setRegion(choice.id)}
                aria-pressed={region === choice.id}
                className={`${btn} border ${region === choice.id
                  ? 'border-amber-800 bg-amber-900 text-white'
                  : 'border-amber-200 bg-white text-stone-700 hover:bg-amber-50'}`}>
                {choice.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {leads.map((lead) => (
              <article key={lead.id} className={`${surface} flex flex-col`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`${pill} border-stone-200 bg-stone-50 text-stone-600`}>
                    {lead.type === 'coalition' ? 'Listening / referral door' : 'Direct-service prospect'}
                  </span>
                  <span className={`${pill} border-amber-300 bg-amber-50 text-amber-900`}>Not contacted</span>
                </div>
                <p className="mt-5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500">
                  <MapPin size={13} /> {lead.city}
                </p>
                <h3 className="mt-1 font-serif text-2xl font-bold">{lead.organization}</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">{lead.description}</p>
                <div className="my-5 rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-amber-900">First useful question</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-800">{lead.opportunity}</p>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <a className={`${btn} bg-amber-900 text-white hover:bg-amber-800`}
                    href={mailtoHref(lead.contact, lead.invitationSubject, lead.invitationBody)}>
                    <Mail size={16} /> Open email draft
                  </a>
                  <a className={`${btn} border border-stone-300 bg-white text-stone-800 hover:bg-stone-50`}
                    href={lead.publicUrl} target="_blank" rel="noopener noreferrer">
                    Their site <ExternalLink size={15} />
                  </a>
                </div>
                <p className="mt-3 text-xs text-stone-500">Opens your email app; nothing is sent automatically.</p>
                <details className="mt-3 border-t border-stone-200 pt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-amber-900">Read the proposed introduction</summary>
                  <div className="mt-3 whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-sm leading-relaxed text-stone-700">
                    <strong>To:</strong> {lead.contact}<br />
                    <strong>Subject:</strong> {lead.invitationSubject}<br /><br />
                    {lead.invitationBody}
                  </div>
                </details>
              </article>
            ))}
          </div>
        </section>

        <section className={surface}>
          <div className="flex items-center gap-2">
            <HandHeart className="text-amber-800" size={22} />
            <h2 className="font-serif text-2xl font-bold">Our invitation to a partner</h2>
          </div>
          <blockquote className="mt-4 border-l-4 border-amber-400 pl-5 font-serif text-xl leading-relaxed text-stone-800">
            Tell us one useful thing your organization needs done. We can help coordinate
            willing neighbors under your rules, and return an honest receipt of what happened.
          </blockquote>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { icon: CircleHelp, label: 'Listen first', detail: 'Ask what would save staff time. Never prescribe their problem.' },
              { icon: ShieldCheck, label: 'Keep authority local', detail: 'Operator screening, consent, refusal and incident procedures remain theirs.' },
              { icon: Sprout, label: 'Prove one act', detail: 'Start with supplies, laundry or another sanctioned task; housing is a separate gate.' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-stone-200 p-4">
                <item.icon className="text-emerald-700" size={20} />
                <h3 className="mt-2 font-bold">{item.label}</h3>
                <p className="mt-1 text-sm text-stone-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="porchlight-simulation" className="scroll-mt-6 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-800">02 / Safety and receipts</p>
              <h2 className="mt-1 font-serif text-3xl font-bold">Try the coordination loop</h2>
              <p className="mt-2 max-w-3xl text-sm text-stone-600">
                Interactive synthetic rehearsal. Every checkbox, actor and receipt is fictional and
                exists only in this open browser view. Nothing is stored or transmitted.
              </p>
            </div>
            <button type="button" onClick={resetLab}
              className={`${btn} border border-stone-300 bg-white text-stone-800 hover:bg-stone-100`}>
              <RefreshCw size={16} /> Reset the lab
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Awaiting receipt', value: counts.reported },
              { label: 'Receiver-confirmed', value: counts.confirmed },
              { label: 'Refused / held', value: counts.refused },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-stone-200 bg-white px-5 py-4">
                <span className="text-xs font-bold text-stone-600">{label}</span>
                <span className="mt-1 block font-mono text-3xl font-bold text-stone-900">{value}</span>
                <span className="text-[11px] text-stone-500">Synthetic fixtures only</span>
              </div>
            ))}
          </div>

          {notice && <div className="rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm text-amber-950" role="status">{notice}</div>}

          <div className="grid gap-4 lg:grid-cols-2">
            {shownOrders.map((order) => (
              <article key={order.id} className={surface}>
                <div className="flex flex-wrap justify-between gap-2">
                  <span className={`${pill} border-stone-300 bg-stone-100 text-stone-700`}>FAKE DATA · {order.region === 'la' ? 'LA' : 'Humboldt'}</span>
                  <span className={`${pill} ${order.status === 'CONFIRMED'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : order.status === 'REFUSED'
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-amber-300 bg-amber-50 text-amber-900'}`}>{order.status}</span>
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-stone-500">{order.category}</p>
                <h3 className="mt-1 font-serif text-xl font-bold">{order.title}</h3>
                <p className="mt-1 font-mono text-[11px] text-stone-500">{order.id}</p>
                <fieldset className="mt-5 space-y-3 rounded-2xl border border-stone-200 bg-[#f8f7f1] p-4" disabled={order.status !== 'HOLD'}>
                  <legend className="px-1 text-sm font-bold">Required approval gates (fictional)</legend>
                  {GATE_LABELS.map((gate) => (
                    <label key={gate.key} className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-stone-800">
                      <input type="checkbox" checked={order.gates[gate.key]}
                        onChange={(event) => updateGate(order.id, gate.key, event.currentTarget.checked)}
                        className="mt-0.5 h-4 w-4 accent-emerald-700" />
                      {gate.label}
                    </label>
                  ))}
                </fieldset>
                <p className="mt-4 text-xs font-semibold text-stone-600">
                  {order.status === 'HOLD' && !allGatesMet(order.gates)
                    ? 'HOLD: all four gates must be checked in the demo before an operator can approve.'
                    : order.status === 'REPORTED'
                      ? 'A volunteer report is not completion; the independent receiver must confirm.'
                      : order.status === 'CONFIRMED'
                        ? 'Synthetic receiver confirmation recorded. This is NOT a real act of help.'
                        : 'Only the next role can advance this work order.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {order.status === 'HOLD' && (
                    <button className={`${btn} bg-emerald-800 text-white enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40`}
                      disabled={!allGatesMet(order.gates)}
                      onClick={() => act(order.id, 'APPROVE')}>Approve as operator <ArrowRight size={16} /></button>
                  )}
                  {order.status === 'APPROVED' && (
                    <button className={`${btn} bg-amber-900 text-white hover:bg-amber-800`}
                      onClick={() => act(order.id, 'REPORT')}>Report as helper <ArrowRight size={16} /></button>
                  )}
                  {order.status === 'REPORTED' && (
                    <button className={`${btn} bg-emerald-800 text-white hover:bg-emerald-700`}
                      onClick={() => act(order.id, 'CONFIRM')}><CheckCircle2 size={16} /> Confirm as receiver</button>
                  )}
                  {order.status !== 'CONFIRMED' && order.status !== 'REFUSED' && (
                    <button className={`${btn} border border-stone-300 bg-white text-stone-700 hover:bg-stone-50`}
                      onClick={() => act(order.id, 'REFUSE')}><XCircle size={16} /> Refuse as operator</button>
                  )}
                </div>
                <details className="mt-5 border-t border-stone-200 pt-3">
                  <summary className="cursor-pointer text-sm font-bold text-stone-700">
                    Synthetic receipts ({order.receipts.length})
                  </summary>
                  <ol className="mt-3 space-y-2">
                    {order.receipts.length === 0
                      ? <li className="text-sm text-stone-500">No transition witnessed in this rehearsal.</li>
                      : order.receipts.map((receipt, index) => (
                        <li key={index} className="rounded-lg bg-stone-50 p-3 text-xs text-stone-700">
                          <strong>{receipt.action}</strong> → {receipt.outcome} · role {receipt.actorRole}
                          <br />{new Date(receipt.at).toLocaleString()} · {receipt.provenance}
                        </li>
                      ))}
                  </ol>
                </details>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-amber-300 bg-amber-100/70 p-6 sm:p-8">
          <h2 className="flex items-center gap-2 font-serif text-2xl font-bold"><ShieldCheck className="text-amber-900" /> What is still missing?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-800">
            A named local operating partner, lived-experience design review, documented safety and privacy
            obligations, an actual approved practical task, secure role-based collaboration and an independently
            witnessed field result. The sandbox doesn't provide any of these approvals.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="https://github.com/the-static-collective/BananaSpork/issues/25" target="_blank" rel="noopener noreferrer"
              className={`${btn} bg-amber-900 text-white hover:bg-amber-800`}>
              Open the actual work queue <ExternalLink size={16} />
            </a>
            <a href="https://github.com/the-static-collective/BananaSpork/blob/pilot/porchlight-001-national-field/docs/proposals/porchlight-001-partnership-onramp.md"
              target="_blank" rel="noopener noreferrer" className={`${btn} border border-amber-400 bg-white text-stone-900 hover:bg-amber-50`}>
              Read the partner playbook <ArrowRight size={16} />
            </a>
          </div>
        </section>

        <footer className="border-t border-stone-300 pt-6 text-xs leading-relaxed text-stone-500">
          Porchlight-001 / The Static Collective · Research and synthetic interaction only.
          This is not emergency shelter, case intake, a confirmed placement or a guarantee of assistance.
          For urgent housing support, use established local 211 / coordinated entry / emergency response channels.
        </footer>
      </main>
    </div>
  );
}
