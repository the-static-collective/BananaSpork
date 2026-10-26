import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

async function freePort(){
 const listener=createServer();
 await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));
 const p=listener.address().port;
 await new Promise(resolve=>listener.close(resolve));
 return p;
}
async function run(dir,port){
 const child=spawn(process.execPath,['campfire-backend/start.mjs'],{
  env:{...process.env,CAMPFIRE_DATA_DIR:dir,CAMPFIRE_PORT:String(port),
   CAMPFIRE_HOST:'127.0.0.1',CAMPFIRE_BOOTSTRAP_KEY:''},
  cwd:process.cwd(),stdio:['ignore','pipe','pipe']
 });
 await new Promise((resolve,reject)=>{
  let text='',done=false;
  const timer=setTimeout(()=>{if(!done){done=true;child.kill('SIGKILL');reject(Error('BOOT_TIMEOUT:'+text));}},8000);
  child.stdout.on('data',chunk=>{
   text+=chunk.toString();
   if(!done&&text.includes('Campfire backend ready')){
    done=true;clearTimeout(timer);resolve();
   }
  });
  child.once('exit',code=>{if(!done){done=true;clearTimeout(timer);reject(Error('BOOT_EXIT_'+code+':'+text));}});
 });
 return child;
}
async function stop(child){
 if(child.exitCode!==null)return;
 await new Promise(resolve=>{
  child.once('exit',resolve);
  child.kill('SIGTERM');
 });
}
test('one-command startup creates local key & SQLite and reuses them after restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'campfire-autostart-')),port=await freePort();
 const keyPath=join(dir,'operator.key'),dbPath=join(dir,'campfire.sqlite');
 const base='http://127.0.0.1:'+port;
 let child=await run(dir,port);
 try{
  assert.equal(existsSync(keyPath),true);
  assert.equal(existsSync(dbPath),true);
  const key=readFileSync(keyPath,'utf8').trim();
  assert.equal(key.length,64);
  assert.equal((await (await fetch(base+'/health')).json()).ok,true);
  const created=await fetch(base+'/v1/admin/circles',{method:'POST',
   headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify({label:'A durable private test circle'})});
  assert.equal(created.status,201);
  const result=await created.json();assert.equal(result.ok,true);
  await stop(child);
  child=await run(dir,port);
  assert.equal(readFileSync(keyPath,'utf8').trim(),key,'admin key should persist');
  const audit=await fetch(base+'/v1/admin/audit',{headers:{Authorization:'Bearer '+key}});
  assert.equal(audit.status,200);
  assert.equal((await audit.json()).audit.ok,true);
  const invite=await fetch(base+'/v1/admin/circles/'+result.circle.id+'/invites',{method:'POST',
   headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify({role:'owner'})});
  assert.equal(invite.status,201,'circle and key must survive restart');
 }finally{
  await stop(child);rmSync(dir,{recursive:true,force:true});
 }
});
