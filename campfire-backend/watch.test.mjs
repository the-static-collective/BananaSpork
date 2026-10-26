import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createCampfireBackend} from './server.mjs';
import {parseWatchSubmission,watchPosture} from './watch-policy.mjs';
const admin='Y'.repeat(48);
async function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'watch-v0-'));
 const backend=createCampfireBackend({dbPath:join(dir,'data.sqlite'),bootstrapKey:admin});
 await new Promise(ok=>backend.server.listen(0,'127.0.0.1',ok));
 const host='http://127.0.0.1:'+backend.server.address().port;
 async function call(method,path,body,key){
  const res=await fetch(host+path,{method,headers:{
   ...(key?{Authorization:'Bearer '+key}:{}),
   ...(body!==undefined?{'Content-Type':'application/json'}:{})
  },body:body===undefined?undefined:JSON.stringify(body)});
  return {status:res.status,...await res.json()};
 }
 const joinMember=async(circleId,role)=>{
  const issued=await call('POST','/v1/admin/circles/'+circleId+'/invites',{role},admin);
  const joined=await call('POST','/v1/join',{inviteCode:issued.inviteCode});
  assert.equal(joined.status,201);return joined;
 };
 const close=async()=>{await new Promise(ok=>backend.server.close(ok));backend.db.close();rmSync(dir,{recursive:true,force:true});};
 return {call,joinMember,close};
}
test('strict categorical submission, no freeform detail or automatic legitimacy',()=>{
 const signal={category:'PRIVACY_BOUNDARY',subjectScope:'SYSTEM_OPERATOR',requestId:randomUUID()};
 assert.deepEqual(parseWatchSubmission(signal),signal);
 assert.throws(()=>parseWatchSubmission({...signal,notes:'do not export'}));
 const status=watchPosture({auditOk:true,signals:1,attestations:2,twoKeySignals:1});
 assert.equal(status.verifiedHumanOversight,false);
 assert.equal(status.permissionToPublish,false);
 assert.equal(status.automaticSanctions,false);
});
test('a private member report survives two independently authenticated reviewer-key attestations',async()=>{
 const x=await fixture();
 try{
  const c=(await x.call('POST','/v1/admin/circles',{label:'Synthetic circle'},admin)).circle.id;
  const c2=(await x.call('POST','/v1/admin/circles',{label:'Other circle'},admin)).circle.id;
  const owner=await x.joinMember(c,'owner'),reporter=await x.joinMember(c,'member');
  const first=await x.joinMember(c,'member'),second=await x.joinMember(c,'member');
  const outside=await x.joinMember(c2,'member');
  const endpoint='/v1/circles/'+c+'/watch';
  const input={category:'COERCION_OR_RETALIATION',subjectScope:'CIRCLE_OWNER',requestId:randomUUID()};
  const opened=await x.call('POST',endpoint,input,reporter.accessToken);
  assert.equal(opened.status,201);assert.equal(opened.standing,'UNRESOLVED_NO_AUTO_SANCTION');
  assert.equal((await x.call('POST',endpoint,input,reporter.accessToken)).signal.duplicate,true);
  assert.equal((await x.call('GET',endpoint,undefined,owner.accessToken)).signals.length,0);
  assert.equal((await x.call('GET',endpoint,undefined,outside.accessToken)).status,403);
  const url='/v1/watch/'+opened.signal.id+'/review-invites';
  assert.equal((await x.call('POST',url,{},owner.accessToken)).status,403);
  const one=await x.call('POST',url,{},reporter.accessToken);
  const two=await x.call('POST',url,{},reporter.accessToken);
  assert.equal(one.status,201);assert.equal(two.status,201);
  const submit=(credential,inviteCode,stance)=>x.call('POST','/v1/watch/review',{inviteCode,stance},credential);
  assert.equal((await submit(outside.accessToken,one.inviteCode,'ACKNOWLEDGED_FOR_ESCALATION')).status,403);
  assert.equal((await submit(owner.accessToken,one.inviteCode,'ACKNOWLEDGED_FOR_ESCALATION')).status,403);
  assert.equal((await submit(reporter.accessToken,one.inviteCode,'ACKNOWLEDGED_FOR_ESCALATION')).status,403);
  assert.equal((await submit(first.accessToken,one.inviteCode,'ACKNOWLEDGED_FOR_ESCALATION')).status,201);
  assert.equal((await submit(first.accessToken,two.inviteCode,'INDEPENDENT_REVIEW_NEEDED')).status,409);
  const attended=await submit(second.accessToken,two.inviteCode,'INDEPENDENT_REVIEW_NEEDED');
  assert.equal(attended.status,201);assert.equal(attended.complaintResolved,false);
  const posture=await x.call('GET','/v1/admin/watch-posture',undefined,admin);
  assert.equal(posture.signals,1);
  assert.equal(posture.signalsWithTwoCredentialAttestations,1);
  assert.equal(posture.verifiedHumanOversight,false);
  assert.equal(posture.permissionToPublish,false);
  assert.equal((await x.call('GET','/v1/admin/watch-posture',undefined,owner.accessToken)).status,403);
  assert.equal((await x.call('GET','/v1/admin/audit',undefined,admin)).audit.ok,true);
 }finally{await x.close();}
});
