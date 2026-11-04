import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  areaCoordinates,classifyNowText,needsColdChain,publicDescription,
  suggestNowRoutes,type NowOffer,type NowNeed
} from './matching';

const now=Date.parse('2026-11-04T16:00:00Z');
const iso=(m:number)=>new Date(now+m*60_000).toISOString();
const owner='00000000-0000-4000-8000-000000000001';
const recipient='00000000-0000-4000-8000-000000000002';
const circle='10000000-0000-4000-8000-000000000001';
const base={circle_id:circle,kind:'food' as const,created_at:iso(-1),
  approx_lat:44.08,approx_lon:-93.51,expires_at:iso(45)};
const offer:NowOffer={...base,id:'offer-1',owner_user_id:owner,
  description:'I have extra safely cold fish',radius_miles:5,
  cold_chain_required:true,cold_chain_attested:true,share_with_circle:true};
const need:NowNeed={...base,id:'need-1',owner_user_id:recipient,
  description:'Could use groceries today',allow_matching:true,can_pickup:true,
  travel_minutes:12,max_miles:5};
const clone=<T>(a:T,mods:Partial<T>):T=>({...a,...mods});

assert.equal(classifyNowText('I have too much fish'),'food');
assert.equal(classifyNowText('I need a ride'),'transport');
assert.equal(needsColdChain('thawing seafood'),true);
assert.equal(needsColdChain('dry beans'),false);
assert.deepEqual(areaCoordinates(44.077,-93.507),{approx_lat:44.08,approx_lon:-93.51});
assert.throws(()=>publicDescription('Call me at 555-222-1234'),/CONTACT_DETAILS_NOT_ALLOWED/);
assert.throws(()=>publicDescription('my address is 123 Main Street'),/CONTACT_DETAILS_NOT_ALLOWED/);
assert.throws(()=>publicDescription('you@home.org'),/CONTACT_DETAILS_NOT_ALLOWED/);
assert.equal(publicDescription(' Extra fish to share '),'Extra fish to share');
assert.deepEqual(suggestNowRoutes([offer],[need],now),[{
  offerId:'offer-1',needId:'need-1',distanceMiles:0,travelMinutes:12,expiresInMinutes:45,status:'SUGGESTED_ONLY'
}]);
for(const [off,nd,label] of [
  [clone(offer,{share_with_circle:false}),need,'no share consent'],
  [clone(offer,{cold_chain_attested:false}),need,'unknown cold chain'],
  [offer,clone(need,{allow_matching:false}),'no need opt in'],
  [offer,clone(need,{can_pickup:false}),'no pickup'],
  [offer,clone(need,{travel_minutes:46}),'too late'],
  [offer,clone(need,{circle_id:'another'}),'cross-circle'],
  [offer,clone(need,{owner_user_id:owner}),'self match'],
  [offer,clone(need,{kind:'transport'}),'domain mismatch'],
  [offer,clone(need,{approx_lat:45.0}),'too far'],
  [clone(offer,{expires_at:iso(-1)}),need,'expired offer'],
] as [NowOffer,NowNeed,string][]) {
  assert.equal(suggestNowRoutes([off],[nd],now).length,0,label);
}
const many=suggestNowRoutes([offer,clone(offer,{id:'offer-2',approx_lat:44.11})],
  [need,clone(need,{id:'need-2',travel_minutes:5})],now);
assert.equal(many[0].travelMinutes,5,'shorter travel ranks first');
assert.ok(many.every(r=>r.status==='SUGGESTED_ONLY'));
assert.ok(many.every(r=>!('owner_user_id' in r)),'no participant identity in route payload');

const sql=readFileSync(fileURLToPath(new URL('../../../docs/proposals/now-route-002-schema-proposal.sql',import.meta.url)),'utf8');
for(const text of ['ENABLE ROW LEVEL SECURITY','now_offers_select_circle','now_needs_select_circle',
  'now_offers_insert_member','now_needs_insert_member','now_offers_delete_owner','now_needs_delete_owner',
  'bananagram_core.is_member_of_circle(circle_id)','owner_user_id=(SELECT auth.uid())']) {
  assert.ok(sql.includes(text),'schema guard: '+text);
}
assert.doesNotMatch(sql,/GRANT ALL ON TABLE public\.circle_now/);
assert.doesNotMatch(sql,/GRANT UPDATE .*circle_now/);
assert.ok(!sql.includes('service_role'),'no service role path in staging design');
console.log('NOW-ROUTE 002: domain projection + SQL structural preflight PASS (not a live RLS test)');
