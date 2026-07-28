import { useState, useEffect, useMemo, useCallback } from 'react';
import { BasketOffer, ParticipationSeed, WitnessReceipt } from '../../types';
import { CommandResult, JubileeCurrentUser, JubileeState, RuntimeMode } from './contracts';
import { getJubileeGateway } from './JubileeGateway';

export function useJubilee(currentUser?: JubileeCurrentUser) {
  const gateway = useMemo(() => getJubileeGateway(currentUser), []);

  const [state, setState] = useState<JubileeState>(() => gateway.getState());

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

  const addOffer = useCallback(
    async (offer: Omit<BasketOffer, 'id' | 'timestamp'>): Promise<CommandResult<BasketOffer>> => {
      return await gateway.addOffer(offer);
    },
    [gateway]
  );

  const addSeed = useCallback(
    async (seed: Omit<ParticipationSeed, 'id' | 'timestamp'>): Promise<CommandResult<ParticipationSeed>> => {
      return await gateway.addSeed(seed);
    },
    [gateway]
  );

  const pledgeNeed = useCallback(
    async (seedId: string, needId: string, pledgedBy?: string): Promise<CommandResult<ParticipationSeed>> => {
      return await gateway.pledgeNeed(seedId, needId, pledgedBy);
    },
    [gateway]
  );

  const confirmFulfillment = useCallback(
    async (seedId: string, needId: string): Promise<CommandResult<ParticipationSeed>> => {
      return await gateway.confirmFulfillment(seedId, needId);
    },
    [gateway]
  );

  return {
    runtimeMode: state.runtimeMode,
    offers: state.offers,
    seeds: state.seeds,
    receipts: state.receipts,
    currentUser: state.currentUser,
    addOffer,
    addSeed,
    pledgeNeed,
    confirmFulfillment,
  };
}
