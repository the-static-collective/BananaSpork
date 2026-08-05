import { useState, useEffect, useMemo, useCallback } from 'react';
import { BasketOffer, ParticipationSeed, WitnessReceipt } from '../../types';
import { CommandResult, JubileeCurrentUser, JubileeState } from './contracts';
import { getJubileeGateway } from './JubileeGateway';

export function useJubilee(currentUser?: JubileeCurrentUser, activeCircleId?: string) {
  const sharedCampfireReady = Boolean(currentUser && activeCircleId);
  const gateway = useMemo(
    () => getJubileeGateway(currentUser, sharedCampfireReady),
    [currentUser?.id, sharedCampfireReady]
  );

  const [state, setState] = useState<JubileeState>(() => gateway.getState());
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string>();

  useEffect(() => {
    const unsubscribe = gateway.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, [gateway]);

  useEffect(() => {
    if (currentUser) {
      gateway.setCurrentUser(currentUser);
    }
  }, [currentUser?.id, currentUser?.name, currentUser?.role, gateway]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(undefined);
    try {
      await gateway.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not refresh the active Campfire.';
      setRefreshError(message);
    } finally {
      setRefreshing(false);
    }
  }, [gateway]);

  useEffect(() => {
    gateway.setActiveCircleId(activeCircleId);
    void refresh();
  }, [activeCircleId, gateway, refresh]);

  const runAndRefresh = useCallback(
    async <T,>(operation: () => Promise<CommandResult<T>>): Promise<CommandResult<T>> => {
      const result = await operation();
      if (result.success) await refresh();
      return result;
    },
    [refresh]
  );

  const addOffer = useCallback(
    async (offer: Omit<BasketOffer, 'id' | 'timestamp'>): Promise<CommandResult<BasketOffer>> => {
      return runAndRefresh(() => gateway.addOffer(offer));
    },
    [gateway, runAndRefresh]
  );

  const addSeed = useCallback(
    async (seed: Omit<ParticipationSeed, 'id' | 'timestamp'>): Promise<CommandResult<ParticipationSeed>> => {
      return runAndRefresh(() => gateway.addSeed(seed));
    },
    [gateway, runAndRefresh]
  );

  const pledgeNeed = useCallback(
    async (seedId: string, needId: string, pledgedBy?: string): Promise<CommandResult<ParticipationSeed>> => {
      return runAndRefresh(() => gateway.pledgeNeed(seedId, needId, pledgedBy));
    },
    [gateway, runAndRefresh]
  );

  const acceptPledgedOffer = useCallback(
    async (offerId: string): Promise<CommandResult> => {
      return runAndRefresh(() => gateway.acceptPledgedOffer(offerId));
    },
    [gateway, runAndRefresh]
  );

  const declinePledgedOffer = useCallback(
    async (offerId: string, reason?: string): Promise<CommandResult> => {
      return runAndRefresh(() => gateway.declinePledgedOffer(offerId, reason));
    },
    [gateway, runAndRefresh]
  );

  const reportFulfillment = useCallback(
    async (offerId: string, note?: string): Promise<CommandResult> => {
      return runAndRefresh(() => gateway.reportFulfillmentAction(offerId, note));
    },
    [gateway, runAndRefresh]
  );

  const confirmFulfillment = useCallback(
    async (seedId: string, offerId: string): Promise<CommandResult<ParticipationSeed>> => {
      return runAndRefresh(() => gateway.confirmFulfillment(seedId, offerId));
    },
    [gateway, runAndRefresh]
  );

  return {
    runtimeMode: state.runtimeMode,
    offers: state.offers,
    seeds: state.seeds,
    receipts: state.receipts,
    currentUser: state.currentUser,
    refreshing,
    refreshError,
    refresh,
    addOffer,
    addSeed,
    pledgeNeed,
    acceptPledgedOffer,
    declinePledgedOffer,
    reportFulfillment,
    confirmFulfillment,
  };
}
