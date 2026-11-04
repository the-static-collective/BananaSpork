import React, {useCallback,useEffect,useMemo,useState} from 'react';
import {type NowOffer, type NowNeed} from './matching';
import {
  createSupabaseNowRouteTransport,nowRouteSuggestions,
} from './supabaseTransport';

const AREAS={
  waseca:{label:'Waseca area (approximate center)',lat:44.077,lon:-93.507},
  north:{label:'North Waseca area (approximate)',lat:44.095,lon:-93.5},
  waldo:{label:'Waldorf area (approximate)',lat:43.935,lon:-93.70}
} as const;
type AreaKey = keyof typeof AREAS;
type Shared = {offers:NowOffer[];needs:NowNeed[]};
const EMPTY:Shared={offers:[],needs:[]};

export function NowRoutePanel({circleId,userId}:{circleId:string;userId:string}) {
  const api=useMemo(()=>createSupabaseNowRouteTransport(),[]);
  const [records,setRecords]=useState<Shared>(EMPTY);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);
  const [description,setDescription]=useState('I have extra fish to share.');
  const [need,setNeed]=useState('I could use groceries today.');
  const [area,setArea]=useState<AreaKey>('waseca');
  const [expiresMinutes,setExpiresMinutes]=useState(45);
  const [travelMinutes,setTravelMinutes]=useState(12);
  const [coldStorageConfirmed,setColdStorageConfirmed]=useState(false);
  const [allowMatching,setAllowMatching]=useState(false);

  const refresh=useCallback(async()=>{
    const data=await api.list(circleId);
    setRecords(data);
  },[api,circleId]);
  useEffect(()=>{
    let active=true;
    setRecords(EMPTY);setError('');
    void refresh().catch(e=>{if(active)setError(String(e.message||e));});
    const stop=api.watch(circleId,()=>{if(active)void refresh().catch(e=>{if(active)setError(String(e.message||e));});});
    const ticker=setInterval(()=>{if(active)void refresh().catch(()=>{});},15_000);
    return ()=>{active=false;stop();clearInterval(ticker);setRecords(EMPTY);};
  },[api,circleId,refresh]);

  const suggestions=nowRouteSuggestions(records);
  async function act(fn:()=>Promise<unknown>,ok:string) {
    setLoading(true);setError('');setMessage('');
    try{await fn();await refresh();setMessage(ok);}
    catch(e){setError(String(e instanceof Error?e.message:e));}
    finally{setLoading(false);}
  }
  const zone=AREAS[area];
  const center={lat:zone.lat,lon:zone.lon};

  return <section className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4 text-emerald-950 space-y-4" aria-label="Now Route pilot">
    <div>
      <h2 className="text-lg font-black">NOW ROUTE · Got extra? Could use?</h2>
      <p className="text-sm">A real Campfire member-scoped discovery pilot. Shared posts are visible to other members of this circle only. No strangers, automatic invitations, SMS, delivery or verified handoffs.</p>
      <p className="text-xs font-semibold text-amber-900 mt-1">STAGING FEATURE · Requires a source-owner-reviewed schema and two-account RLS proof. No pickup addresses or private contact details. Food safety is not verified.</p>
    </div>
    <label className="block text-xs font-bold">Choose a broad public area, never your home address
      <select aria-label="Approximate area" value={area} onChange={e=>setArea(e.target.value as AreaKey)} className="block w-full rounded-lg border p-2 mt-1">
        {Object.entries(AREAS).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}
      </select>
    </label>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <form className="rounded-xl bg-white p-3 border space-y-2" onSubmit={e=>{e.preventDefault();void act(()=>api.offer({
        circleId,description,areaCenter:center,expiresMinutes,coldChainAttested:coldStorageConfirmed,
        radiusMiles:5
      }),'Offer shared with this Campfire.');}}>
        <h3 className="font-black">I HAVE EXTRA</h3>
        <label className="block text-xs font-bold">What could you share?
          <textarea className="block w-full border rounded-lg p-2 mt-1" rows={2} maxLength={240} value={description} onChange={e=>setDescription(e.target.value)} required/>
        </label>
        <label className="block text-xs font-bold">How long is it available?
          <select className="block w-full border rounded-lg p-2 mt-1" value={expiresMinutes} onChange={e=>setExpiresMinutes(Number(e.target.value))}>
            <option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option>
          </select>
        </label>
        <label className="text-xs flex items-start gap-2"><input type="checkbox" className="mt-1" checked={coldStorageConfirmed} onChange={e=>setColdStorageConfirmed(e.target.checked)}/>
          I affirm food requiring refrigeration has been kept cold according to applicable food-safety rules. This is not independent verification.
        </label>
        <button disabled={loading} className="w-full min-h-11 rounded-lg bg-emerald-900 text-white font-bold p-2">Share my extra</button>
      </form>
      <form className="rounded-xl bg-white p-3 border space-y-2" onSubmit={e=>{e.preventDefault();void act(()=>api.need({
        circleId,description:need,areaCenter:center,expiresMinutes:120,allowMatching,
        canPickup:true,travelMinutes,maxMiles:5
      }),'Need shared with this Campfire.');}}>
        <h3 className="font-black">I COULD USE</h3>
        <label className="block text-xs font-bold">What would help?
          <textarea className="block w-full border rounded-lg p-2 mt-1" rows={2} maxLength={240} value={need} onChange={e=>setNeed(e.target.value)} required/>
        </label>
        <label className="block text-xs font-bold">My pickup travel estimate
          <select className="block w-full border rounded-lg p-2 mt-1" value={travelMinutes} onChange={e=>setTravelMinutes(Number(e.target.value))}>
            <option value={5}>5 minutes</option><option value={12}>12 minutes</option><option value={25}>25 minutes</option><option value={55}>55 minutes</option>
          </select>
        </label>
        <label className="text-xs flex items-start gap-2"><input type="checkbox" className="mt-1" checked={allowMatching} onChange={e=>setAllowMatching(e.target.checked)} required/>
          Yes, show this need to members of my current Campfire for possible matches.
        </label>
        <button disabled={loading || !allowMatching} className="w-full min-h-11 rounded-lg bg-emerald-900 text-white font-bold p-2">Look for nearby help</button>
      </form>
    </div>
    <p aria-live="polite" className={error?'text-xs font-bold text-red-800':'text-xs font-semibold'}>{error||message||'No external messages are sent.'}</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><h3 className="font-bold mb-2">Offers in this circle ({records.offers.length})</h3>
        {records.offers.map(o=><div key={o.id} className="bg-white rounded-lg p-2 mb-2 text-sm"><p>{o.description}</p><p className="text-xs opacity-70">Expires {new Date(o.expires_at).toLocaleTimeString()} · {o.kind}</p>
          {o.owner_user_id===userId&&<button disabled={loading} type="button" onClick={()=>void act(()=>api.withdraw('offer',o.id),'Offer withdrawn.')} className="text-xs underline font-bold mt-1">Withdraw mine</button>}
        </div>)}</div>
      <div><h3 className="font-bold mb-2">Opted-in needs in this circle ({records.needs.length})</h3>
        {records.needs.map(n=><div key={n.id} className="bg-white rounded-lg p-2 mb-2 text-sm"><p>{n.description}</p><p className="text-xs opacity-70">Pickup estimate {n.travel_minutes} min · {n.kind}</p>
          {n.owner_user_id===userId&&<button disabled={loading} type="button" onClick={()=>void act(()=>api.withdraw('need',n.id),'Need withdrawn.')} className="text-xs underline font-bold mt-1">Withdraw mine</button>}
        </div>)}</div>
    </div>
    <div className="bg-white rounded-xl p-3">
      <h3 className="font-black">Possible routes ({suggestions.length})</h3>
      {suggestions.length===0?<p className="text-sm">No compatible, consented, pickup-feasible matches yet.</p>:suggestions.map(s=>{
        const offer=records.offers.find(o=>o.id===s.offerId);
        const need=records.needs.find(n=>n.id===s.needId);
        return <p key={s.offerId+':'+s.needId} className="text-sm border-t py-2">
          <strong>{offer?.description}</strong> → {need?.description}<br/>
          Approx. {s.distanceMiles} miles · {s.travelMinutes}-minute pickup estimate · {s.expiresInMinutes} minutes remaining.
          <span className="block text-xs font-bold">SUGGESTION ONLY · No invitation or reservation has been sent.</span>
        </p>;
      })}
    </div>
  </section>;
}
