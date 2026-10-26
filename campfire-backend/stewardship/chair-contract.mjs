/**
 * CHAIR-001: a self-assumed position, never evidence of independent oversight.
 * Source is a bounded, public self-declaration, not a member identity record.
 */
import {createHash} from 'node:crypto';

export const CHAIR_SCHEMA='campfire.founding-chair/v0';
export const CHAIR_RECEIPT_SCHEMA='campfire.founding-chair-receipt/v0';

const REQUIRED_PROMISES=Object.freeze([
  'KEEP_ACCESS_TO_QUESTION_AND_REFUSE',
  'NO_PUNISHMENT_FOR_GOOD_FAITH_PROCESS_CONCERNS',
  'MAINTAIN_PRIVATE_CONSENTED_ACCOUNTABILITY_RECEIPTS',
  'RECUSE_FROM_JUDGING_OWN_CONDUCT',
  'NEVER_LINK_AID_TO_VOLUNTEER_DUTY',
  'PROTECT_PEOPLE_OVER_METRICS_OR_CONTINUITY',
  'ACCEPT_CORRECTION_AND_ENABLE_ROLE_TRANSFER'
]);

const BOUNDARY_FLAGS=Object.freeze([
  'bindingLegalAuthority','organizationalBoardSeat','independenceCertified',
  'externalWitnessed','platformDeployment','thirdPartyPartnerships',
  'physicalOutcomesVerified'
]);

const isPlain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;

export function validateFirstChair(r){
  if(!isPlain(r))throw Error('CHAIR_RECORD_INVALID');
  const keys=['schema','eventId','effectiveDate','publicAlias','declaredRole','initiation',
    'consentStanding','verifiedHumanIdentity','administrativePrivilegesConferred',
    'independentReview','independentReviewer','recusalRequiredForSelfConcern',
    'successorChair','stewardshipPromises','boundaries','history','plainLanguage'];
  if(Object.keys(r).length!==keys.length||Object.keys(r).some(k=>!keys.includes(k)))
    throw Error('CHAIR_RECORD_UNEXPECTED_FIELD');
  if(r.schema!==CHAIR_SCHEMA||r.eventId!=='CHAIR-001-2026-10-26'||
     r.effectiveDate!=='2026-10-26'||r.publicAlias!=='Lu / The Static Collective'||
     r.declaredRole!=='INITIAL_VOLUNTEER_STEWARD'||
     r.initiation!=='EXPLICIT_USER_APPROVAL_IN_CONVERSATION'||
     r.consentStanding!=='SELF_DECLARED_VOLUNTARY')
    throw Error('CHAIR_IDENTITY_OR_CONSENT_BOUNDARY');
  if(r.verifiedHumanIdentity!==false||r.administrativePrivilegesConferred!==false||
     r.independentReview!=='PENDING'||r.independentReviewer!==null||
     r.recusalRequiredForSelfConcern!==true)
    throw Error('CHAIR_CANNOT_CERTIFY_SELF');
  if(!isPlain(r.successorChair)||
     Object.keys(r.successorChair).length!==4||
     r.successorChair.id!=='CHAIR-002'||
     r.successorChair.standing!=='OPEN_UNASSIGNED_INVITATION'||
     r.successorChair.assignee!==null||
     r.successorChair.independentlyConsented!==false)
    throw Error('SECOND_CHAIR_NOT_ASSIGNED');
  if(!Array.isArray(r.stewardshipPromises)||r.stewardshipPromises.length!==REQUIRED_PROMISES.length||
     REQUIRED_PROMISES.some(x=>!r.stewardshipPromises.includes(x))||
     new Set(r.stewardshipPromises).size!==REQUIRED_PROMISES.length)
    throw Error('CHAIR_PROMISES_MUST_BE_COMPLETE');
  if(!isPlain(r.boundaries)||Object.keys(r.boundaries).length!==BOUNDARY_FLAGS.length||
     BOUNDARY_FLAGS.some(k=>r.boundaries[k]!==false))
    throw Error('IMPLIED_EXTERNAL_AUTHORITY_REFUSED');
  if(typeof r.history!=='string'||!r.history.includes('not independent identity authentication')||
     typeof r.plainLanguage!=='string'||!r.plainLanguage.includes('sole judge'))
    throw Error('LIMITATIONS_MUST_REMAIN_VISIBLE');
  return r;
}

export function foundingReceipt(declaration){
  const r=validateFirstChair(declaration);
  const canonical=JSON.stringify(r);
  const digest='sha256:'+createHash('sha256').update(canonical,'utf8').digest('hex');
  return {
    schema:CHAIR_RECEIPT_SCHEMA,
    eventId:r.eventId,
    statementDigest:digest,
    basis:'GITHUB_VERSIONED_SELF_DECLARATION',
    humanAuthorization:'SELF_REPORTED_FROM_EXPLICIT_USER_APPROVAL',
    provenance:'PUBLIC_GIT_COMMIT_AND_THIS_DETERMINISTIC_DIGEST_ONLY',
    roleStanding:'FIRST_VOLUNTARY_STEWARD_SELF_ASSUMED',
    independentHumanIdentityVerified:false,
    independentReviewerAssigned:false,
    independentReviewCompleted:false,
    secondChairAssigned:false,
    legalAuthorityGranted:false,
    operatorCredentialsIssued:false,
    fieldServiceDeployed:false,
    downstreamEffects:0,
    trustClaim:'HASH_IS_CONTENT_INTEGRITY_NOT_A_HUMAN_SIGNATURE_OR_INDEPENDENT_WITNESS',
    nextHumanStep:'Seek a separate willing adult for CHAIR-002; verify identity and independence without transferring private records.'
  };
}
