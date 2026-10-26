/**
 * ATTENTION-001: determined by a source-side snapshot, not generated conclusions.
 * Each card is a suggestion for a human to consider in the next day.
 * No private messages, beneficiaries, emails, or household case descriptions.
 * NO automation, public posting, graph promotion or confirmation inference.
 */
export const ATTENTION_SCHEMA='campfire.operator-attention/v0';
const card=(code,level,headline,observation,prepare,permission,proof,scope='operator')=>({
 code,level,headline,observation,prepare,permission,proof,scope,
 standing:'PROPOSAL_NOT_ACTION',canExecute:false,hasConsent:false
});
function nat(x,name){
 if(!Number.isSafeInteger(x)||x<0)throw Error('INVALID_ATTENTION_COUNT_'+name);
 return x;
}
export function buildAttention({counts={},audit=null,circles=[],backupVerified=false}={}){
 if(!audit||typeof audit.ok!=='boolean'||!Array.isArray(circles))throw Error('ATTENTION_SOURCE_REQUIRED');
 for(const k of ['circles','activeMembers','messages','needs','reports','ownerAcceptances','unredeemedInvitations'])
  nat(counts[k],k);
 const items=[],n=counts;
 if(!audit.ok){
  items.push(card('HALT_INTEGRITY','stop','Protect the logbook',
   'The local audit hash chain did not pass its integrity check.',
   'Stop the pilot, keep a protected copy of the files and review the source of the mismatch offline.',
   'An authorized operator decides whether any recovery may occur.',
   'A documented independent audit and restored source integrity.'));
  return output(items,n,audit);
 }
 if(n.circles===0){
  items.push(card('FIRST_CIRCLE','next','Make the first tiny room',
   'The logbook contains no Campfire circles.',
   'Ask whether two willing people want to test harmless messages; if yes, create one private test circle.',
   'Receive individual voluntary agreement before issuing each invitation.',
   'One circle exists, but nobody has been enrolled automatically.'));
 } else {
  for(const c of circles.slice(0,20)){
   if(typeof c.id!=='string'||!['owners','members','messages','needs','unreviewedReports']
       .every(k=>Number.isSafeInteger(c[k])&&c[k]>=0))
    throw Error('INVALID_CIRCLE_SNAPSHOT');
   if(c.owners===0){
    items.push(card('NEEDS_OWNER','next','Give this room a willing keeper',
     'A private circle exists without an active owner capability.',
     'Offer an individual owner invitation; do not assign a role to anyone silently.',
     'The intended owner must freely accept their own invitation.',
     'One separate owner capability has been issued and redeemed.',c.id));
   }else if(c.members===0){
    items.push(card('INVITE_TEST_MEMBER','next','Invite a second pair of hands',
     'A circle has an owner but no active non-owner member.',
     'Prepare one private one-use member invitation for someone who wants to test the conversation.',
     'Ask permission before sharing the one-use invitation.',
     'A distinct member credential has been redeemed; this is not human identity proof.',c.id));
   }else if(c.unreviewedReports>0){
    items.push(card('REVIEW_REPORTED_HELP','next','A report needs a human decision',
     'One or more helper reports have quantities the owner capability has not accepted.',
     'Ask the need owner to look at the report inbox; accept, decline, or leave it unresolved.',
     'Only the need owner decides. Never treat a helper report as delivery.',
     'A separate owner capability accepts an explicit quantity, or the item remains unresolved.',c.id));
   }else if(c.messages===0){
    items.push(card('FIRST_CONVERSATION','next','See whether conversation actually works',
     'A circle has at least two active capabilities and no stored messages.',
     'Invite each participating tester to post one harmless, fictional message and refresh.',
     'Both participants choose whether to participate.',
     'Each independently retrieves the persisted message; a third unrelated capability must be denied.',c.id));
   }else if(c.needs===0){
    items.push(card('TEST_ONE_NEED','next','Test one small useful action',
     'Messages exist in a circle, but no need has been opened.',
     'Offer an optional fictional need for the group to test reports and separate owner acceptance.',
     'A willing owner chooses the example; do not assign a helper or claim actual aid.',
     'A report does not change residual; an owner can review a partial quantity.',c.id));
   }
  }
 }
 if(n.ownerAcceptances>0){
  items.push(card('HUMAN_WITNESS_GAP','review','Distinguish software acceptance from real-world proof',
   'Some quantities were accepted by owner credentials; that is not independent evidence of delivery.',
   'Create a private evidence question, not a public success story.',
   'The actual recipient and authorized owner control whether they participate in checking.',
   'Independent human and source-owner review; never infer it from the app alone.'));
 }
 if(!backupVerified){
  items.push(card('PROTECT_LOGBOOK','maintenance','Protect what you are remembering',
   'There is no independently verified backup-and-restore result for this logbook.',
   'Prepare an offline, encrypted backup and a safe restore exercise before putting sensitive or important records here.',
   'The host operator controls the disk and key; never copy member data to a public notebook.',
   'A separately completed restore drill and documented custody.'));
 }
 if(items.length===0){
  items.push(card('CHECK_WITH_PEOPLE','next','Ask what would actually be useful',
   'No actionable missing technical step is evident from the limited counts available.',
   'Ask willing participants what one useful experiment they want to try next, without reading private messages.',
   'Nobody is obligated to offer or participate.',
   'One explicitly agreed question and a concrete, harmless test.'));
 }
 const priority={stop:0,next:1,review:2,maintenance:3};
 items.sort((a,b)=>priority[a.level]-priority[b.level]||a.code.localeCompare(b.code));
 return output(items,n,audit);
}
function output(cards,counts,audit){
 return {
  ok:true,schema:ATTENTION_SCHEMA,mode:'READ_ONLY_OPERATOR_BRIEF',basis:'SOURCE_DATABASE_COUNTS_NOT_MESSAGES',
  auditState:audit.ok?'LOCAL_HASH_CHAIN_INTACT':'LOCAL_AUDIT_FAILED',
  next24Hours:cards[0],
  otherOptions:cards.slice(1,5),
  countContext:{circles:counts.circles,messages:counts.messages,needs:counts.needs,reports:counts.reports,
   ownerAcceptances:counts.ownerAcceptances},
  authority:{execute:false,inviteSent:false,personAssigned:false,humanVerified:false,
   provisionVerified:false,knowledgePublished:false,backendChanged:false},
  limitations:[
   'No message bodies or personal context were read to create this brief.',
   'These suggestions do not know the true availability or consent of any person.',
   'Software owner acceptance is not evidence of an actual physical delivery.',
   'No action was taken and no one was contacted.'
  ]
 };
}
