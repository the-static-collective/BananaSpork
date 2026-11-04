import { supabase } from '../../integrations/supabase/client';
import { supabasePublicConfig } from '../../integrations/supabase/config';
import {
  areaCoordinates, classifyNowText, needsColdChain, publicDescription, suggestNowRoutes,
  type NowKind, type NowOffer, type NowNeed, type NowMatch,
} from './matching';

type Share = {
  circleId: string;
  description: string;
  areaCenter: { lat: number; lon: number };
  expiresMinutes: number;
  kind?: NowKind;
};
export type CreateNowOffer = Share & {
  coldChainAttested: boolean;
  radiusMiles?: number;
};
export type CreateNowNeed = Share & {
  allowMatching: boolean;
  canPickup: boolean;
  travelMinutes: number | null;
  maxMiles?: number;
};
export interface NowRouteTransport {
  list(circleId: string): Promise<{ offers: NowOffer[]; needs: NowNeed[] }>;
  offer(input: CreateNowOffer): Promise<NowOffer>;
  need(input: CreateNowNeed): Promise<NowNeed>;
  withdraw(which: 'offer'|'need', id: string): Promise<void>;
  watch(circleId: string, onChange: () => void): () => void;
}
const tables = { offer:'circle_now_offers', need:'circle_now_needs' } as const;
function validateScope(circleId: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(circleId)) throw Error('CAMPFIRE_NOT_SELECTED');
}
function validateAvailability(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes<5 || minutes>240) throw Error('INVALID_AVAILABILITY');
}
function validateMiles(value: number): void {
  if (!Number.isInteger(value) || value<1 || value>10) throw Error('INVALID_RADIUS');
}
function endTime(minutes: number): string {
  validateAvailability(minutes);
  return new Date(Date.now()+minutes*60_000).toISOString();
}
/** RLS is the authority. A local user ID is never sent as owner_user_id. */
export function createSupabaseNowRouteTransport(): NowRouteTransport {
  // The schema is a reviewed proposal, not an applied migration or regenerated Database type.
  // Confine untyped table access to this experimental transport only.
  const client = supabase as any;
  function ensureConfigured(): void {
    if (!supabasePublicConfig.configured) throw Error('HOLD_NO_AUTHENTICATED_CAMPFIRE');
  }
  async function ensureSignedIn(): Promise<void> {
    ensureConfigured();
    const {data,error} = await client.auth.getUser();
    if (error || !data?.user?.id) throw Error('HOLD_LOGIN_REQUIRED');
  }
  async function queryRows<T>(table:string,circleId:string):Promise<T[]> {
    const {data,error} = await client.from(table).select('*').eq('circle_id',circleId).gt('expires_at',new Date().toISOString()).order('expires_at',{ascending:true}).limit(100);
    if (error) throw Error('HOLD_NOW_ROUTE_SCHEMA_OR_MEMBERSHIP: '+error.message);
    return (data||[]) as T[];
  }
  return {
    async list(circleId) {
      validateScope(circleId); await ensureSignedIn();
      // Independent restricted queries: never fallback to a global feed.
      const [offers,needs]=await Promise.all([
        queryRows<NowOffer>(tables.offer,circleId),queryRows<NowNeed>(tables.need,circleId)
      ]);
      return {offers,needs};
    },
    async offer(input) {
      validateScope(input.circleId);await ensureSignedIn();
      const description=publicDescription(input.description);
      const kind=input.kind ?? classifyNowText(description);
      const cold_chain_required=kind==='food' && needsColdChain(description);
      if (cold_chain_required && input.coldChainAttested!==true) throw Error('HOLD_COLD_STORAGE_UNCONFIRMED');
      const radius_miles=input.radiusMiles ?? 5;
      validateMiles(radius_miles);
      const location=areaCoordinates(input.areaCenter.lat,input.areaCenter.lon);
      const {data,error}=await client.from(tables.offer).insert({
        circle_id:input.circleId,kind,description,...location,radius_miles,
        expires_at:endTime(input.expiresMinutes),
        cold_chain_required,cold_chain_attested:input.coldChainAttested===true,
        share_with_circle:true
      }).select('*').single();
      if (error) throw Error('HOLD_OFFER_NOT_SHARED: '+error.message);
      return data as NowOffer;
    },
    async need(input) {
      validateScope(input.circleId);await ensureSignedIn();
      if (input.allowMatching!==true) throw Error('HOLD_MATCHING_OPT_IN_REQUIRED');
      if (!input.canPickup || !Number.isInteger(input.travelMinutes) ||
        (input.travelMinutes ?? -1)<0 || (input.travelMinutes ?? 999)>180) throw Error('HOLD_PICKUP_FEASIBILITY_UNKNOWN');
      const description=publicDescription(input.description);
      const kind=input.kind ?? classifyNowText(description);
      const max_miles=input.maxMiles ?? 5;
      validateMiles(max_miles);
      const location=areaCoordinates(input.areaCenter.lat,input.areaCenter.lon);
      const {data,error}=await client.from(tables.need).insert({
        circle_id:input.circleId,kind,description,...location,max_miles,
        expires_at:endTime(input.expiresMinutes),
        allow_matching:true,can_pickup:true,travel_minutes:input.travelMinutes
      }).select('*').single();
      if (error) throw Error('HOLD_NEED_NOT_SHARED: '+error.message);
      return data as NowNeed;
    },
    async withdraw(which,id) {
      await ensureSignedIn();
      if (!/^[0-9a-f-]{36}$/i.test(id)) throw Error('INVALID_PARTICIPATION_ID');
      const table=tables[which];if (!table) throw Error('INVALID_PARTICIPATION_KIND');
      const {data,error}=await client.from(table).delete().eq('id',id).select('id');
      if (error || !Array.isArray(data) || data.length!==1) throw Error('WITHDRAWAL_NOT_AUTHORIZED_OR_NOT_FOUND');
    },
    watch(circleId,onChange) {
      validateScope(circleId);ensureConfigured();
      const channel=client.channel('now-route:'+circleId+':'+Math.random().toString(36).slice(2))
        .on('postgres_changes',{event:'*',schema:'public',table:tables.offer,filter:'circle_id=eq.'+circleId},onChange)
        .on('postgres_changes',{event:'*',schema:'public',table:tables.need,filter:'circle_id=eq.'+circleId},onChange)
        .subscribe();
      return ()=>{void client.removeChannel(channel);};
    }
  };
}
export function nowRouteSuggestions(
  shared:{offers:NowOffer[];needs:NowNeed[]},nowMs=Date.now()
):NowMatch[] {
  return suggestNowRoutes(shared.offers,shared.needs,nowMs);
}
