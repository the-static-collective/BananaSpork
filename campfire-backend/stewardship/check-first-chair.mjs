import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {foundingReceipt,validateFirstChair} from './chair-contract.mjs';

const readLocal=(name)=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));

export function checkFirstChair(){
 const record=readLocal('CHAIR-001.json');
 const stored=readLocal('CHAIR-001.receipt.json');
 const expected=foundingReceipt(record);
 assert.deepEqual(stored,expected,'FOUNDING_RECEIPT_MISMATCH');
 return {record:validateFirstChair(record),receipt:expected};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(new URL('file://'+process.argv[1]))){
 try{
  const {record,receipt}=checkFirstChair();
  console.log('FIRST CHAIR · '+record.publicAlias);
  console.log('Standing: '+record.consentStanding+' · '+record.independentReview);
  console.log('Opening receipt: '+receipt.statementDigest);
  console.log('Second chair: '+record.successorChair.standing);
  console.log('Operator powers or outside credentials granted: NO');
  console.log('Independent review and external witnessing completed: NO');
  console.log('This checks a versioned declaration. It is not proof of independent consent or field oversight.');
 }catch(error){console.error('FIRST_CHAIR_REFUSED: '+error.message);process.exitCode=1;}
}
