import type {
  CircleMessageRow,
  ConversationTransport,
  CircleMessageInsert,
} from './conversationGateway';

export interface OwnedCampfireOptions {
  baseUrl: string;
  // Caller supplies its OWN previously redeemed 256-bit capability.
  // Tokens are never placed in URLs or added to source maps.
  accessToken: () => string | null;
  fetcher?: typeof fetch;
  pollIntervalMs?: number;
}

const CIRCLE=/^[a-f0-9]{8}-[a-f0-9-]{27,36}$/i;
function requireCircle(id: string) {
  if (!CIRCLE.test(id)) throw new Error('CAMPFIRE_CIRCLE_ID_REQUIRED');
  return id;
}
export function createOwnedCampfireConversationTransport({
  baseUrl,accessToken,fetcher=fetch,pollIntervalMs=4500,
}:OwnedCampfireOptions):ConversationTransport {
  const root=baseUrl.replace(/\/+$/,'');
  const parsed=new URL(root);
  if(!['https:','http:'].includes(parsed.protocol)) throw new Error('INVALID_BACKEND_URL');
  if(parsed.protocol==='http:' && !['localhost','127.0.0.1','[::1]'].includes(parsed.hostname))
    throw new Error('HTTPS_REQUIRED_FOR_REMOTE_CAMPFIRE');
  if(!Number.isInteger(pollIntervalMs)||pollIntervalMs<1500||pollIntervalMs>60000)
    throw new Error('INVALID_POLL_INTERVAL');

  async function request<T>(path:string,method:'GET'|'POST',body?:unknown):Promise<T> {
    const key=accessToken();
    if(!key || !/^[-\w]{32,128}$/.test(key))throw new Error('CAMPFIRE_CAPABILITY_REQUIRED');
    const result=await fetcher(root+path,{
      method,
      headers:{
        'Authorization':'Bearer '+key,
        ...(body===undefined?{}:{'Content-Type':'application/json'}),
      },
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
      cache:'no-store'
    });
    const data=await result.json() as {ok?:boolean;error?:string}&T;
    if(!result.ok||data.ok!==true)throw new Error(data.error||'CAMPFIRE_REQUEST_FAILED');
    return data;
  }
  const pathname=(circle:string)=>'/v1/circles/'+requireCircle(circle)+'/messages';
  const list=(circleId:string)=>request<{messages:CircleMessageRow[]}>(pathname(circleId),'GET')
    .then(r=>r.messages);
  return {
    list,
    async insert(payload:CircleMessageInsert) {
      const data=await request<{message:CircleMessageRow}>(
        pathname(payload.circle_id),'POST',{body:payload.body}
      );
      return data.message;
    },
    subscribe(circleId,handler) {
      const circle=requireCircle(circleId);
      let running=true;
      const seen=new Set<string>();
      // Current backend deliberately uses polling rather than websocket infrastructure.
      // Existing messages are replayed once; the NanaSpork Gateway deduplicates IDs.
      const poll=async()=>{
        try{
          const rows=await list(circle);
          if(!running)return;
          for(const row of rows)if(!seen.has(row.id)){seen.add(row.id);handler(row);}
        }catch{
          // Initial useSharedConversation.list() surfaces load errors;
          // polling never publishes or fabricates receipts.
        }
      };
      void poll();
      const timer=setInterval(()=>void poll(),pollIntervalMs);
      return ()=>{running=false;clearInterval(timer);};
    }
  };
}
