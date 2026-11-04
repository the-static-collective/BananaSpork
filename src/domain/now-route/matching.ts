/** NOW-ROUTE 002: a deterministic, privacy-bounded discovery projection.
 * The actual authority is the authenticated Campfire database, not this function.
 * Matching is only a suggestion; no person has been contacted or consented to a handoff.
 */
export type NowKind = 'food' | 'transport' | 'tools' | 'other';
export type NowCard = {
  id: string;
  circle_id: string;
  owner_user_id: string;
  kind: NowKind;
  description: string;
  approx_lat: number;
  approx_lon: number;
  expires_at: string;
  created_at: string;
};
export type NowOffer = NowCard & {
  radius_miles: number;
  cold_chain_required: boolean;
  cold_chain_attested: boolean;
  share_with_circle: boolean;
};
export type NowNeed = NowCard & {
  max_miles: number;
  allow_matching: boolean;
  can_pickup: boolean;
  travel_minutes: number | null;
};
export type NowMatch = {
  offerId: string;
  needId: string;
  distanceMiles: number;
  travelMinutes: number;
  expiresInMinutes: number;
  status: 'SUGGESTED_ONLY';
};
const KINDS: ReadonlySet<string> = new Set(['food','transport','tools','other']);
export function classifyNowText(value: string): NowKind {
  if (/\b(fish|seafood|food|milk|eggs?|meat|produce|soup|groceries|vegetables?|bread|meal)\b/i.test(value)) return 'food';
  if (/\b(ride|driver|transport|carpool|drive|lift)\b/i.test(value)) return 'transport';
  if (/\b(tools?|repair|guitar|bicycle|bike|computer)\b/i.test(value)) return 'tools';
  return 'other';
}
export function needsColdChain(value: string): boolean {
  return /\b(fish|seafood|meat|poultry|chicken|milk|eggs?|frozen|thaw(?:ing|ed)?|refrigerat(?:ed|ion))\b/i.test(value);
}
export function publicDescription(value: string): string {
  const text = value.trim();
  if (text.length < 3 || text.length > 240) throw new Error('DESCRIPTION_LENGTH');
  if (/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(text) ||
    /\b\d{3}[-.)\s]*\d{3}[-.\s]*\d{4}\b/.test(text) ||
    /\b\d{1,5}\s+(?:\w+\s+){0,3}(?:st|street|ave|avenue|road|rd|blvd|lane|ln|drive|dr)\b/i.test(text)) {
    throw new Error('CONTACT_DETAILS_NOT_ALLOWED');
  }
  return text;
}
export function areaCoordinates(lat: number, lon: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) throw new Error('INVALID_AREA');
  // Coarse area center; never accept precise GPS or pickup addresses.
  return {approx_lat: Math.round(lat*100)/100, approx_lon: Math.round(lon*100)/100};
}
export function nowDistanceMiles(a: NowCard, b: NowCard): number {
  const r=Math.PI/180, dlat=(b.approx_lat-a.approx_lat)*r, dlon=(b.approx_lon-a.approx_lon)*r;
  const q=Math.sin(dlat/2)**2+Math.cos(a.approx_lat*r)*Math.cos(b.approx_lat*r)*Math.sin(dlon/2)**2;
  return 3958.76*2*Math.asin(Math.min(1,Math.sqrt(q)));
}
export function suggestNowRoutes(offers: readonly NowOffer[], needs: readonly NowNeed[], nowMs: number): NowMatch[] {
  if (!Number.isFinite(nowMs)) throw new Error('INVALID_CLOCK');
  const results: NowMatch[]=[];
  for (const offer of offers) {
    if (!KINDS.has(offer.kind) || !offer.share_with_circle || Date.parse(offer.expires_at)<=nowMs) continue;
    if (offer.cold_chain_required && !offer.cold_chain_attested) continue;
    for (const need of needs) {
      if (offer.circle_id!==need.circle_id || offer.owner_user_id===need.owner_user_id ||
        offer.kind!==need.kind || !need.allow_matching || !need.can_pickup ||
        !Number.isInteger(need.travel_minutes) || (need.travel_minutes ?? -1)<0 ||
        Date.parse(need.expires_at)<=nowMs) continue;
      const dist=nowDistanceMiles(offer,need);
      if (dist>Math.min(offer.radius_miles,need.max_miles,5)) continue;
      const expires=Math.min(Date.parse(offer.expires_at),Date.parse(need.expires_at));
      if (nowMs+(need.travel_minutes as number)*60000 >= expires) continue;
      results.push({
        offerId:offer.id,needId:need.id,distanceMiles:Math.round(dist*10)/10,
        travelMinutes:need.travel_minutes as number,
        expiresInMinutes:Math.max(0,Math.floor((expires-nowMs)/60000)),
        status:'SUGGESTED_ONLY'
      });
    }
  }
  return results.sort((a,b)=>a.travelMinutes-b.travelMinutes ||
    a.distanceMiles-b.distanceMiles || a.offerId.localeCompare(b.offerId) ||
    a.needId.localeCompare(b.needId));
}
