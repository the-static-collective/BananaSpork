import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareInheritanceSeed,renderPrivateReviewCard,supportedSeedKinds,SCHEMA} from './inheritance.mjs';
import {run} from './seed-card.mjs';

const consent={purpose:'INDEPENDENT_NEW_OFFER',intent:'I_OFFER_FREELY',adultSelfAttested:true,kind:'small_repairs',availability:'one_off'};
test('explicit independent voluntary adult offer holds for review, no action or publication',()=>{
  const a=prepareInheritanceSeed(consent);
  assert.equal(a.schema,SCHEMA);assert.equal(a.state,'HOLD_FOR_PRIVATE_REVIEW');
  assert.equal(a.authority.dispatch,false);assert.equal(a.authority.match,false);
  assert.equal(a.authority.debtCreated,false);assert.equal(a.gates.adultIdentityVerified,false);
  assert.equal(a.informationPublished,false);assert.equal(a.personContacted,false);
  assert.equal('recipient' in a,false);assert.equal('source' in a,false);
  assert.equal('caseId' in a.candidate,false);
  assert.match(renderPrivateReviewCard(a),/NOT PUBLISHED/);
});
test('no entitlement or prior aid event can turn into a seed',()=>{
  const attacks=[
    {...consent,recipientId:'child-private'},
    {...consent,caseId:'private'},
    {...consent,origin:'received aid'},
    {...consent,contact:'555-0000'},
    {...consent,story:'survivor history'},
    {...consent,needId:'something'},
    {...consent,voluntary:true}
  ];
  for(const attack of attacks){
    const actual=prepareInheritanceSeed(attack);
    assert.equal(actual.state,'REFUSED'); assert.equal(actual.candidate,null);
    assert.equal(JSON.stringify(actual).includes('private'),false);
    assert.equal(JSON.stringify(actual).includes('555'),false);
  }
});
test('no inferred consent, minors, unsupported availability or category',()=>{
  for(const bad of [
    {...consent,intent:'SOMEONE_ELSE_SAID_YES'},
    {...consent,intent:undefined},
    {...consent,adultSelfAttested:false},
    {...consent,adultSelfAttested:'yes'},
    {...consent,purpose:'AFTER_RECEIVING_HELP'},
    {...consent,kind:'individual_caseworker'},
    {...consent,availability:'tonight at a home address'},
    null,[],1
  ])assert.equal(prepareInheritanceSeed(bad).state,'REFUSED');
});
test('bounded source-controlled kind labels, even forged rendering refuses',()=>{
  assert.ok(supportedSeedKinds().includes('garden_work'));
  const correct=prepareInheritanceSeed(consent);
  assert.throws(()=>renderPrivateReviewCard({...correct,candidate:{...correct.candidate,capacity:'<script>alert(1)</script>'}}));
  assert.throws(()=>renderPrivateReviewCard(prepareInheritanceSeed({...consent,intent:'no'})));
});
test('CLI emits only private held packet into a new directory; never overwrites',async()=>{
  const root=await mkdtemp(join(tmpdir(),'inheritance-'));
  try {
    const folder=join(root,'one');
    const argv=['--kind','garden_work','--availability','unsure','--intent','I_OFFER_FREELY','--output-directory',folder];
    const result=await run(argv);
    assert.equal(result.state,'HOLD_FOR_PRIVATE_REVIEW');
    const json=JSON.parse(await readFile(join(folder,'review.json'),'utf8'));
    assert.equal(json.candidate.kind,'garden_work');
    const html=await readFile(join(folder,'review.html'),'utf8');
    assert.match(html,/PRIVATE REVIEW/);assert.doesNotMatch(html,/contact@|http:\/\//);
    assert.equal((await stat(join(folder,'review.json'))).mode & 0o777,0o600);
    await assert.rejects(run(argv),/EEXIST/);
    await assert.rejects(run(['--kind','garden_work','--availability','unsure','--intent','not consent','--output-directory',join(root,'bad')]),/SEED_REFUSED/);
    await assert.rejects(stat(join(root,'bad')),/ENOENT/);
    await assert.rejects(run([...argv,'--case','abc']),/USAGE|FOUR_EXPLICIT/);
  } finally{await rm(root,{recursive:true,force:true});}
});
