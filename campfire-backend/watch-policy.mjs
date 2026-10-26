/**
 * WATCH-THE-WATCHMEN-001
 * The people who wield stewardship/administration are not the final witnesses
 * of their own legitimacy. This module never assigns blame, verifies identity,
 * resolves a complaint, or publishes private concern data.
 */
export const WATCH_SCHEMA='campfire.watch-signal/v0';
export const WATCH_CATEGORIES=Object.freeze([
  'PRIVACY_BOUNDARY','UNAUTHORIZED_DISCLOSURE','MISREPRESENTED_HELP',
  'COERCION_OR_RETALIATION','UNSAFE_STEWARDSHIP','OTHER_PROCESS_CONCERN'
]);
export const WATCH_SCOPES=Object.freeze([
  'SYSTEM_OPERATOR','CIRCLE_OWNER','MEMBER_STEWARDSHIP','SOFTWARE_PROCESS'
]);
export const WATCH_STANCES=Object.freeze(['ACKNOWLEDGED_FOR_ESCALATION','INDEPENDENT_REVIEW_NEEDED']);
const hasOnly=(obj,keys)=>Boolean(obj&&typeof obj==='object'&&!Array.isArray(obj)&&
  Object.keys(obj).every(k=>keys.includes(k)));
export function parseWatchSubmission(obj){
  if(!hasOnly(obj,['category','subjectScope','requestId']) ||
     Object.keys(obj).length!==3 ||
     !WATCH_CATEGORIES.includes(obj.category) ||
     !WATCH_SCOPES.includes(obj.subjectScope))
    throw Error('INVALID_WATCH_SIGNAL');
  return {category:obj.category,subjectScope:obj.subjectScope,requestId:obj.requestId};
}
export function parseReviewStance(obj){
  if(!hasOnly(obj,['inviteCode','stance'])||Object.keys(obj).length!==2||
     !WATCH_STANCES.includes(obj.stance)||
     typeof obj.inviteCode!=='string')throw Error('INVALID_REVIEW_SUBMISSION');
  return {inviteCode:obj.inviteCode,stance:obj.stance};
}
export function watchPosture({auditOk,signals,attestations,twoKeySignals}){
  for(const n of [signals,attestations,twoKeySignals])
    if(!Number.isSafeInteger(n)||n<0)throw Error('INVALID_WATCH_COUNT');
  if(typeof auditOk!=='boolean'||twoKeySignals>signals||twoKeySignals*2>attestations)
    throw Error('INVALID_WATCH_PROVENANCE');
  return {
    schema:'campfire.watch-posture/v0',
    standing:auditOk?'UNRESOLVED_NEEDS_INDEPENDENT_HUMAN_OVERSIGHT':'HALT_INTEGRITY',
    signals,reviewerCredentialAttestations:attestations,signalsWithTwoCredentialAttestations:twoKeySignals,
    verifiedIndependentHumans:0,
    verifiedHumanOversight:false,
    selfCertificationAllowed:false,
    permissionToPublish:false,
    authorityToDismiss:false,
    automaticSanctions:false,
    nextAction:auditOk?
      (signals?'Offer a separate consented independent human review; do not declare any complaint resolved.':'Seek independent oversight rather than infer safety from an empty queue.') :
      'Stop external claims and investigate local journal integrity without leaking reporter information.',
    caution:'A concern is not a finding. Two different access keys do not establish two different people. The host owns the database and can rewrite it; independent retained checkpoints and real human safeguards are not implemented.',
    noPublicCounts:true,noReportsRead:true,noNotificationSent:true
  };
}
