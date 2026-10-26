/**
 * Campfire Backend 001. First-party SQLite WAL capability backend; no external
 * database, hosted identity, payments, LLM or secret credentials in browser.
 * Credential confirmation != identity or physical delivery verification.
 */
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:http';
import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {mkdirSync,chmodSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildAttention} from './attention.mjs';
import {parseWatchSubmission,parseReviewStance,watchPosture} from './watch-policy.mjs';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha=x=>createHash('sha256').update(x).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
const now=()=>new Date().toISOString();
const zero='0'.repeat(64);
const error=(code,status=400)=>{const e=new Error(code);e.status=status;throw e;};
function id(x){if(typeof x!=='string'||!uuid.test(x))error('INVALID_ID');return x.toLowerCase();}
function val(x,max=500,min=1){
 if(typeof x!=='string')error('TEXT_REQUIRED');
 const t=x.trim();if(t.length<min||t.length>max||/[\x00-\x1f\x7f]/.test(t))error('INVALID_TEXT');
 return t;
}
function units(x){if(!Number.isSafeInteger(x)||x<=0)error('INVALID_UNITS');return x;}
function bearer(req){
 const h=req.headers.authorization;
 return typeof h==='string'&&/^Bearer [-\w]{32,128}$/.test(h)?h.slice(7):null;
}
function equal(a,b){
 if(!a||!b)return false;
 const x=Buffer.from(a),y=Buffer.from(b);
 return x.length===y.length&&timingSafeEqual(x,y);
}
const ddl=[
 "PRAGMA foreign_keys=ON",
 "CREATE TABLE IF NOT EXISTS circles(id TEXT PRIMARY KEY,label TEXT NOT NULL,created_at TEXT NOT NULL)",
 "CREATE TABLE IF NOT EXISTS invites(token_hash TEXT PRIMARY KEY,circle_id TEXT NOT NULL REFERENCES circles(id),role TEXT NOT NULL CHECK(role IN ('owner','member')),expires_at INTEGER NOT NULL,used_at INTEGER)",
 "CREATE TABLE IF NOT EXISTS actors(id TEXT PRIMARY KEY,circle_id TEXT NOT NULL REFERENCES circles(id),role TEXT NOT NULL CHECK(role IN ('owner','member')),token_hash TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,revoked_at TEXT)",
 "CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,circle_id TEXT NOT NULL REFERENCES circles(id),actor_id TEXT NOT NULL REFERENCES actors(id),body TEXT NOT NULL,created_at TEXT NOT NULL)",
 "CREATE INDEX IF NOT EXISTS messages_by_circle ON messages(circle_id,created_at,id)",
 "CREATE TABLE IF NOT EXISTS needs(id TEXT PRIMARY KEY,circle_id TEXT NOT NULL REFERENCES circles(id),owner_id TEXT NOT NULL REFERENCES actors(id),description TEXT NOT NULL,unit TEXT NOT NULL,requested INTEGER NOT NULL CHECK(requested>0),created_at TEXT NOT NULL)",
 "CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,need_id TEXT NOT NULL REFERENCES needs(id),helper_id TEXT NOT NULL REFERENCES actors(id),units INTEGER NOT NULL CHECK(units>0),request_id TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL)",
 "CREATE TABLE IF NOT EXISTS confirmations(id TEXT PRIMARY KEY,report_id TEXT NOT NULL REFERENCES reports(id),owner_id TEXT NOT NULL REFERENCES actors(id),units INTEGER NOT NULL CHECK(units>0),request_id TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL)",
 "CREATE TABLE IF NOT EXISTS watch_signals(id TEXT PRIMARY KEY,circle_id TEXT NOT NULL REFERENCES circles(id),reporter_id TEXT NOT NULL REFERENCES actors(id),category TEXT NOT NULL,subject_scope TEXT NOT NULL,request_id TEXT NOT NULL UNIQUE,receipt_hash TEXT NOT NULL,created_at TEXT NOT NULL)",
 "CREATE INDEX IF NOT EXISTS watch_by_reporter ON watch_signals(circle_id,reporter_id,created_at)",
 "CREATE TABLE IF NOT EXISTS watch_invites(token_hash TEXT PRIMARY KEY,signal_id TEXT NOT NULL REFERENCES watch_signals(id),expires_at INTEGER NOT NULL,used_at INTEGER)",
 "CREATE TABLE IF NOT EXISTS watch_attestations(id TEXT PRIMARY KEY,signal_id TEXT NOT NULL REFERENCES watch_signals(id),reviewer_id TEXT NOT NULL REFERENCES actors(id),stance TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(signal_id,reviewer_id))",
 "CREATE TABLE IF NOT EXISTS audit(seq INTEGER PRIMARY KEY AUTOINCREMENT,circle_id TEXT NOT NULL,kind TEXT NOT NULL,event_data TEXT NOT NULL,prev_hash TEXT NOT NULL,event_hash TEXT NOT NULL,created_at TEXT NOT NULL)"
].join(';\n')+';';
function send(res,status,payload){
 res.writeHead(status,{
  'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
  'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"
 });res.end(JSON.stringify(payload));
}
export function createCampfireBackend({dbPath,bootstrapKey,allowOrigin=null}={}){
 if(typeof bootstrapKey!=='string'||bootstrapKey.length<32)error('BOOTSTRAP_KEY_32_CHAR_REQUIRED');
 if(typeof dbPath!=='string'||!dbPath.trim())error('DURABLE_DB_PATH_REQUIRED');
 if(dbPath!==':memory:')mkdirSync(dirname(resolve(dbPath)),{recursive:true,mode:0o700});
 const launchAt=now();
 const db=new DatabaseSync(dbPath);
 db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
 db.exec(ddl);
 if(dbPath!==':memory:')try{chmodSync(dbPath,0o600);}catch{}
 function txn(f){
  db.exec('BEGIN IMMEDIATE');
  try{const result=f();db.exec('COMMIT');return result;}
  catch(e){db.exec('ROLLBACK');throw e;}
 }
 function audit(circleId,kind,event){
  const last=db.prepare('SELECT event_hash FROM audit ORDER BY seq DESC LIMIT 1').get();
  const prev=last?.event_hash||zero,payload=JSON.stringify(event);
  const head=sha(prev+'|'+circleId+'|'+kind+'|'+payload);
  db.prepare('INSERT INTO audit(circle_id,kind,event_data,prev_hash,event_hash,created_at) VALUES(?,?,?,?,?,?)')
   .run(circleId,kind,payload,prev,head,now());
 }
 function verifyAudit(){
  let head=zero,checked=0;
  for(const row of db.prepare('SELECT * FROM audit ORDER BY seq').all()){
   if(row.prev_hash!==head||row.event_hash!==sha(head+'|'+row.circle_id+'|'+row.kind+'|'+row.event_data))
    return {ok:false,checked,failedAt:row.seq};
   head=row.event_hash;checked++;
  }
  return {ok:true,checked,head,meaning:'LOCAL_HASH_CHAIN_NOT_EXTERNAL_WITNESS'};
 }
 function admin(req){if(!equal(bearer(req),bootstrapKey))error('ADMIN_DENIED',403);}
 function actor(req,circleId=null){
  const t=bearer(req);if(!t)error('CREDENTIAL_REQUIRED',401);
  const a=db.prepare('SELECT id,circle_id,role,revoked_at FROM actors WHERE token_hash=?').get(sha(t));
  if(!a||a.revoked_at||circleId&&a.circle_id!==circleId)error('MEMBERSHIP_DENIED',403);
  return a;
 }
 function circle(raw){
  const c=id(raw);if(!db.prepare('SELECT id FROM circles WHERE id=?').get(c))error('NOT_FOUND',404);
  return c;
 }
 function need(raw){
  const n=db.prepare('SELECT * FROM needs WHERE id=?').get(id(raw));
  if(!n)error('NOT_FOUND',404);return n;
 }
 const confirmed=nid=>db.prepare('SELECT COALESCE(SUM(c.units),0) AS total FROM confirmations c JOIN reports r ON c.report_id=r.id WHERE r.need_id=?').get(nid).total;
 const reportConfirmed=rid=>db.prepare('SELECT COALESCE(SUM(units),0) AS total FROM confirmations WHERE report_id=?').get(rid).total;
 const projectNeed=n=>({id:n.id,circleId:n.circle_id,ownerId:n.owner_id,
  description:n.description,unit:n.unit,requested:n.requested,confirmed:confirmed(n.id),
  residual:Math.max(0,n.requested-confirmed(n.id)),createdAt:n.created_at,
  evidence:'OWNER_CAPABILITY_ACCEPTANCE_NOT_PHYSICAL_PROVISION'});
 async function body(req){
  let size=0,buf=[];
  for await(const part of req){size+=part.length;if(size>8192)error('BODY_TOO_LARGE',413);buf.push(part);}
  try{const obj=JSON.parse(Buffer.concat(buf).toString('utf8'));if(!obj||typeof obj!=='object'||Array.isArray(obj))error('OBJECT_REQUIRED');return obj;}
  catch(e){if(e.status)throw e;error('INVALID_JSON');}
 }
 const hits=new Map();
 function rate(req){
  const ip=req.socket.remoteAddress||'unknown',stamp=Date.now(),entry=hits.get(ip);
  if(!entry||stamp-entry.start>60000){hits.set(ip,{start:stamp,count:1});return;}
  if(++entry.count>120)error('RATE_LIMITED',429);
  if(hits.size>1000)hits.clear();
 }
 const server=createServer(async(req,res)=>{
  try{
   rate(req);
   const origin=req.headers.origin;
   const sameOrigin=origin===('http://'+req.headers.host)||origin===('https://'+req.headers.host);
   if(origin&&!sameOrigin&&(!allowOrigin||origin!==allowOrigin))error('ORIGIN_NOT_ALLOWED',403);
   if(origin&&origin===allowOrigin){
    res.setHeader('Access-Control-Allow-Origin',allowOrigin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
   }
   if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
   const path=new URL(req.url,'http://localhost').pathname;
   if(path==='/health'&&req.method==='GET')
    return send(res,200,{ok:true,service:'first-party-campfire',persistence:'sqlite-wal',identity:'CAPABILITY_NOT_HUMAN_ID'});
   if(path==='/.well-known/campfire-waggle.json'&&req.method==='GET')
    return send(res,200,{
     schema:'campfire.waggle/v0',
     alive:true,software:'first-party-campfire',version:'001',
     capabilities:['invite-only-conversations','private-needs','helper-reports','owner-capability-acceptance'],
     joining:'ONE_TIME_INVITE_REQUIRED',
     privateRecords:'NOT_EXPORTED',
     trust:'NOT_IDENTITY_OR_PHYSICAL_DELIVERY_EVIDENCE',
     storage:'SINGLE_AUTHORITATIVE_HOST_SQLITE',
     replication:'NONE',
     automation:'NO_AUTO_INVITATIONS_OR_SHARED_RECORDS',
     nextHumanChoice:'An operator deliberately invites consenting members.'
    });
   if(path==='/how'&&req.method==='GET'){
    const html=readFileSync(new URL('./how.html',import.meta.url),'utf8');
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8',
     'Cache-Control':'no-store','Referrer-Policy':'no-referrer',
     'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
     'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});
    return res.end(html);
   }
   if(path==='/'&&req.method==='GET'){
    const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
     'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
     'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});
    return res.end(html);
   }
   if(path==='/v1/admin/circles'&&req.method==='GET'){
    admin(req);
    const rows=db.prepare(`SELECT c.id,c.label,c.created_at,
      (SELECT COUNT(*) FROM actors a WHERE a.circle_id=c.id
        AND a.role='owner' AND a.revoked_at IS NULL) AS owners,
      (SELECT COUNT(*) FROM actors a WHERE a.circle_id=c.id
        AND a.role='member' AND a.revoked_at IS NULL) AS members
      FROM circles c ORDER BY c.created_at,c.id LIMIT 100`).all();
    return send(res,200,{ok:true,rooms:rows,
      visibility:'ADMIN_ONLY',scope:'ONLY_ID_LABEL_ROLE_COUNTS',
      noMessageBodies:true,noMemberCredentials:true});
   }
   if(path==='/v1/admin/circles'&&req.method==='POST'){
    admin(req);const b=await body(req),label=val(b.label,90);
    const c=txn(()=>{const cid=randomUUID();db.prepare('INSERT INTO circles VALUES(?,?,?)').run(cid,label,now());audit(cid,'circle.created',{circleId:cid});return {id:cid,label};});
    return send(res,201,{ok:true,circle:c});
   }
   let match=path.match(/^\/v1\/admin\/circles\/([0-9a-f-]+)\/invites$/);
   if(match&&req.method==='POST'){
    admin(req);const c=circle(match[1]),b=await body(req);
    if(!['owner','member'].includes(b.role))error('INVALID_ROLE');
    const mins=b.ttlMinutes===undefined?1440:b.ttlMinutes;
    if(!Number.isInteger(mins)||mins<5||mins>1440)error('INVALID_TTL');
    const raw=token(),expiration=Date.now()+mins*60000;
    txn(()=>{db.prepare('INSERT INTO invites(token_hash,circle_id,role,expires_at) VALUES(?,?,?,?)').run(sha(raw),c,b.role,expiration);
      audit(c,'invite.issued',{role:b.role,expiresAt:expiration});});
    return send(res,201,{ok:true,inviteCode:raw,expiresAt:new Date(expiration).toISOString(),
     warning:'SHARE_ONCE_PRIVATELY_NEVER_IN_URL_OR_PUBLIC_LOG'});
   }
   if(path==='/v1/join'&&req.method==='POST'){
    const b=await body(req);
    if(typeof b.inviteCode!=='string'||!/^[-\w]{43,}$/.test(b.inviteCode))error('INVALID_INVITE');
    const result=txn(()=>{
     const i=db.prepare('SELECT * FROM invites WHERE token_hash=?').get(sha(b.inviteCode));
     if(!i||i.used_at||i.expires_at<Date.now())error('INVITE_INVALID_OR_USED',403);
     const aid=randomUUID(),accessToken=token();
     db.prepare('INSERT INTO actors(id,circle_id,role,token_hash,created_at) VALUES(?,?,?,?,?)')
      .run(aid,i.circle_id,i.role,sha(accessToken),now());
     db.prepare('UPDATE invites SET used_at=? WHERE token_hash=?').run(Date.now(),sha(b.inviteCode));
     audit(i.circle_id,'member.joined',{actorId:aid,role:i.role});
     return {actorId:aid,circleId:i.circle_id,role:i.role,accessToken};
    });
    return send(res,201,{ok:true,...result,warning:'SAVE_CAPABILITY_PRIVATELY_NOT_HUMAN_IDENTITY'});
   }
   if(path==='/v1/me'&&req.method==='GET'){
    const a=actor(req);return send(res,200,{ok:true,actorId:a.id,circleId:a.circle_id,role:a.role});
   }
   match=path.match(/^\/v1\/admin\/actors\/([0-9a-f-]+)\/revoke$/);
   if(match&&req.method==='POST'){
    admin(req);const aid=id(match[1]);
    const result=txn(()=>{
     const a=db.prepare('SELECT * FROM actors WHERE id=?').get(aid);
     if(!a)error('NOT_FOUND',404);
     if(!a.revoked_at){db.prepare('UPDATE actors SET revoked_at=? WHERE id=?').run(now(),aid);audit(a.circle_id,'member.revoked',{actorId:aid});}
     return {actorId:aid,revoked:true};
    });
    return send(res,200,{ok:true,...result});
   }
   if(path==='/v1/admin/status'&&req.method==='GET'){
    admin(req);
    const count=table=>db.prepare('SELECT COUNT(*) AS n FROM '+table).get().n;
    const expired=db.prepare('SELECT COUNT(*) AS n FROM invites WHERE used_at IS NULL AND expires_at<?').get(Date.now()).n;
    const last=db.prepare('SELECT kind,created_at FROM audit ORDER BY seq DESC LIMIT 1').get();
    return send(res,200,{
     ok:true,service:'CAMPFIRE_BACKEND_001',mode:'SINGLE_HOST',
     dataStore:'SQLITE_WAL_ON_THIS_HOST',started:launchAt,
     uptimeSeconds:Math.floor(process.uptime()),
     health:'RESPONDING',audit:verifyAudit(),
     counts:{
      circles:count('circles'),
      activeMembers:db.prepare('SELECT COUNT(*) AS n FROM actors WHERE revoked_at IS NULL').get().n,
      messages:count('messages'),needs:count('needs'),
      reports:count('reports'),ownerAcceptances:count('confirmations'),
      watchSignals:count('watch_signals'),
      unredeemedInvitations:db.prepare('SELECT COUNT(*) AS n FROM invites WHERE used_at IS NULL AND expires_at>=?').get(Date.now()).n,
      expiredInvitations:expired
     },
     lastActivity:last?.created_at||null,
     trust:{
      dataPersistsOnHostDisk:dbPath!==':memory:',
      isPubliclyReachable:'NOT_MEASURED',
      diskBackupVerified:false,externalWitnessVerified:false,
      humanIdentityVerified:false,physicalDeliveryVerified:false
     },
     operationalNote:'This is the one authoritative firebox; there is no automatic multi-host SQLite sync or roaming.'
    });
   }
   if(path==='/v1/admin/attention'&&req.method==='GET'){
    admin(req);
    // Aggregates only. This query NEVER selects message bodies, need descriptions,
    // recipient details, auth token hashes, or private Help Slip contents.
    const count=(name)=>db.prepare('SELECT COUNT(*) AS n FROM '+name).get().n;
    const groups=db.prepare(`SELECT
      c.id,
      (SELECT COUNT(*) FROM actors a WHERE a.circle_id=c.id AND a.revoked_at IS NULL AND a.role='owner') AS owners,
      (SELECT COUNT(*) FROM actors a WHERE a.circle_id=c.id AND a.revoked_at IS NULL AND a.role='member') AS members,
      (SELECT COUNT(*) FROM messages m WHERE m.circle_id=c.id) AS messages,
      (SELECT COUNT(*) FROM needs n WHERE n.circle_id=c.id) AS needs,
      (SELECT COUNT(*) FROM reports r JOIN needs n ON n.id=r.need_id
       WHERE n.circle_id=c.id AND r.units >
         (SELECT COALESCE(SUM(cf.units),0) FROM confirmations cf WHERE cf.report_id=r.id)) AS unreviewedReports
      FROM circles c ORDER BY c.created_at,c.id LIMIT 20`).all();
    const counts={
     circles:count('circles'),
     activeMembers:db.prepare('SELECT COUNT(*) AS n FROM actors WHERE revoked_at IS NULL').get().n,
     messages:count('messages'),needs:count('needs'),reports:count('reports'),
     ownerAcceptances:count('confirmations'),
     unredeemedInvitations:db.prepare('SELECT COUNT(*) AS n FROM invites WHERE used_at IS NULL AND expires_at>=?').get(Date.now()).n
    };
    return send(res,200,buildAttention({counts,circles:groups,audit:verifyAudit(),
      backupVerified:false}));
   }
   if(path==='/v1/admin/watch-posture'&&req.method==='GET'){
    admin(req);
    const signals=db.prepare('SELECT COUNT(*) AS n FROM watch_signals').get().n;
    const attestations=db.prepare('SELECT COUNT(*) AS n FROM watch_attestations').get().n;
    const twoKeySignals=db.prepare(`SELECT COUNT(*) AS n FROM (
      SELECT signal_id FROM watch_attestations GROUP BY signal_id HAVING COUNT(DISTINCT reviewer_id)>=2
    )`).get().n;
    return send(res,200,{ok:true,...watchPosture({
      auditOk:verifyAudit().ok,signals,attestations,twoKeySignals
    })});
   }
   if(path==='/v1/admin/audit'&&req.method==='GET'){
    admin(req);return send(res,200,{ok:true,audit:verifyAudit()});
   }
   // A member may raise a small categorical concern about the *process*.
   // No free text or case details are accepted, including names and child data.
   // Owner and admin may not erase or close these tickets through this API.
   match=path.match(/^\/v1\/circles\/([0-9a-f-]+)\/watch$/);
   if(match){
    const c=circle(match[1]),a=actor(req,c);
    if(req.method==='GET'){
      const rows=db.prepare(`SELECT s.id,s.category,s.subject_scope,s.receipt_hash,s.created_at,
        (SELECT COUNT(*) FROM watch_attestations w WHERE w.signal_id=s.id) AS review_count
        FROM watch_signals s WHERE s.circle_id=? AND s.reporter_id=?
        ORDER BY s.created_at DESC,s.id DESC LIMIT 30`).all(c,a.id);
      return send(res,200,{ok:true,signals:rows.map(row=>({
        id:row.id,category:row.category,subjectScope:row.subject_scope,
        receiptHash:row.receipt_hash,createdAt:row.created_at,reviewerCredentials:row.review_count,
        standing:'UNRESOLVED_NO_AUTO_SANCTION'
      })),visibility:'REPORTER_CREDENTIAL_ONLY',truth:'NOT_AN_ALLEGATION_FINDING'});
    }
    if(req.method==='POST'){
      let b;
      try { b=parseWatchSubmission(await body(req)); }
      catch(e){if(e.status)throw e;error('INVALID_WATCH_SIGNAL');}
      const requestId=id(b.requestId);
      const ticket=txn(()=>{
        const prior=db.prepare('SELECT * FROM watch_signals WHERE request_id=?').get(requestId);
        if(prior){
          if(prior.circle_id!==c||prior.reporter_id!==a.id||
             prior.category!==b.category||prior.subject_scope!==b.subjectScope)
            error('WATCH_IDEMPOTENCY_CONFLICT',409);
          return {id:prior.id,category:prior.category,subjectScope:prior.subject_scope,
            createdAt:prior.created_at,receiptHash:prior.receipt_hash,duplicate:true};
        }
        const since=new Date(Date.now()-86400000).toISOString();
        const count=db.prepare('SELECT COUNT(*) AS n FROM watch_signals WHERE reporter_id=? AND created_at>=?').get(a.id,since).n;
        if(count>=3)error('WATCH_RATE_LIMITED',429);
        const signalId=randomUUID(),createdAt=now();
        // A stable private receipt, not an external signature or independent timestamp.
        const receiptHash=sha('WATCH-SIGNAL-001|'+signalId+'|'+c+'|'+a.id+'|'+b.category+'|'+b.subjectScope+'|'+createdAt);
        db.prepare('INSERT INTO watch_signals VALUES(?,?,?,?,?,?,?,?)')
          .run(signalId,c,a.id,b.category,b.subjectScope,requestId,receiptHash,createdAt);
        audit(c,'watch.signal.opened',{signalId,receiptHash});
        return {id:signalId,category:b.category,subjectScope:b.subjectScope,createdAt,receiptHash,duplicate:false};
      });
      return send(res,201,{ok:true,signal:ticket,standing:'UNRESOLVED_NO_AUTO_SANCTION',
        safety:'REPORTER_PRIVATE_CATEGORY_ONLY',independentHumanReview:false,
        warning:'Keep this receipt privately. This is not a finding, external witness, or tamper-proof proof.'});
    }
   }
   match=path.match(/^\/v1\/watch\/([0-9a-f-]+)\/review-invites$/);
   if(match&&req.method==='POST'){
    const signalId=id(match[1]);
    const sig=db.prepare('SELECT * FROM watch_signals WHERE id=?').get(signalId);
    if(!sig)error('NOT_FOUND',404);
    const a=actor(req,sig.circle_id);
    if(a.id!==sig.reporter_id)error('REPORTER_ONLY',403);
    const b=await body(req);
    if(Object.keys(b).length!==0)error('EMPTY_BODY_ONLY');
    const invite=txn(()=>{
      const count=db.prepare('SELECT COUNT(*) AS n FROM watch_invites WHERE signal_id=?').get(signalId).n;
      if(count>=2)error('REVIEW_INVITE_LIMIT',409);
      const raw=token(),expiresAt=Date.now()+60*60000;
      db.prepare('INSERT INTO watch_invites VALUES(?,?,?,NULL)').run(sha(raw),signalId,expiresAt);
      audit(sig.circle_id,'watch.review.invite_issued',{signalId});
      return {inviteCode:raw,expiresAt:new Date(expiresAt).toISOString()};
    });
    return send(res,201,{ok:true,...invite,warning:'PRIVATE_ONE_USE_CODE. SHARE ONLY WITH AN INDEPENDENT WILLING ADULT MEMBER. NO HUMAN INDEPENDENCE VERIFIED.'});
   }
   if(path==='/v1/watch/review'&&req.method==='POST'){
    const a=actor(req);
    let b;
    try { b=parseReviewStance(await body(req)); }
    catch(e){if(e.status)throw e;error('INVALID_REVIEW_SUBMISSION');}
    if(!/^[-\\w]{43,}$/.test(b.inviteCode))error('INVALID_INVITE');
    const result=txn(()=>{
      const invite=db.prepare('SELECT * FROM watch_invites WHERE token_hash=?').get(sha(b.inviteCode));
      if(!invite||invite.used_at||invite.expires_at<Date.now())
        error('REVIEW_INVITE_INVALID_OR_USED',403);
      const sig=db.prepare('SELECT * FROM watch_signals WHERE id=?').get(invite.signal_id);
      if(!sig||sig.circle_id!==a.circle_id)error('REVIEW_SCOPE_DENIED',403);
      if(a.id===sig.reporter_id||a.role!=='member')
        error('REVIEW_CONFLICT_OR_ROLE',403);
      if(db.prepare('SELECT 1 AS n FROM watch_attestations WHERE signal_id=? AND reviewer_id=?').get(sig.id,a.id))
        error('REVIEWER_ALREADY_ATTESTED',409);
      const reviewId=randomUUID();
      db.prepare('INSERT INTO watch_attestations VALUES(?,?,?,?,?)')
        .run(reviewId,sig.id,a.id,b.stance,now());
      db.prepare('UPDATE watch_invites SET used_at=? WHERE token_hash=?').run(Date.now(),sha(b.inviteCode));
      audit(sig.circle_id,'watch.review.attested',{signalId:sig.id,reviewId,stance:b.stance});
      return {signalId:sig.id,reviewId,credentialAttestations:
        db.prepare('SELECT COUNT(*) AS n FROM watch_attestations WHERE signal_id=?').get(sig.id).n};
    });
    return send(res,201,{ok:true,...result,standing:'REVIEW_ATTENDANCE_NOT_FINDING',
      independentHumanVerified:false,complaintResolved:false,noAutomaticSanction:true});
   }
   match=path.match(/^\/v1\/circles\/([0-9a-f-]+)\/messages$/);
   if(match){
    const c=circle(match[1]),a=actor(req,c);
    if(req.method==='GET'){
     const rows=db.prepare('SELECT id,circle_id,actor_id AS sender_user_id,body,created_at FROM messages WHERE circle_id=? ORDER BY created_at,id LIMIT 200').all(c);
     return send(res,200,{ok:true,messages:rows});
    }
    if(req.method==='POST'){
     const b=await body(req),message=val(b.body,4000);
     const row=txn(()=>{
      const mid=randomUUID(),date=now();
      db.prepare('INSERT INTO messages VALUES(?,?,?,?,?)').run(mid,c,a.id,message,date);
      audit(c,'message.created',{messageId:mid,actorId:a.id});
      return {id:mid,circle_id:c,sender_user_id:a.id,body:message,created_at:date};
     });
     return send(res,201,{ok:true,message:row});
    }
   }
   match=path.match(/^\/v1\/circles\/([0-9a-f-]+)\/needs$/);
   if(match){
    const c=circle(match[1]),a=actor(req,c);
    if(req.method==='GET'){
     return send(res,200,{ok:true,needs:db.prepare('SELECT * FROM needs WHERE circle_id=? ORDER BY created_at,id').all(c).map(projectNeed)});
    }
    if(req.method==='POST'){
     if(a.role!=='owner')error('OWNER_REQUIRED',403);
     const b=await body(req),description=val(b.description,500),unit=val(b.unit,40),target=units(b.units);
     const result=txn(()=>{
      const nid=randomUUID(),date=now();
      db.prepare('INSERT INTO needs VALUES(?,?,?,?,?,?,?)').run(nid,c,a.id,description,unit,target,date);
      audit(c,'need.opened',{needId:nid,ownerId:a.id,requested:target,unit});
      return projectNeed({id:nid,circle_id:c,owner_id:a.id,description,unit,requested:target,created_at:date});
     });
     return send(res,201,{ok:true,need:result});
    }
   }
   match=path.match(/^\/v1\/needs\/([0-9a-f-]+)\/reports$/);
   if(match&&req.method==='GET'){
    const n=need(match[1]),a=actor(req,n.circle_id);
    if(a.id!==n.owner_id)error('NEED_OWNER_ONLY',403);
    const rows=db.prepare('SELECT id,helper_id,units,created_at FROM reports WHERE need_id=? ORDER BY created_at,id').all(n.id);
    return send(res,200,{ok:true,reports:rows.map(r=>({
     id:r.id,helperId:r.helper_id,reportedUnits:r.units,acceptedUnits:reportConfirmed(r.id),
     outstandingUnits:Math.max(0,r.units-reportConfirmed(r.id)),createdAt:r.created_at,
     evidence:'REPORT_NOT_PHYSICAL_DELIVERY_PROOF'
    }))});
   }
   match=path.match(/^\/v1\/needs\/([0-9a-f-]+)\/reports$/);
   if(match&&req.method==='POST'){
    const n=need(match[1]),a=actor(req,n.circle_id);
    if(a.id===n.owner_id)error('SELF_REPORT_NOT_ALLOWED',403);
    const b=await body(req),count=units(b.units),requestId=id(b.requestId);
    const result=txn(()=>{
     const prior=db.prepare('SELECT * FROM reports WHERE request_id=?').get(requestId);
     if(prior){
      if(prior.need_id!==n.id||prior.helper_id!==a.id||prior.units!==count)error('IDEMPOTENCY_CONFLICT',409);
      return {id:prior.id,units:count,duplicate:true};
     }
     if(confirmed(n.id)>=n.requested)error('NEED_ALREADY_CLOSED',409);
     const rid=randomUUID();
     db.prepare('INSERT INTO reports VALUES(?,?,?,?,?,?)').run(rid,n.id,a.id,count,requestId,now());
     audit(n.circle_id,'fulfillment.reported',{needId:n.id,reportId:rid,helperId:a.id,units:count});
     return {id:rid,units:count,duplicate:false};
    });
    return send(res,201,{ok:true,report:result,standing:'REPORTED_NOT_CONFIRMED'});
   }
   match=path.match(/^\/v1\/reports\/([0-9a-f-]+)\/confirm$/);
   if(match&&req.method==='POST'){
    const rid=id(match[1]),r=db.prepare('SELECT * FROM reports WHERE id=?').get(rid);
    if(!r)error('NOT_FOUND',404);
    const n=need(r.need_id),a=actor(req,n.circle_id);
    if(a.id!==n.owner_id)error('NEED_OWNER_ONLY',403);
    const b=await body(req),count=units(b.units),requestId=id(b.requestId);
    const result=txn(()=>{
     const prior=db.prepare('SELECT * FROM confirmations WHERE request_id=?').get(requestId);
     if(prior){
      if(prior.report_id!==rid||prior.owner_id!==a.id||prior.units!==count)error('IDEMPOTENCY_CONFLICT',409);
      return {id:prior.id,units:count,duplicate:true};
     }
     if(count>r.units-reportConfirmed(rid))error('EXCEEDS_REPORTED_UNITS',409);
     if(count>n.requested-confirmed(n.id))error('EXCEEDS_OPEN_NEED',409);
     const cid=randomUUID();
     db.prepare('INSERT INTO confirmations VALUES(?,?,?,?,?,?)').run(cid,rid,a.id,count,requestId,now());
     audit(n.circle_id,'fulfillment.owner_capability_confirmed',{confirmationId:cid,reportId:rid,ownerId:a.id,units:count});
     return {id:cid,units:count,duplicate:false};
    });
    return send(res,201,{ok:true,confirmation:result,need:projectNeed(n),
     evidence:'SEPARATE_OWNER_CAPABILITY_ACCEPTANCE_NOT_PHYSICAL_PROOF'});
   }
   return send(res,404,{ok:false,error:'NOT_FOUND'});
  }catch(e){return send(res,e.status||500,{ok:false,error:e.status?e.message:'INTERNAL_ERROR'});}
 });
 return {server,db,verifyAudit,close(){server.close();db.close();}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const host=process.env.CAMPFIRE_HOST||'127.0.0.1',port=Number(process.env.CAMPFIRE_PORT||3417);
 if(!['127.0.0.1','::1'].includes(host)&&process.env.CAMPFIRE_ALLOW_NETWORK!=='yes')throw Error('REFUSING_PUBLIC_BIND');
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('INVALID_PORT');
 const app=createCampfireBackend({dbPath:process.env.CAMPFIRE_DB_PATH,
  bootstrapKey:process.env.CAMPFIRE_BOOTSTRAP_KEY,allowOrigin:process.env.CAMPFIRE_WEB_ORIGIN||null});
 app.server.listen(port,host,()=>console.log('Campfire v1 listening on '+host+':'+port));
 for(const sig of ['SIGINT','SIGTERM'])process.once(sig,()=>{app.close();process.exit(0);});
}
