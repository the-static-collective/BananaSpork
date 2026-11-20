import test from 'node:test';
import assert from 'node:assert/strict';
import { example, validateWorld, compose, addEvent, receipt, SCHEMA } from '../public/possibility/engine.mjs';

test('synthetic food case asks authorized host before suggesting action', () => {
 const w=example(), p=compose(w);
 assert.equal(p.status,'HOLD'); assert.deepEqual(p.missingRequirementIds,[]);
 assert.deepEqual(p.openGateIds,['host']); assert.deepEqual(p.candidateOfferIds,['baker','driver']);
 assert.match(p.nextQuestion,/authorized to decide.*Receiving host/i);
});
test('all offers and gate satisfied means invitation only, not execution', () => {
 const w=example();w.offers.forEach(o=>o.state='available');w.gates[0].state='approved';
 assert.equal(compose(w).status,'READY_FOR_INVITATION_ONLY');
 assert.equal(compose(w).readyCovered.length,4);assert.equal(w.events.length,0);
});
test('refusal blocks composition',()=>{ const w=example();w.gates[0].state='refused';
 assert.equal(compose(w).status,'REFUSED_GATE');assert.match(compose(w).nextQuestion,/STOP/); });
test('a missing capability becomes an explicit question',()=>{
 const w=example();w.offers=w.offers.filter(o=>o.id!=='driver');
 assert.deepEqual(compose(w).missingRequirementIds,['transport']);
 assert.match(compose(w).nextQuestion,/voluntarily provide.*Transport/i);
});
test('cyclic dependencies do not conjure their own capacity',()=>{
 const w={schema:SCHEMA,title:'cycle',requirements:[{id:'a',label:'A'},{id:'b',label:'B'}],gates:[],events:[],offers:[
 {id:'a',label:'A',provides:['a'],dependsOn:['b'],state:'available'},
 {id:'b',label:'B',provides:['b'],dependsOn:['a'],state:'available'}]};
 assert.deepEqual(compose(w).potentialCovered,[]);assert.equal(compose(w).status,'HOLD');
});
test('minimum offer count wins a tie in complete coverage',()=>{
 const w={schema:SCHEMA,title:'minimal',requirements:[{id:'a',label:'A'},{id:'b',label:'B'}],gates:[],events:[],offers:[
 {id:'one',label:'one',provides:['a'],dependsOn:[],state:'available'},
 {id:'two',label:'two',provides:['b'],dependsOn:[],state:'available'},
 {id:'both',label:'both',provides:['a','b'],dependsOn:[],state:'available'}]};
 assert.deepEqual(compose(w).selectedOfferIds,['both']);
});
test('withdrawn donor is never selected',()=>{
 const w=example();w.offers[0].state='withdrawn';const p=compose(w);
 assert.deepEqual(p.selectedOfferIds,[]);assert.ok(p.missingRequirementIds.includes('ingredient'));
});
test('acceptance then report then distinct-named confirmation, not self confirmation',()=>{
 let w=example();const e=(id,type,actor,fields={})=>({id,at:'2026-11-20T12:00:00Z',type,actor,...fields});
 assert.throws(()=>addEvent(w,e('bad','FULFILLMENT_REPORTED','Helper',{requirementId:'ingredient'})),/accepted/);
 w=addEvent(w,e('accept','OFFER_ACCEPTED','Giver',{offerId:'flour'}));
 w=addEvent(w,e('report','FULFILLMENT_REPORTED','Giver',{requirementId:'ingredient'}));
 assert.throws(()=>addEvent(w,e('self','FULFILLMENT_CONFIRMED','Giver',{requirementId:'ingredient'})),/cannot independently/);
 w=addEvent(w,e('confirm','FULFILLMENT_CONFIRMED','Receiver',{requirementId:'ingredient'}));
 assert.equal(receipt(w).claimedConfirmedRequirements[0],'ingredient');
 assert.equal(receipt(w).verification,'LOCAL_SELF_ATTESTED_IDENTITIES_NOT_AUTHENTICATED');
 assert.throws(()=>addEvent(w,e('again','FULFILLMENT_CONFIRMED','Another',{requirementId:'ingredient'})),/already has/);
 assert.throws(()=>addEvent(w,e('confirm','REFUSED','Another')),/Duplicate event ID/);
});
test('reject invalid schema, unknown requirement and duplicate IDs',()=>{
 const w=example();w.schema='fake';assert.throws(()=>validateWorld(w),/schema/);
 const x=example();x.offers[0].provides=['unknown'];assert.throws(()=>validateWorld(x),/unknown requirement/);
 const y=example();y.requirements.push({...y.requirements[0]});assert.throws(()=>validateWorld(y),/unique/);
});
test('planning and receipt do not mutate source',()=>{
 const w=example(), before=JSON.stringify(w);compose(w);receipt(w);
 assert.equal(JSON.stringify(w),before);
});