import { useState, useMemo, useCallback } from 'react';
import type { Knot, SSPState } from '../types';
import { computeSSP, createDefaultKnots, sanitizeKnots } from '../lib/ssp';

const DEFAULT_N = 25;

export interface UseSSPReturn {
  // State
  knots: Knot[];
  n: number;
  si: number[];
  
  // Actions
  updateKnot: (index: number, knot: Knot) => void;
  addKnot: (S: number, F: number) => void;
  removeKnot: (index: number) => void;
  setN: (n: number) => void;
  
  // Import/Export
  importState: (state: SSPState) => void;
  exportState: () => SSPState;
  reset: () => void;
}

export function useSSP(initialKnots?: Knot[], initialN?: number): UseSSPReturn {
  const [knots, setKnots] = useState<Knot[]>(
    initialKnots ? sanitizeKnots(initialKnots) : createDefaultKnots()
  );
  const [n, setNState] = useState<number>(initialN ?? DEFAULT_N);

  // Compute si values whenever knots or n change
  const si = useMemo(() => {
    try {
      const result = computeSSP(knots, n);
      return result.si;
    } catch (error) {
      console.error('SSP computation error:', error);
      // Return uniform distribution as fallback
      return Array.from({ length: n }, (_, i) => i / (n - 1));
    }
  }, [knots, n]);

  // Update a single knot
  const updateKnot = useCallback((index: number, knot: Knot) => {
    setKnots(prev => {
      const newKnots = [...prev];
      newKnots[index] = knot;
      return newKnots;
    });
  }, []);

  // Add a new knot at the specified position
  const addKnot = useCallback((S: number, F: number) => {
    setKnots(prev => {
      // Don't add if too close to existing knots
      const MIN_GAP = 0.02;
      const tooClose = prev.some(k => Math.abs(k.S - S) < MIN_GAP);
      if (tooClose) return prev;
      
      const newKnots = [...prev, { S, F }];
      // Sort by S value
      newKnots.sort((a, b) => a.S - b.S);
      return newKnots;
    });
  }, []);

  // Remove a knot by index
  const removeKnot = useCallback((index: number) => {
    setKnots(prev => {
      // Must keep at least 2 knots
      if (prev.length <= 2) return prev;
      // Cannot remove first or last knot
      if (index === 0 || index === prev.length - 1) return prev;
      
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Set number of output points
  const setN = useCallback((newN: number) => {
    setNState(Math.max(2, Math.min(200, newN)));
  }, []);

  // Import state from JSON
  const importState = useCallback((state: SSPState) => {
    if (state.knots && Array.isArray(state.knots) && state.knots.length >= 2) {
      setKnots(sanitizeKnots(state.knots));
    }
    if (state.n && typeof state.n === 'number') {
      setNState(Math.max(2, Math.min(200, state.n)));
    }
  }, []);

  // Export current state
  const exportState = useCallback((): SSPState => {
    return { knots, n };
  }, [knots, n]);

  // Reset to default
  const reset = useCallback(() => {
    setKnots(createDefaultKnots());
    setNState(DEFAULT_N);
  }, []);

  return {
    knots,
    n,
    si,
    updateKnot,
    addKnot,
    removeKnot,
    setN,
    importState,
    exportState,
    reset
  };
}
