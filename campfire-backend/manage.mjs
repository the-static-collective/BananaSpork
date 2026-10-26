/** Local-only administrator commands. */
const root=(process.env.CAMPFIRE_BASE_URL||'http://127.0.0.1:3417').replace(/\/+$/,'');
const key=process.env.CAMPFIRE_BOOTSTRAP_KEY;
if(typeof key!=='string'||key.length<32)throw Error('CAMPFIRE_BOOTSTRAP_KEY must be at least 32 characters');
const [action,arg1,arg2]=process.argv.slice(2);
if(!['circle','invite','revoke','audit'].includes(action)) {
 console.error('Usage: node campfire-backend/manage.mjs circle "Name"');
 console.error('       node campfire-backend/manage.mjs invite <circle-id> owner|member');
 console.error('       node campfire-backend/manage.mjs revoke <actor-id>');
 console.error('       node campfire-backend/manage.mjs audit');
 process.exit(2);
}
const commands={
 circle:{method:'POST',path:'/v1/admin/circles',body:{label:arg1}},
 invite:{method:'POST',path:'/v1/admin/circles/'+arg1+'/invites',body:{role:arg2}},
 revoke:{method:'POST',path:'/v1/admin/actors/'+arg1+'/revoke',body:{}},
 audit:{method:'GET',path:'/v1/admin/audit',body:null}
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
}else console.log(JSON.stringify(out,null,2));