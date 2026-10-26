import assert from 'node:assert/strict';
import test from 'node:test';
import {createConversationGateway} from './conversationGateway';
import {createOwnedCampfireConversationTransport} from './CampfireOwnedTransport';

const circle='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const access='a'.repeat(43);
test('NanaSpork gateway delegates member-scoped messages to our first-party API',async()=>{
 const requests:Array<{url:string,init:RequestInit}> = [];
 const transport=createOwnedCampfireConversationTransport({
  baseUrl:'https://campfire.example.org/',
  accessToken:()=>access,
  fetcher:async (url,init)=>{
   requests.push({url:String(url),init:init??{}});
   const obj=init?.body?JSON.parse(String(init.body)):{};
   const row={id:'row-001',circle_id:circle,sender_user_id:'derived-by-backend',
    body:obj.body||'previously persisted',created_at:'2026-10-26T08:00:00Z'};
   return {
    ok:true,
    json:async()=>({ok:true,...(init?.method==='POST'?{message:row}:{messages:[row]})}),
   } as Response;
  }
 });
 const gateway=createConversationGateway(transport);
 const sent=await gateway.send(circle,'  Thank you for the offer  ');
 assert.equal(sent.body,'Thank you for the offer');
 assert.equal(sent.senderUserId,'derived-by-backend');
 const loaded=await gateway.list(circle);
 assert.equal(loaded[0].body,'previously persisted');
 assert.equal(requests[0].url,'https://campfire.example.org/v1/circles/'+circle+'/messages');
 assert.equal(requests[0].init.method,'POST');
 assert.equal((requests[0].init.headers as Record<string,string>).Authorization,'Bearer '+access);
 assert.deepEqual(JSON.parse(String(requests[0].init.body)),{body:'Thank you for the offer'});
 assert.equal(requests[1].init.method,'GET');
 assert.equal('sender_user_id' in JSON.parse(String(requests[0].init.body)),false);
});
test('remote HTTP and missing individual access credential fail closed',async()=>{
 assert.throws(()=>createOwnedCampfireConversationTransport({
  baseUrl:'http://remote.example',accessToken:()=>access
 }),/HTTPS_REQUIRED_FOR_REMOTE_CAMPFIRE/);
 const transport=createOwnedCampfireConversationTransport({
  baseUrl:'http://127.0.0.1:3417',accessToken:()=>null
 });
 await assert.rejects(()=>transport.list(circle),/CAMPFIRE_CAPABILITY_REQUIRED/);
});
test('a valid backend refusal is preserved as an error, never a phantom shared message',async()=>{
 const transport=createOwnedCampfireConversationTransport({
  baseUrl:'https://campfire.example.org',accessToken:()=>access,
  fetcher:async()=>({ok:false,json:async()=>({ok:false,error:'MEMBERSHIP_DENIED'})}) as Response
 });
 await assert.rejects(()=>transport.list(other),/MEMBERSHIP_DENIED/);
});
