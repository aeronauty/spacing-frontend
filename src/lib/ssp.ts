/**
 * SSP: Position-Based Mesh Spacing Method
 * 
 * Mark Drela's algorithm for non-uniform 1D point distributions.
 * Instead of specifying spacing vs. index (the traditional approach),
 * you specify spacing vs. position — which is what you actually want
 * when clustering points at geometric features.
 * 
 * The math is straightforward: integrate 1/F(s) to get parametric
 * positions, then invert to get the final si values. The trick is
 * handling the Fj ≈ Fj+1 case (nearly constant spacing) where the
 * naive formula gives 0/0. There's an asymptotic expansion for that.
 * 
 * See Mark's document for the derivation. This implements Eq. 9-17.
 */

import type { Knot } from '../types';

// Define return type locally to avoid import issues
interface ComputedValues {
  T: number[];
  scaledKnots: Knot[];
  si: number[];
}

/**
 * Step 1: Compute parametric knot positions Tj
 * Uses equations (9), (10), (11) from the document
 * 
 * @param knots Array of {S, F} knot values
 * @returns Array of T values for each knot
 */
export function computeTj(knots: Knot[]): number[] {
  const T: number[] = [0]; // T1 = 0 (Eq. 10)
  
  for (let j = 0; j < knots.length - 1; j++) {
    const Fj = knots[j].F;
    const Fjp1 = knots[j + 1].F;
    const Sj = knots[j].S;
    const Sjp1 = knots[j + 1].S;
    
    const dS = Sjp1 - Sj;
    const dF = Fjp1 - Fj;
    const eps = dF / Fj; // Eq. 9
    
    let Tjp1: number;
    
    if (Math.abs(eps) >= 0.001) {
      // Eq. 11, first case: use logarithmic form
      Tjp1 = T[j] + (dS / dF) * Math.log(Fjp1 / Fj);
    } else {
      // Eq. 11, second case: asymptotic expansion for |ε| < 0.001
      // This avoids 0/0 when Fj ≈ Fj+1
      Tjp1 = T[j] + (dS / Fj) * (1 + eps / 6) / (1 + (2 * eps) / 3);
    }
    
    T.push(Tjp1);
  }
  
  return T;
}

/**
 * Step 2: Rescale to enforce TN = 1
 * Uses equations (12), (13) from the document
 * 
 * @param knots Original knot array
 * @param T Parametric positions from Step 1
 * @returns Rescaled knots and T values
 */
export function rescale(
  knots: Knot[],
  T: number[]
): { scaledKnots: Knot[]; scaledT: number[] } {
  const TN = T[T.length - 1];
  
  // Eq. 12: Fj ← Fj × TN
  const scaledKnots = knots.map(k => ({
    S: k.S,
    F: k.F * TN
  }));
  
  // Eq. 13: Tj ← Tj / TN
  const scaledT = T.map(t => t / TN);
  
  return { scaledKnots, scaledT };
}

/**
 * Find the interval index j such that T[j] < t <= T[j+1]
 * Special case: t = 0 returns 0
 */
function findInterval(T: number[], t: number): number {
  if (t <= 0) return 0;
  
  for (let j = 0; j < T.length - 1; j++) {
    if (T[j] < t && t <= T[j + 1]) {
      return j;
    }
  }
  
  // Fallback to last interval
  return T.length - 2;
}

/**
 * Step 3: Compute output points si for each ti
 * Uses equations (14), (15), (16), (17) from the document
 * 
 * @param knots Rescaled knot array (after Step 2)
 * @param T Rescaled parametric positions (after Step 2)
 * @param n Number of output points
 * @returns Array of si values
 */
export function computeSi(knots: Knot[], T: number[], n: number): number[] {
  const si: number[] = [0]; // s1 = S1 = 0 (Eq. 16)
  
  for (let i = 1; i < n; i++) {
    // Uniform ti distribution
    const ti = i / (n - 1);
    
    // Find interval j such that Tj < ti <= Tj+1
    const j = findInterval(T, ti);
    
    const Fj = knots[j].F;
    const Fjp1 = knots[j + 1].F;
    const Sj = knots[j].S;
    const Sjp1 = knots[j + 1].S;
    const Tj = T[j];
    
    // Eq. 14
    const Bj = (Fjp1 - Fj) / (Sjp1 - Sj);
    
    // Eq. 15
    const eps = Bj * (ti - Tj);
    
    let s: number;
    
    if (Math.abs(Bj) >= 0.001) {
      // Eq. 17, first case: exponential form
      s = Sj + Fj * (Math.exp(eps) - 1) / Bj;
    } else {
      // Eq. 17, second case: asymptotic expansion for |Bj| < 0.001
      // This handles Fj ≈ Fj+1 (nearly constant spacing)
      const dt = ti - Tj;
      s = Sj + Fj * (1 + eps / 2 + (eps ** 2) / 6 + (eps ** 3) / 24) * dt;
    }
    
    si.push(s);
  }
  
  // Explicitly set sn = 1 to eliminate roundoff (per document)
  si[n - 1] = 1;
  
  return si;
}

/**
 * Main SSP computation function
 * Runs all three steps and returns computed values
 * 
 * @param knots Array of {S, F} control knots
 * @param n Number of output points
 * @returns Computed T values, scaled knots, and si output points
 */
export function computeSSP(knots: Knot[], n: number): ComputedValues {
  // Validate inputs
  if (knots.length < 2) {
    throw new Error('SSP requires at least 2 knots');
  }
  if (n < 2) {
    throw new Error('SSP requires at least 2 output points');
  }
  if (knots.some(k => k.F <= 0)) {
    throw new Error('All F values must be positive');
  }
  
  // Step 1: Compute Tj
  const T = computeTj(knots);
  
  // Step 2: Rescale
  const { scaledKnots, scaledT } = rescale(knots, T);
  
  // Step 3: Compute si
  const si = computeSi(scaledKnots, scaledT, n);
  
  return {
    T: scaledT,
    scaledKnots,
    si
  };
}

/**
 * Create default initial knots
 * Simple two-knot configuration with uniform spacing
 */
export function createDefaultKnots(): Knot[] {
  return [
    { S: 0, F: 1 },
    { S: 1, F: 1 }
  ];
}

/**
 * Validate and sanitize knots
 * Ensures S1 = 0, SN = 1, monotonic S, and positive F
 */
export function sanitizeKnots(knots: Knot[]): Knot[] {
  if (knots.length < 2) {
    return createDefaultKnots();
  }
  
  // Sort by S value
  const sorted = [...knots].sort((a, b) => a.S - b.S);
  
  // Force endpoints
  sorted[0].S = 0;
  sorted[sorted.length - 1].S = 1;
  
  // Ensure positive F values
  return sorted.map(k => ({
    S: k.S,
    F: Math.max(0.01, k.F)
  }));
}
