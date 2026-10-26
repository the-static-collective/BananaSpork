import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createCampfireBackend} from './server.mjs';
const admin='B'.repeat(48);
async function launch(dbPath){
 const backend=createCampfireBackend({dbPath,bootstrapKey:admin});
 await new Promise(resolve=>backend.server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+backend.server.address().port;
 async function call(method,path,data=null,key=null,extraHeaders={}){
  const r=await fetch(origin+path,{method,headers:{
   ...(key?{'Authorization':'Bearer '+key}:{}),
   ...(data?{'Content-Type':'application/json'}:{}),
   ...extraHeaders
  },body:data?JSON.stringify(data):undefined});
  const json=await r.json();return {status:r.status,...json};
 }
 async function stop(){
  await new Promise(resolve=>backend.server.close(resolve));
  backend.db.close();
 }
 return {backend,call,stop,origin};
}
const createCircle=async(x,label='Private Test Circle')=>
 (await x.call('POST','/v1/admin/circles',{label},admin)).circle.id;
async function member(x,circleId,role){
 const invite=await x.call('POST','/v1/admin/circles/'+circleId+'/invites',{role},admin);
 assert.equal(invite.status,201);
 const joined=await x.call('POST','/v1/join',{inviteCode:invite.inviteCode});
 assert.equal(joined.status,201);return {...joined,inviteCode:invite.inviteCode};
}
test('3 separate member credentials: no anonymous access, no nonmember read/write, no forged sender',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'campfire-'));const path=join(dir,'backend.sqlite');
 const x=await launch(path);
 try{
  const c1=await createCircle(x),c2=await createCircle(x,'Other Circle');
  const owner=await member(x,c1,'owner'),helper=await member(x,c1,'member');
  const outsider=await member(x,c2,'member');
  assert.notEqual(owner.accessToken,helper.accessToken);
  assert.notEqual(outsider.accessToken,owner.accessToken);
  const endpoint='/v1/circles/'+c1+'/messages';
  assert.equal((await x.call('GET',endpoint)).status,401);
  assert.equal((await x.call('GET',endpoint,null,outsider.accessToken)).status,403);
  assert.equal((await x.call('POST',endpoint,{body:'I do not belong'},outsider.accessToken)).status,403);
  const forged=await x.call('POST',endpoint,{body:'Hi from A',sender_user_id:outsider.actorId},owner.accessToken);
  assert.equal(forged.status,201);
  assert.equal(forged.message.sender_user_id,owner.actorId);
  assert.equal((await x.call('GET',endpoint,null,helper.accessToken)).messages[0].body,'Hi from A');
  assert.equal((await x.call('POST','/v1/join',{inviteCode:owner.inviteCode})).status,403);
  assert.equal((await x.call('GET','/v1/admin/audit',null,owner.accessToken)).status,403);
  assert.equal((await x.call('POST',endpoint,{body:'Allowed message'},helper.accessToken)).status,201);
  assert.equal((await x.call('GET','/v1/circles/'+c2+'/messages',null,owner.accessToken)).status,403);
  // Public UI is an HTML page; no credentials or private circle data are rendered.
 }finally{await x.stop();rmSync(dir,{recursive:true,force:true});}
});
test('durable restart: message persists; report does NOT reduce residual; only owner credential confirms partial units',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'campfire-'));const path=join(dir,'data.sqlite');
 let x=await launch(path);
 try{
  const circle=await createCircle(x),owner=await member(x,circle,'owner'),
   helper=await member(x,circle,'member');
  const needEndpoint='/v1/circles/'+circle+'/needs';
  const opened=await x.call('POST',needEndpoint,{description:'12 hypothetical sample cartons',unit:'cartons',units:12},owner.accessToken);
  assert.equal(opened.status,201);
  assert.equal((await x.call('POST',needEndpoint,{description:'other',unit:'items',units:1},helper.accessToken)).status,403);
  const nid=opened.need.id,reportKey=randomUUID();
  const reported=await x.call('POST','/v1/needs/'+nid+'/reports',{units:9,requestId:reportKey},helper.accessToken);
  assert.equal(reported.status,201);
  assert.equal(reported.standing,'REPORTED_NOT_CONFIRMED');
  assert.equal((await x.call('GET',needEndpoint,null,owner.accessToken)).needs[0].residual,12);
  assert.equal((await x.call('POST','/v1/needs/'+nid+'/reports',{units:9,requestId:reportKey},helper.accessToken)).report.duplicate,true);
  const reportId=reported.report.id;
  const inbox=await x.call('GET','/v1/needs/'+nid+'/reports',null,owner.accessToken);
  assert.equal(inbox.status,200);
  assert.equal(inbox.reports.length,1);
  assert.equal(inbox.reports[0].id,reportId);
  assert.equal(inbox.reports[0].outstandingUnits,9);
  assert.equal((await x.call('GET','/v1/needs/'+nid+'/reports',null,helper.accessToken)).status,403);
  assert.equal((await x.call('POST','/v1/reports/'+reportId+'/confirm',{units:6,requestId:randomUUID()},helper.accessToken)).status,403);
  await x.stop();
  x=await launch(path);
  const messages=await x.call('POST','/v1/circles/'+circle+'/messages',{body:'After restart'},owner.accessToken);
  assert.equal(messages.status,201);
  const confirmKey=randomUUID();
  const accepted=await x.call('POST','/v1/reports/'+reportId+'/confirm',{units:6,requestId:confirmKey},owner.accessToken);
  assert.equal(accepted.status,201);
  assert.equal(accepted.need.residual,6);
  const after=await x.call('GET','/v1/needs/'+nid+'/reports',null,owner.accessToken);
  assert.equal(after.reports[0].acceptedUnits,6);
  assert.equal(after.reports[0].outstandingUnits,3);
  assert.equal(accepted.evidence,'SEPARATE_OWNER_CAPABILITY_ACCEPTANCE_NOT_PHYSICAL_PROOF');
  const duplicate=await x.call('POST','/v1/reports/'+reportId+'/confirm',{units:6,requestId:confirmKey},owner.accessToken);
  assert.equal(duplicate.confirmation.duplicate,true);
  assert.equal(duplicate.need.residual,6);
  assert.equal((await x.call('POST','/v1/reports/'+reportId+'/confirm',{units:4,requestId:randomUUID()},owner.accessToken)).status,409);
  assert.equal((await x.call('GET',needEndpoint,null,owner.accessToken)).needs[0].confirmed,6);
  const verifiedAudit=await x.call('GET','/v1/admin/audit',null,admin);
  assert.equal(verifiedAudit.status,200);
  assert.equal(verifiedAudit.audit.ok,true);
  assert.ok(verifiedAudit.audit.checked>=6);
  const revoke=await x.call('POST','/v1/admin/actors/'+helper.actorId+'/revoke',{},admin);
  assert.equal(revoke.status,200);
  assert.equal((await x.call('GET','/v1/me',null,helper.accessToken)).status,403);
  assert.equal((await x.call('GET','/v1/me',null,owner.accessToken)).status,200);
 }finally{await x.stop();rmSync(dir,{recursive:true,force:true});}
});
test('refuse missing operator secret, wrong origin, nonsensical quantities and repeated claim keys',async()=>{
 assert.throws(()=>createCampfireBackend({dbPath:':memory:',bootstrapKey:'short'}),/BOOTSTRAP_KEY_32_CHAR_REQUIRED/);
 const x=await launch(':memory:');
 try{
  assert.equal((await x.call('POST','/v1/admin/circles',{label:'no admin'})).status,403);
  const c=await createCircle(x),owner=await member(x,c,'owner'),helper=await member(x,c,'member');
  const url='/v1/circles/'+c+'/messages';
  assert.equal((await x.call('POST',url,{body:'Denied origin'},helper.accessToken,{Origin:'https://evil.example'})).status,403);
  assert.equal((await x.call('POST',url,{body:'Allowed same origin'},helper.accessToken,{Origin:x.origin})).status,201);
  const n=await x.call('POST','/v1/circles/'+c+'/needs',{description:'Temporary test',unit:'units',units:1},owner.accessToken);
  assert.equal((await x.call('POST','/v1/needs/'+n.need.id+'/reports',{units:-1,requestId:randomUUID()},helper.accessToken)).status,400);
  const idempotencyKey=randomUUID();
  assert.equal((await x.call('POST','/v1/needs/'+n.need.id+'/reports',{units:1,requestId:idempotencyKey},helper.accessToken)).status,201);
  assert.equal((await x.call('POST','/v1/needs/'+n.need.id+'/reports',{units:2,requestId:idempotencyKey},helper.accessToken)).status,409);
 }finally{await x.stop();}
});
