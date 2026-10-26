import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAttention,ATTENTION_SCHEMA} from './attention.mjs';
const counts={circles:0,activeMembers:0,messages:0,needs:0,reports:0,ownerAcceptances:0,unredeemedInvitations:0};
const audit={ok:true,checked:0,head:'0'.repeat(64)};
const call=(rest={})=>buildAttention({
 counts:{...counts,...(rest.counts||{})},audit:rest.audit||audit,
 circles:rest.circles||[],backupVerified:rest.backupVerified||false
});
const c=(mod={})=>({
 id:'11111111-1111-4111-8111-111111111111',
 owners:1,members:1,messages:0,needs:0,unreviewedReports:0,...mod
});
test('fresh installation proposes first circle, NOT an invitation sent or a public claim',()=>{
 const result=call();
 assert.equal(result.schema,ATTENTION_SCHEMA);
 assert.equal(result.next24Hours.code,'FIRST_CIRCLE');
 assert.equal(result.next24Hours.canExecute,false);
 assert.equal(result.next24Hours.standing,'PROPOSAL_NOT_ACTION');
 assert.equal(result.authority.inviteSent,false);
 assert.equal(result.authority.backendChanged,false);
 assert.ok(result.otherOptions.some(x=>x.code==='PROTECT_LOGBOOK'));
});
test('priority: broken local audit stops everything else including invitations',()=>{
 const result=call({audit:{ok:false,checked:2,failedAt:3},counts:{circles:1},circles:[c({owners:0})]});
 assert.equal(result.next24Hours.code,'HALT_INTEGRITY');
 assert.equal(result.next24Hours.level,'stop');
 assert.equal(result.otherOptions.length,0);
 assert.equal(result.authority.execute,false);
});
test('specific missing participation gate determines a concrete consent-based next step',()=>{
 const noOwner=call({counts:{circles:1},circles:[c({owners:0,members:0})]});
 assert.equal(noOwner.next24Hours.code,'NEEDS_OWNER');
 assert.match(noOwner.next24Hours.permission,/freely/);
 const noMember=call({counts:{circles:1,activeMembers:1},circles:[c({members:0})]});
 assert.equal(noMember.next24Hours.code,'INVITE_TEST_MEMBER');
 assert.match(noMember.next24Hours.permission,/permission/);
 const noMessages=call({counts:{circles:1,activeMembers:2},circles:[c()]});
 assert.equal(noMessages.next24Hours.code,'FIRST_CONVERSATION');
 const noNeeds=call({counts:{circles:1,activeMembers:2,messages:2},circles:[c({messages:2})]});
 assert.equal(noNeeds.next24Hours.code,'TEST_ONE_NEED');
});
test('unreviewed helper reports are a human decision, never fulfillment',()=>{
 const result=call({counts:{circles:1,activeMembers:2,messages:2,needs:1,reports:1},
 circles:[c({messages:2,needs:1,unreviewedReports:1})]});
 assert.equal(result.next24Hours.code,'REVIEW_REPORTED_HELP');
 assert.match(result.next24Hours.permission,/Only the need owner/);
 assert.equal(result.authority.provisionVerified,false);
 assert.equal(JSON.stringify(result).includes('help was delivered'),false);
});
test('accepted quantities cause evidence question, never verified outcome',()=>{
 const result=call({counts:{circles:1,activeMembers:2,messages:2,needs:1,reports:1,ownerAcceptances:1},
 circles:[c({messages:2,needs:1,unreviewedReports:0})]});
 assert.equal(result.next24Hours.code,'HUMAN_WITNESS_GAP');
 assert.equal(result.next24Hours.level,'review');
 assert.equal(result.authority.knowledgePublished,false);
 assert.match(result.next24Hours.proof,/Independent human/);
});
test('no backup proof is always shown as an unresolved maintenance opportunity',()=>{
 const x=call({counts:{circles:1,activeMembers:2,messages:2,needs:1},circles:[c({messages:2,needs:1})]});
 assert.equal(x.next24Hours.code,'PROTECT_LOGBOOK');
 const y=call({counts:{circles:1,activeMembers:2,messages:2,needs:1},circles:[c({messages:2,needs:1})],backupVerified:true});
 assert.equal(y.next24Hours.code,'CHECK_WITH_PEOPLE');
 assert.match(y.next24Hours.permission,/Nobody is obligated/);
});
test('malformed source counts cannot be used to invent a successful summary',()=>{
 assert.throws(()=>call({counts:{messages:-1}}),/INVALID_ATTENTION_COUNT_messages/);
 assert.throws(()=>call({circles:[c({unreviewedReports:-1})],counts:{circles:1}}),/INVALID_CIRCLE_SNAPSHOT/);
 assert.throws(()=>buildAttention({counts,audit:null,circles:[]}),/ATTENTION_SOURCE_REQUIRED/);
});
