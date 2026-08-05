import { JubileeCurrentUser, JubileeGateway } from './contracts';
import { DemoJubileeGateway } from './DemoJubileeGateway';
import { SupabaseJubileeGateway } from './SupabaseJubileeGateway';
import { supabasePublicConfig } from '../../integrations/supabase/config';

export function getJubileeGateway(
  currentUser?: JubileeCurrentUser,
  sharedCampfireReady = false
): JubileeGateway {
  if (sharedCampfireReady && supabasePublicConfig.configured) {
    return new SupabaseJubileeGateway(currentUser);
  }
  return new DemoJubileeGateway(currentUser);
}

export function resetJubileeGatewayForTesting(): void {
  // Gateways are instance-scoped so signing out or switching users cannot leak
  // cached circle state into another session.
}
