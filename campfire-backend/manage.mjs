/** Local-only administrator commands. */
import {existsSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=(process.env.CAMPFIRE_BASE_URL||'http://127.0.0.1:3417').replace(/\/+$/,'');
const privateKeyFile=join(resolve(process.env.CAMPFIRE_DATA_DIR||'./private-data/campfire'),'operator.key');
const key=process.env.CAMPFIRE_BOOTSTRAP_KEY||
 (existsSync(privateKeyFile)?readFileSync(privateKeyFile,'utf8').trim():null);
if(typeof key!=='string'||key.length<32)throw Error('CAMPFIRE_BOOTSTRAP_KEY must be at least 32 characters');
const [action,arg1,arg2]=process.argv.slice(2);
if(!['circle','invite','revoke','audit','status'].includes(action)) {
 console.error('Usage: node campfire-backend/manage.mjs circle "Name"');
 console.error('       node campfire-backend/manage.mjs invite <circle-id> owner|member');
 console.error('       node campfire-backend/manage.mjs revoke <actor-id>');
 console.error('       node campfire-backend/manage.mjs audit');
 console.error('       node campfire-backend/manage.mjs status');
 process.exit(2);
}
const commands={
 circle:{method:'POST',path:'/v1/admin/circles',body:{label:arg1}},
 invite:{method:'POST',path:'/v1/admin/circles/'+arg1+'/invites',body:{role:arg2}},
 revoke:{method:'POST',path:'/v1/admin/actors/'+arg1+'/revoke',body:{}},
 audit:{method:'GET',path:'/v1/admin/audit',body:null},
 status:{method:'GET',path:'/v1/admin/status',body:null}
};
const {method,path,body}=commands[action];
const res=await fetch(root+path,{method,headers:{
 Authorization:'Bearer '+key,...(body===null?{}:{'Content-Type':'application/json'})
},body:body===null?undefined:JSON.stringify(body)});
const out=await res.json();
if(!res.ok||!out.ok){console.error(out.error||'COMMAND_FAILED');process.exit(1)}
if(action==='invite'){
 console.log('ONE-TIME PRIVATE INVITE (never put in a public URL):');
 console.log(out.inviteCode);
 console.log('Expires:',out.expiresAt);
}else if(action==='status'){
 console.log('CAMPFIRE · THE FIREBOX REPORT');
 console.log('');
 console.log('THE FIREBOX · '+(out.health==='RESPONDING'?'Responding':'Needs attention'));
 console.log('THE LOGBOOK · '+(out.trust?.dataPersistsOnHostDisk?'SQLite on this host (durable file)':'Memory-only test data'));
 console.log('THE CAMPFIRES · '+out.counts.circles+' circles, '+out.counts.activeMembers+' active keys');
 console.log('THE PORCH · '+out.counts.messages+' messages remembered');
 console.log('THE BASKET · '+out.counts.needs+' needs, '+out.counts.reports+' reports, '+out.counts.ownerAcceptances+' owner acceptances');
 console.log('THE INVITATIONS · '+out.counts.unredeemedInvitations+' unredeemed, '+out.counts.expiredInvitations+' expired');
 console.log('THE RECEIPT TRAIL · '+(out.audit?.ok?'Local hash chain intact':'Needs investigation'));
 console.log('THE LAST ACTIVITY · '+(out.lastActivity||'None'));
 console.log('');
 console.log('IMPORTANT · Backup: NOT VERIFIED · Human identity: NOT VERIFIED · Physical delivery: NOT VERIFIED');
 console.log('THE WAGGLE · The firebox reports its own health; the private SQLite logbook does not travel to other machines.');
 console.log('This command reads state using the operator key stored on this computer.');
}else console.log(JSON.stringify(out,null,2));