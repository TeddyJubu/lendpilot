/**
 * @organ rates
 * @tissue helpers
 * @description Pure rate math — filtering a snapshot list against a
 *   borrower profile, ordering by rate, expiry checks, spread calc.
 * @depends-on nothing (pure)
 * @depended-by rates/queries.ts, frontend copilot rate comparisons
 */

export type RateSource = "wholesale" | "retail";

export interface RateLike {
  lenderId: string;
  rate: number;
  apr: number;
  points: number;
  lockPeriodDays: number;
  ltvMin: number;
  ltvMax: number;
  ficoMin: number;
  ficoMax: number;
  loanAmountMin: number;
  loanAmountMax: number;
  productType: string;
  occupancy: string;
  propertyType: string;
  expirationDate: number;
  crawledAt: number;
  source: RateSource;
}

export interface BorrowerProfile {
  fico?: number;
  ltv?: number;
  loanAmount?: number;
  productType?: string;
  occupancy?: string;
  propertyType?: string;
}

/** A rate matches a borrower if every supplied filter falls inside its range. */
export function rateMatchesProfile(
  rate: RateLike,
  profile: BorrowerProfile
): boolean {
  if (profile.productType && rate.productType !== profile.productType) return false;
  if (profile.occupancy && rate.occupancy !== profile.occupancy) return false;
  if (profile.propertyType && rate.propertyType !== profile.propertyType) return false;
  if (profile.fico !== undefined) {
    if (rate.ficoMin > profile.fico || rate.ficoMax < profile.fico) return false;
  }
  if (profile.ltv !== undefined) {
    if (rate.ltvMin > profile.ltv || rate.ltvMax < profile.ltv) return false;
  }
  if (profile.loanAmount !== undefined) {
    if (
      rate.loanAmountMin > profile.loanAmount ||
      rate.loanAmountMax < profile.loanAmount
    )
      return false;
  }
  return true;
}

/** Exclude snapshots past their expiration. */
export function isActiveRate(rate: RateLike, at: number = Date.now()): boolean {
  return rate.expirationDate > at;
}

/** Rank by rate ascending (cheapest first), with APR as tiebreaker. */
export function sortByBestRate<T extends { rate: number; apr: number }>(
  rates: T[]
): T[] {
  return [...rates].sort((a, b) => {
    if (a.rate !== b.rate) return a.rate - b.rate;
    return a.apr - b.apr;
  });
}

/**
 * Compute the spread between the cheapest wholesale and cheapest retail
 * rate from a pool — the broker's selling point.
 * Returns null when either side has no rates.
 */
export function wholesaleVsRetailSpread(
  rates: RateLike[]
): { wholesale: number; retail: number; spreadBps: number } | null {
  const sortedWholesale = sortByBestRate(rates.filter((r) => r.source === "wholesale"));
  const sortedRetail = sortByBestRate(rates.filter((r) => r.source === "retail"));
  if (!sortedWholesale.length || !sortedRetail.length) return null;

  const wholesale = sortedWholesale[0].rate;
  const retail = sortedRetail[0].rate;
  return {
    wholesale,
    retail,
    spreadBps: Math.round((retail - wholesale) * 100),
  };
}

/** Keep only the most recent snapshot per lender+product combo. */
export function dedupeByLatestSnapshot<
  T extends { lenderId: string; productType: string; crawledAt: number },
>(rates: T[]): T[] {
  const latest = new Map<string, T>();
  for (const rate of rates) {
    const key = `${rate.lenderId}|${rate.productType}`;
    const existing = latest.get(key);
    if (!existing || rate.crawledAt > existing.crawledAt) {
      latest.set(key, rate);
    }
  }
  return Array.from(latest.values());
}
