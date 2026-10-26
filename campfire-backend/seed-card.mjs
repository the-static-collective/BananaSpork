#!/usr/bin/env node
/** Operator-only, offline, one-use local draft packet. No network, no database. */
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {prepareInheritanceSeed,renderPrivateReviewCard} from './inheritance.mjs';

export async function run(args){
  // No free text accepted, not even a comment. A person/case/story cannot leak here.
  const flags={};
  for(let i=0;i<args.length;i+=2){
    const key=args[i],value=args[i+1];
    if(!['--kind','--availability','--intent','--adult-affirmation','--output-directory'].includes(key)||
       typeof value!=='string'||value.startsWith('--')||Object.hasOwn(flags,key)){
      throw Error('USAGE: --kind <category> --availability <one_off|occasional|unsure> --intent I_OFFER_FREELY --adult-affirmation I_AM_AN_ADULT --output-directory <new-private-folder>');
    }
    flags[key]=value;
  }
  if(args.length!==10 || Object.keys(flags).length!==5)throw Error('FOUR_EXPLICIT_FLAGS_REQUIRED');
  const packet=prepareInheritanceSeed({
    purpose:'INDEPENDENT_NEW_OFFER',intent:flags['--intent'],adultSelfAttested:flags['--adult-affirmation']==='I_AM_AN_ADULT',
    kind:flags['--kind'],availability:flags['--availability']
  });
  if(packet.state!=='HOLD_FOR_PRIVATE_REVIEW')throw Error('SEED_REFUSED_'+packet.reason);
  const directory=resolve(flags['--output-directory']);
  if(directory===process.cwd())throw Error('EXPLICIT_NEW_FOLDER_REQUIRED');
  // Exclusive mkdir: refuse overwrite and prevent silent expansion of existing data.
  await mkdir(directory,{mode:0o700});
  await writeFile(resolve(directory,'review.json'),JSON.stringify(packet,null,2)+'\n',{flag:'wx',mode:0o600});
  await writeFile(resolve(directory,'review.html'),renderPrivateReviewCard(packet),{flag:'wx',mode:0o600});
  return {state:packet.state,privateDirectory:directory,files:['review.json','review.html']};
}

if(process.argv[1] && import.meta.url===new URL('file://'+resolve(process.argv[1])).href){
  run(process.argv.slice(2)).then(result=>{
    console.log(JSON.stringify(result));
  }).catch(error=>{console.error(error.message);process.exitCode=1;});
}
