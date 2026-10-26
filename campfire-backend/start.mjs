/**
 * Simplest possible Campfire startup.
 * Creates a private admin credential and persistent SQLite data on FIRST run.
 * Reuses both on future starts. Nothing is sent to any provider.
 */
import {randomBytes} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync,chmodSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createCampfireBackend} from './server.mjs';

const directory=resolve(process.env.CAMPFIRE_DATA_DIR||'./private-data/campfire');
const file=join(directory,'campfire.sqlite'),secretPath=join(directory,'operator.key');
mkdirSync(directory,{recursive:true,mode:0o700});
if(!existsSync(secretPath)){
 try{writeFileSync(secretPath,randomBytes(32).toString('hex')+'\n',{flag:'wx',mode:0o600});}
 catch(e){if(e.code!=='EEXIST')throw e;}
}
try{chmodSync(secretPath,0o600);}catch{}
const bootstrapKey=readFileSync(secretPath,'utf8').trim();
const host=process.env.CAMPFIRE_HOST||'127.0.0.1';
const port=Number(process.env.CAMPFIRE_PORT||3417);
if(!['127.0.0.1','::1'].includes(host)&&process.env.CAMPFIRE_ALLOW_NETWORK!=='yes'){
 throw Error('REFUSING_PUBLIC_BIND_WITHOUT_EXPLICIT_APPROVAL');
}
if(!Number.isInteger(port)||port<1||port>65535)throw Error('INVALID_PORT');
const app=createCampfireBackend({dbPath:file,bootstrapKey,
 allowOrigin:process.env.CAMPFIRE_WEB_ORIGIN||null});
app.server.listen(port,host,()=>{
 console.log('Campfire backend ready: http://'+host+':'+port+'/');
 console.log('Persistent private data: '+directory);
 console.log('Admin key file created locally: '+secretPath+' (never share)');
 console.log('Make a circle: node campfire-backend/manage.mjs circle "First Campfire"');
 console.log('No external database or account provider configured.');
});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{
 app.server.close(()=>{app.db.close();process.exit(0);});
});