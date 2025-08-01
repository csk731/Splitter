import {
  BillState,
  Item,
  Person,
  PersonTotal,
  SplitwiseOutput,
  UUID,
} from "./types";

/**
 * Round to 2 decimal places
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Round to 4 decimal places (for intermediate calculations)
 */
export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Generate a simple UUID
 */
export function generateId(): UUID {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Allocate overall tax proportionally to each item based on pre-tax price
 * Returns array of tax amounts aligned by index with items array
 */
export function allocateItemTaxes(items: Item[], overallTax: number): number[] {
  if (items.length === 0) return [];

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);

  // If subtotal is 0, all item taxes are 0
  if (subtotal === 0) {
    return items.map(() => 0);
  }

  // Allocate tax proportionally
  return items.map((item) => round4(overallTax * (item.price / subtotal)));
}

/**
 * Calculate per-person totals before and after rounding
 */
export function computeTotals(state: BillState): {
  perPersonUnrounded: Record<UUID, number>;
  perPersonRounded: Record<UUID, number>;
  subtotal: number;
  grandTotal: number;
  personTotals: PersonTotal[];
} {
  const subtotal = state.items.reduce((sum, item) => sum + item.price, 0);
  const grandTotal = round2(subtotal + state.overallTax);

  // Allocate taxes to items
  const itemTaxes = allocateItemTaxes(state.items, state.overallTax);

  // Initialize person totals
  const perPersonUnrounded: Record<UUID, number> = {};
  const personTotals: PersonTotal[] = [];

  // Initialize all people with 0 totals
  state.people.forEach((person) => {
    perPersonUnrounded[person.id] = 0;
    personTotals.push({
      id: person.id,
      name: person.name,
      total: 0,
      items: [],
    });
  });

  // Calculate per-person shares
  state.items.forEach((item, itemIndex) => {
    const itemTax = itemTaxes[itemIndex];
    const itemTotal = item.price + itemTax;
    const sharePerConsumer = itemTotal / item.consumerIds.length;

    item.consumerIds.forEach((consumerId) => {
      // Add to unrounded total (keep precision)
      perPersonUnrounded[consumerId] = round4(
        (perPersonUnrounded[consumerId] || 0) + sharePerConsumer
      );

      // Add to detailed breakdown
      const personTotal = personTotals.find((p) => p.id === consumerId);
      if (personTotal) {
        personTotal.items.push({
          id: item.id,
          name: item.name,
          share: round2(sharePerConsumer),
        });
      }
    });
  });

  // Round person totals
  const perPersonRounded: Record<UUID, number> = {};
  Object.entries(perPersonUnrounded).forEach(([personId, total]) => {
    perPersonRounded[personId] = round2(total);
  });

  // Update person totals with rounded amounts
  personTotals.forEach((person) => {
    person.total = perPersonRounded[person.id] || 0;
  });

  return {
    perPersonUnrounded,
    perPersonRounded,
    subtotal: round2(subtotal),
    grandTotal,
    personTotals,
  };
}

/**
 * Fix penny discrepancies by distributing/removing pennies based on fractional remainders
 */
export function pennyFix(
  perPersonUnrounded: Record<UUID, number>,
  grandTotal: number
): Record<UUID, number> {
  const result = { ...perPersonUnrounded };

  // Calculate current rounded total
  const currentRoundedTotal = Object.values(result).reduce(
    (sum, amount) => sum + round2(amount),
    0
  );

  const discrepancy = round2(grandTotal - currentRoundedTotal);

  if (Math.abs(discrepancy) < 0.01) {
    // No significant discrepancy, just return rounded values
    Object.keys(result).forEach((personId) => {
      result[personId] = round2(result[personId]);
    });
    return result;
  }

  // Calculate fractional remainders
  const fractionalData = Object.entries(result).map(([personId, amount]) => ({
    personId,
    amount,
    rounded: round2(amount),
    fractional: Math.abs(amount - Math.floor(amount * 100) / 100),
  }));

  // Sort by fractional remainder (descending)
  fractionalData.sort((a, b) => b.fractional - a.fractional);

  const penniesNeeded = Math.round(discrepancy * 100);
  const pennyAdjustment = penniesNeeded > 0 ? 0.01 : -0.01;
  const adjustmentCount = Math.abs(penniesNeeded);

  // Apply penny adjustments to highest fractional remainders
  for (let i = 0; i < Math.min(adjustmentCount, fractionalData.length); i++) {
    const person = fractionalData[i];
    result[person.personId] = round2(person.rounded + pennyAdjustment);
  }

  // Round remaining values
  fractionalData.slice(adjustmentCount).forEach((person) => {
    result[person.personId] = person.rounded;
  });

  return result;
}

/**
 * Build Splitwise shares from final bill state
 */
export function buildSplitwiseShares(state: BillState): SplitwiseOutput {
  const totals = computeTotals(state);
  const fixedTotals = pennyFix(totals.perPersonUnrounded, totals.grandTotal);

  const payer = state.people.find((p) => p.id === state.payerId);
  const payerName = payer?.name || "Unknown";

  const shares = state.people
    .filter((person) => fixedTotals[person.id] > 0)
    .map((person) => ({
      name: person.name,
      amount: round2(fixedTotals[person.id]),
    }))
    .sort((a, b) => b.amount - a.amount); // Sort by amount descending

  return {
    shares,
    grandTotal: totals.grandTotal,
    payerName,
  };
}

/**
 * Generate Splitwise instruction text
 */
export function generateSplitwiseText(output: SplitwiseOutput): string {
  const lines = [
    "How to enter in Splitwise (Splitter)",
    "-----------------------------------",
    `Total: $${output.grandTotal.toFixed(2)}`,
    `Paid by: ${output.payerName}`,
    "Split: Unequal shares (by amount)",
    "",
    "Shares:",
  ];

  output.shares.forEach((share) => {
    lines.push(`${share.name}: $${share.amount.toFixed(2)}`);
  });

  return lines.join("\n");
}

/**
 * Create default/sample state
 */
export function createSampleState(): BillState {
  const people = [
    { id: generateId(), name: "Alice" },
    { id: generateId(), name: "Bob" },
    { id: generateId(), name: "Cara" },
    { id: generateId(), name: "Dan (payer)" },
  ];

  return {
    people,
    payerId: people[3].id, // Dan is payer
    overallTax: 3.72,
    items: [
      {
        id: generateId(),
        name: "Rice",
        price: 10.0,
        consumerIds: people.map((p) => p.id), // Everyone
      },
      {
        id: generateId(),
        name: "Milk",
        price: 4.5,
        consumerIds: [people[1].id, people[3].id], // Bob and Dan
      },
      {
        id: generateId(),
        name: "Eggs",
        price: 6.0,
        consumerIds: [people[0].id], // Alice only
      },
    ],
  };
}

/**
 * Create empty state
 */
export function createEmptyState(): BillState {
  const externalPayer = {
    id: generateId(),
    name: "External Payer",
    isExternal: true,
  };

  return {
    people: [externalPayer],
    payerId: externalPayer.id,
    items: [],
    overallTax: 0,
  };
}
