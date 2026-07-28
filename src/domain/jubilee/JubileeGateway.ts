import { JubileeCurrentUser, JubileeGateway } from './contracts';
import { DemoJubileeGateway } from './DemoJubileeGateway';
import { SupabaseJubileeGateway } from './SupabaseJubileeGateway';

let activeGatewayInstance: JubileeGateway | null = null;

export function getJubileeGateway(currentUser?: JubileeCurrentUser): JubileeGateway {
  if (activeGatewayInstance) {
    if (currentUser) {
      activeGatewayInstance.setCurrentUser(currentUser);
    }
    return activeGatewayInstance;
  }

  const meta = import.meta as Record<string, any>;
  const hasSupabaseEnv =
    typeof meta !== 'undefined' &&
    meta.env &&
    meta.env.VITE_SUPABASE_URL &&
    meta.env.VITE_SUPABASE_ANON_KEY;

  if (hasSupabaseEnv) {
    activeGatewayInstance = new SupabaseJubileeGateway(currentUser);
  } else {
    activeGatewayInstance = new DemoJubileeGateway(currentUser);
  }

  return activeGatewayInstance;
}

export function resetJubileeGatewayForTesting(): void {
  activeGatewayInstance = null;
}
