import test from 'node:test';
import assert from 'node:assert/strict';
import {checkFirstChair} from './check-first-chair.mjs';
import {foundingReceipt,validateFirstChair} from './chair-contract.mjs';

const {record,receipt}=checkFirstChair();
const edit=(patch)=>({...record,...patch});

test('actual first chair receipt matches content-addressed public self-declaration',()=>{
 assert.equal(record.publicAlias,'Lu / The Static Collective');
 assert.equal(record.consentStanding,'SELF_DECLARED_VOLUNTARY');
 assert.equal(record.declaredRole,'INITIAL_VOLUNTEER_STEWARD');
 assert.equal(receipt.statementDigest,'sha256:619aea9c587be9a0ce4ba4b2672a86c14f2bba9483e57285c31cb8cbc8ef8c0d');
 assert.deepEqual(receipt,foundingReceipt(record));
 assert.equal(receipt.fieldServiceDeployed,false);
 assert.equal(receipt.downstreamEffects,0);
 assert.equal(receipt.independentReviewerAssigned,false);
 assert.equal(receipt.legalAuthorityGranted,false);
});

test('first volunteer cannot certify themselves, assign the next chair or gain infrastructure credentials',()=>{
 for(const patch of [
  {independentReview:'APPROVED'},
  {independentReviewer:'Lu'},
  {verifiedHumanIdentity:true},
  {administrativePrivilegesConferred:true},
  {recusalRequiredForSelfConcern:false},
  {successorChair:{...record.successorChair,assignee:'volunteer-002'}},
  {successorChair:{...record.successorChair,independentlyConsented:true}},
  {boundaries:{...record.boundaries,independenceCertified:true}},
  {boundaries:{...record.boundaries,organizationalBoardSeat:true}},
  {boundaries:{...record.boundaries,thirdPartyPartnerships:true}},
  {fieldServiceDeployed:true},
  {operatorKey:'not permitted'},
 ]) assert.throws(()=>foundingReceipt(edit(patch)));
});

test('role is conditional on no-retaliation, free refusal and no debt',()=>{
 for(const name of [
  'NO_PUNISHMENT_FOR_GOOD_FAITH_PROCESS_CONCERNS',
  'KEEP_ACCESS_TO_QUESTION_AND_REFUSE',
  'NEVER_LINK_AID_TO_VOLUNTEER_DUTY',
  'RECUSE_FROM_JUDGING_OWN_CONDUCT'
 ]) assert.throws(()=>validateFirstChair(edit({
  stewardshipPromises:record.stewardshipPromises.filter(k=>k!==name)
 })));
});

test('a second chair is an unassigned invitation, not evidence of enrollment',()=>{
 assert.equal(record.successorChair.id,'CHAIR-002');
 assert.equal(record.successorChair.assignee,null);
 assert.equal(record.successorChair.independentlyConsented,false);
 assert.equal(receipt.secondChairAssigned,false);
 assert.equal(receipt.independentReviewCompleted,false);
});
