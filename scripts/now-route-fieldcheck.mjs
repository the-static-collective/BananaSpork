/**
 * Authenticated two-account / hostile outsider boundary specimen for a reviewed
 * NON-PRODUCTION BananaSpork project whose NOW-ROUTE-002 schema was deliberately applied.
 * No service role keys. No secrets printed. Requires explicit opt-in to write fixtures.
 */
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const env=process.env;
const required=['NOW_ROUTE_TEST_URL','NOW_ROUTE_TEST_PUBLISHABLE_KEY','NOW_ROUTE_TEST_CIRCLE_ID',
  'NOW_ROUTE_A_EMAIL','NOW_ROUTE_A_PASSWORD','NOW_ROUTE_B_EMAIL','NOW_ROUTE_B_PASSWORD',
  'NOW_ROUTE_C_EMAIL','NOW_ROUTE_C_PASSWORD'];
for (const key of required) if (!env[key]) throw Error('HOLD_MISSING_'+key);
if (env.NOW_ROUTE_FIELD_TEST_CONFIRM !== 'I_ACKNOWLEDGE_FIELD_WRITES')
  throw Error('HOLD_EXPLICIT_FIXTURE_WRITE_CONSENT_REQUIRED');
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(env.NOW_ROUTE_TEST_URL))
  throw Error('HOLD_UNRECOGNIZED_SUPABASE_URL');
if (env.NOW_ROUTE_TEST_URL.includes('kbhqacsdvjsstzyplqij'))
  throw Error('HOLD_PANTRY_GATE_IS_NOT_A_BANANASPORK_TEST_PROJECT');
const client=()=>createClient(env.NOW_ROUTE_TEST_URL,env.NOW_ROUTE_TEST_PUBLISHABLE_KEY,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
});
async function signedIn(who) {
  const c=client();
  const {data,error}=await c.auth.signInWithPassword({
    email:env['NOW_ROUTE_'+who+'_EMAIL'],password:env['NOW_ROUTE_'+who+'_PASSWORD']
  });
  if(error||!data?.user?.id)throw Error('HOLD_TEST_ACTOR_'+who+'_NOT_AUTHENTICATED');
  return {client:c,id:data.user.id};
}
const A=await signedIn('A'),B=await signedIn('B'),C=await signedIn('C');
assert.notEqual(A.id,B.id);
assert.notEqual(A.id,C.id);
assert.notEqual(B.id,C.id);
const circle=env.NOW_ROUTE_TEST_CIRCLE_ID;
const uuid=/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i;
assert.match(circle,uuid);

let offerId,needId;
try{
  const expiry=new Date(Date.now()+6*60_000).toISOString();
  const offer={
    circle_id:circle,kind:'food',description:'SYNTHETIC NOW ROUTE QA canned beans '+Date.now(),
    approx_lat:44.08,approx_lon:-93.51,radius_miles:5,
    cold_chain_required:false,cold_chain_attested:false,share_with_circle:true,expires_at:expiry
  };
  const need={
    circle_id:circle,kind:'food',description:'SYNTHETIC NOW ROUTE QA request for canned beans',
    approx_lat:44.08,approx_lon:-93.51,max_miles:5,
    allow_matching:true,can_pickup:true,travel_minutes:5,expires_at:expiry
  };
  const inserted=await A.client.from('circle_now_offers').insert(offer).select('*').single();
  if(inserted.error)throw Error('HOLD_MEMBER_A_INSERT: '+inserted.error.message);
  offerId=inserted.data.id;
  assert.equal(inserted.data.owner_user_id,A.id,'owner must be derived from A session');
  const addedNeed=await B.client.from('circle_now_needs').insert(need).select('*').single();
  if(addedNeed.error)throw Error('HOLD_MEMBER_B_INSERT: '+addedNeed.error.message);
  needId=addedNeed.data.id;
  assert.equal(addedNeed.data.owner_user_id,B.id,'owner must be derived from B session');

  const otherSeesA=await B.client.from('circle_now_offers').select('id').eq('id',offerId);
  assert.equal(otherSeesA.error,null);
  assert.equal(otherSeesA.data?.length,1,'B should see consented offer in shared Campfire');
  const otherSeesB=await A.client.from('circle_now_needs').select('id').eq('id',needId);
  assert.equal(otherSeesB.error,null);
  assert.equal(otherSeesB.data?.length,1,'A should see consented need in shared Campfire');

  const hostileView=await C.client.from('circle_now_offers').select('id').eq('id',offerId);
  assert.equal(hostileView.error,null);
  assert.equal(hostileView.data?.length,0,'outsider cannot read shared offer');
  const hostileNeed=await C.client.from('circle_now_needs').select('id').eq('id',needId);
  assert.equal(hostileNeed.error,null);
  assert.equal(hostileNeed.data?.length,0,'outsider cannot see opted-in need');
  const hostileInsert=await C.client.from('circle_now_offers').insert(offer);
  assert.ok(hostileInsert.error,'outsider must not create an offer in the circle');
  const forgedOwner=await A.client.from('circle_now_offers').insert({...offer,owner_user_id:B.id});
  assert.ok(forgedOwner.error,'A must not forge B ownership');
  const hostileUpdate=await A.client.from('circle_now_offers').update({description:'rewritten'}).eq('id',offerId);
  assert.ok(hostileUpdate.error,'updates are not granted to clients');
  const crossDelete=await B.client.from('circle_now_offers').delete().eq('id',offerId).select('id');
  assert.equal(crossDelete.error,null);
  assert.equal(crossDelete.data?.length,0,'B cannot withdraw A offer');
  const outsiderDelete=await C.client.from('circle_now_needs').delete().eq('id',needId).select('id');
  assert.equal(outsiderDelete.error,null);
  assert.equal(outsiderDelete.data?.length,0,'C cannot withdraw B need');

  const freshB=await signedIn('B');
  const rehydrated=await freshB.client.from('circle_now_offers').select('id').eq('id',offerId);
  assert.equal(rehydrated.error,null);
  assert.equal(rehydrated.data?.length,1,'offer persists after fresh session / restart');

  console.log('PASS: two distinct authenticated members, restricted outsider, forged owner denied, withdrawal ownership and restart rehydration');
  console.log('FIELD NOT PROVED: physical transfer, actual notified devices, same-circle RLS on all edge cases, food safety, or human consent to a handoff.');
} finally {
  if(offerId){const x=await A.client.from('circle_now_offers').delete().eq('id',offerId);if(x.error)console.error('HOLD_CLEANUP_OFFER_FAILED');}
  if(needId){const x=await B.client.from('circle_now_needs').delete().eq('id',needId);if(x.error)console.error('HOLD_CLEANUP_NEED_FAILED');}
}
