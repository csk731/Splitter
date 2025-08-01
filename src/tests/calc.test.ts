import { test, expect, describe } from "vitest";
import {
  round2,
  round4,
  allocateItemTaxes,
  computeTotals,
  pennyFix,
  buildSplitwiseShares,
  createSampleState,
  generateId,
  generateSplitwiseText,
} from "../lib/calc";
import { validateBillState } from "../lib/storage";
import { BillState, Item } from "../lib/types";

describe("Utility Functions", () => {
  test("generateId should create unique IDs", () => {
    const id1 = generateId();
    const id2 = generateId();

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe("string");
    expect(typeof id2).toBe("string");
  });

  test("round2 should handle all edge cases", () => {
    expect(round2(1.234)).toBe(1.23);
    expect(round2(1.235)).toBe(1.24);
    expect(round2(1.999)).toBe(2.0);
    expect(round2(0)).toBe(0);
    expect(round2(-1.234)).toBe(-1.23);
    expect(round2(-1.235)).toBe(-1.24);
    expect(round2(0.005)).toBe(0.01);
    expect(round2(0.004)).toBe(0.0);
  });

  test("round4 should handle all edge cases", () => {
    expect(round4(1.23456)).toBe(1.2346);
    expect(round4(1.23454)).toBe(1.2345);
    expect(round4(0)).toBe(0);
    expect(round4(-1.23456)).toBe(-1.2346);
    expect(round4(0.00005)).toBe(0.0001);
    expect(round4(0.00004)).toBe(0.0);
  });
});

describe("Tax Allocation - Comprehensive Tests", () => {
  test("should allocate tax proportionally to item prices", () => {
    const items: Item[] = [
      { id: "1", name: "Item 1", price: 10, consumerIds: ["p1"] },
      { id: "2", name: "Item 2", price: 20, consumerIds: ["p2"] },
      { id: "3", name: "Item 3", price: 30, consumerIds: ["p3"] },
    ];
    const overallTax = 6;

    const itemTaxes = allocateItemTaxes(items, overallTax);

    expect(itemTaxes).toHaveLength(3);
    expect(itemTaxes[0]).toBe(round4(6 * (10 / 60))); // 1.0
    expect(itemTaxes[1]).toBe(round4(6 * (20 / 60))); // 2.0
    expect(itemTaxes[2]).toBe(round4(6 * (30 / 60))); // 3.0

    // Sum should equal overall tax (within rounding tolerance)
    const sum = itemTaxes.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - overallTax)).toBeLessThan(0.01);
  });

  test("should handle zero subtotal gracefully", () => {
    const items: Item[] = [
      { id: "1", name: "Free Item", price: 0, consumerIds: ["p1"] },
    ];
    const overallTax = 5;

    const itemTaxes = allocateItemTaxes(items, overallTax);

    expect(itemTaxes).toEqual([0]);
  });

  test("should handle empty items array", () => {
    const itemTaxes = allocateItemTaxes([], 5);
    expect(itemTaxes).toEqual([]);
  });

  test("should handle zero tax", () => {
    const items: Item[] = [
      { id: "1", name: "Item 1", price: 10, consumerIds: ["p1"] },
      { id: "2", name: "Item 2", price: 20, consumerIds: ["p2"] },
    ];
    const overallTax = 0;

    const itemTaxes = allocateItemTaxes(items, overallTax);

    expect(itemTaxes).toEqual([0, 0]);
  });

  test("should handle very small tax amounts", () => {
    const items: Item[] = [
      { id: "1", name: "Item 1", price: 10, consumerIds: ["p1"] },
      { id: "2", name: "Item 2", price: 20, consumerIds: ["p2"] },
    ];
    const overallTax = 0.01;

    const itemTaxes = allocateItemTaxes(items, overallTax);

    expect(itemTaxes).toHaveLength(2);
    const sum = itemTaxes.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - overallTax)).toBeLessThan(0.0001);
  });
});

describe("Total Computation - Comprehensive Tests", () => {
  test("should calculate per-person totals correctly", () => {
    const state: BillState = {
      people: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
      payerId: "p1",
      overallTax: 2,
      items: [
        { id: "i1", name: "Shared Item", price: 10, consumerIds: ["p1", "p2"] },
        { id: "i2", name: "Alice Only", price: 5, consumerIds: ["p1"] },
      ],
    };

    const totals = computeTotals(state);

    expect(totals.subtotal).toBe(15);
    expect(totals.grandTotal).toBe(17);

    // Verify person totals are properly structured
    expect(totals.personTotals).toHaveLength(2);
    expect(totals.personTotals[0].name).toBe("Alice");
    expect(totals.personTotals[1].name).toBe("Bob");

    // Alice should have more (shared + individual + taxes)
    expect(totals.perPersonUnrounded["p1"]).toBeGreaterThan(
      totals.perPersonUnrounded["p2"]
    );
  });

  test("should handle single consumer items", () => {
    const state: BillState = {
      people: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
      payerId: "p1",
      overallTax: 0,
      items: [{ id: "i1", name: "Alice Item", price: 10, consumerIds: ["p1"] }],
    };

    const totals = computeTotals(state);

    expect(totals.perPersonUnrounded["p1"]).toBe(10);
    expect(totals.perPersonUnrounded["p2"]).toBe(0);
  });

  test("should handle zero tax scenarios", () => {
    const state: BillState = {
      people: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
      payerId: "p1",
      overallTax: 0,
      items: [
        { id: "i1", name: "Shared Item", price: 10, consumerIds: ["p1", "p2"] },
      ],
    };

    const totals = computeTotals(state);

    expect(totals.subtotal).toBe(10);
    expect(totals.grandTotal).toBe(10);
    expect(totals.perPersonUnrounded["p1"]).toBe(5);
    expect(totals.perPersonUnrounded["p2"]).toBe(5);
  });

  test("should handle multiple consumers per item", () => {
    const state: BillState = {
      people: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
        { id: "p3", name: "Charlie" },
      ],
      payerId: "p1",
      overallTax: 3,
      items: [
        {
          id: "i1",
          name: "Shared by 3",
          price: 12,
          consumerIds: ["p1", "p2", "p3"],
        },
      ],
    };

    const totals = computeTotals(state);

    // Each person should get exactly 1/3 of (12 + 3) = 5
    expect(totals.perPersonUnrounded["p1"]).toBe(5);
    expect(totals.perPersonUnrounded["p2"]).toBe(5);
    expect(totals.perPersonUnrounded["p3"]).toBe(5);
    expect(totals.grandTotal).toBe(15);
  });

  test("should handle empty state gracefully", () => {
    const state: BillState = {
      people: [{ id: "p1", name: "Alice" }],
      payerId: "p1",
      overallTax: 0,
      items: [],
    };

    const totals = computeTotals(state);

    expect(totals.subtotal).toBe(0);
    expect(totals.grandTotal).toBe(0);
    expect(totals.perPersonUnrounded["p1"]).toBe(0);
    expect(totals.personTotals).toHaveLength(1);
    expect(totals.personTotals[0].items).toHaveLength(0);
  });
});

describe("Penny Fixing - Comprehensive Tests", () => {
  test("should distribute penny discrepancies correctly", () => {
    const perPersonUnrounded = {
      p1: 10.334,
      p2: 10.333,
      p3: 10.333,
    };
    const grandTotal = 31.0;

    const fixed = pennyFix(perPersonUnrounded, grandTotal);

    // Sum should equal grand total exactly
    const sum = Object.values(fixed).reduce((a, b) => a + b, 0);
    expect(sum).toBe(grandTotal);

    // Highest fractional remainder (p1 with 0.334) should get the penny
    expect(fixed["p1"]).toBe(10.34);
    expect(fixed["p2"]).toBe(10.33);
    expect(fixed["p3"]).toBe(10.33);
  });

  test("should handle negative discrepancies", () => {
    const perPersonUnrounded = {
      p1: 10.336,
      p2: 10.336,
      p3: 10.336,
    };
    const grandTotal = 31.0;

    const fixed = pennyFix(perPersonUnrounded, grandTotal);

    const sum = Object.values(fixed).reduce((a, b) => a + b, 0);
    expect(sum).toBe(grandTotal);

    // Should remove pennies from people with highest fractional remainders
    expect(fixed["p1"]).toBe(10.33);
    expect(fixed["p2"]).toBe(10.33);
    expect(fixed["p3"]).toBe(10.34);
  });

  test("should handle no discrepancy", () => {
    const perPersonUnrounded = {
      p1: 10.33,
      p2: 10.33,
      p3: 10.34,
    };
    const grandTotal = 31.0;

    const fixed = pennyFix(perPersonUnrounded, grandTotal);

    expect(fixed["p1"]).toBe(10.33);
    expect(fixed["p2"]).toBe(10.33);
    expect(fixed["p3"]).toBe(10.34);
  });

  test("should handle single person", () => {
    const perPersonUnrounded = {
      p1: 10.336,
    };
    const grandTotal = 10.34;

    const fixed = pennyFix(perPersonUnrounded, grandTotal);

    expect(fixed["p1"]).toBe(10.34);
  });

  test("should handle very small discrepancies", () => {
    const perPersonUnrounded = {
      p1: 0.001,
      p2: 0.001,
    };
    const grandTotal = 0.0;

    const fixed = pennyFix(perPersonUnrounded, grandTotal);

    const sum = Object.values(fixed).reduce((a, b) => a + b, 0);
    expect(sum).toBe(grandTotal);
  });
});

describe("Splitwise Integration - Comprehensive Tests", () => {
  test("should build correct Splitwise shares", () => {
    const state = createSampleState();
    const splitwise = buildSplitwiseShares(state);

    expect(splitwise.shares).toHaveLength(4);
    expect(splitwise.payerName).toBe("Dan (payer)");
    expect(splitwise.grandTotal).toBeGreaterThan(0);

    // Sum of shares should equal grand total exactly
    const sum = splitwise.shares.reduce((acc, share) => acc + share.amount, 0);
    expect(Math.abs(sum - splitwise.grandTotal)).toBeLessThan(0.001);

    // Shares should be sorted by amount descending
    for (let i = 0; i < splitwise.shares.length - 1; i++) {
      expect(splitwise.shares[i].amount).toBeGreaterThanOrEqual(
        splitwise.shares[i + 1].amount
      );
    }

    // All amounts should be positive
    splitwise.shares.forEach((share) => {
      expect(share.amount).toBeGreaterThan(0);
    });
  });

  test("should filter out zero amounts", () => {
    const state: BillState = {
      people: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
        { id: "p3", name: "Charlie" },
      ],
      payerId: "p1",
      overallTax: 1,
      items: [{ id: "i1", name: "Alice Only", price: 10, consumerIds: ["p1"] }],
    };

    const splitwise = buildSplitwiseShares(state);

    // Only Alice should have a share
    expect(splitwise.shares).toHaveLength(1);
    expect(splitwise.shares[0].name).toBe("Alice");
    expect(splitwise.shares[0].amount).toBeGreaterThan(0);
  });

  test("should generate proper Splitwise text", () => {
    const state = createSampleState();
    const splitwise = buildSplitwiseShares(state);
    const text = generateSplitwiseText(splitwise);

    expect(text).toContain("How to enter in Splitwise (Splitter)");
    expect(text).toContain("Total: $");
    expect(text).toContain("Paid by: Dan (payer)");
    expect(text).toContain("Split: Unequal shares (by amount)");
    expect(text).toContain("Shares:");

    // Should contain all people with shares
    splitwise.shares.forEach((share) => {
      expect(text).toContain(`${share.name}: $${share.amount.toFixed(2)}`);
    });
  });

  test("should handle external payer", () => {
    const state: BillState = {
      people: [
        { id: "p1", name: "Alice" },
        { id: "external", name: "External Payer", isExternal: true },
      ],
      payerId: "external",
      overallTax: 1,
      items: [{ id: "i1", name: "Alice Item", price: 10, consumerIds: ["p1"] }],
    };

    const splitwise = buildSplitwiseShares(state);

    expect(splitwise.payerName).toBe("External Payer");
    expect(splitwise.shares).toHaveLength(1);
    expect(splitwise.shares[0].name).toBe("Alice");
  });
});

describe("State Validation Tests", () => {
  test("should validate valid state", () => {
    const state = createSampleState();
    const validation = validateBillState(state);

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test("should catch empty people", () => {
    const state: BillState = {
      people: [],
      payerId: "p1",
      overallTax: 0,
      items: [],
    };

    const validation = validateBillState(state);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain(
      "Payer must be selected from people list"
    );
  });

  test("should catch invalid payer", () => {
    const state: BillState = {
      people: [{ id: "p1", name: "Alice" }],
      payerId: "nonexistent",
      overallTax: 0,
      items: [],
    };

    const validation = validateBillState(state);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain(
      "Payer must be selected from people list"
    );
  });

  test("should catch items without consumers", () => {
    const state: BillState = {
      people: [{ id: "p1", name: "Alice" }],
      payerId: "p1",
      overallTax: 0,
      items: [{ id: "i1", name: "Item", price: 10, consumerIds: [] }],
    };

    const validation = validateBillState(state);

    expect(validation.isValid).toBe(false);
    expect(
      validation.errors.some((e) =>
        e.includes("must have at least one consumer")
      )
    ).toBe(true);
  });

  test("should catch negative prices", () => {
    const state: BillState = {
      people: [{ id: "p1", name: "Alice" }],
      payerId: "p1",
      overallTax: 0,
      items: [{ id: "i1", name: "Item", price: -5, consumerIds: ["p1"] }],
    };

    const validation = validateBillState(state);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Item "Item" has invalid price');
  });

  test("should catch negative tax", () => {
    const state: BillState = {
      people: [{ id: "p1", name: "Alice" }],
      payerId: "p1",
      overallTax: -1,
      items: [],
    };

    const validation = validateBillState(state);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain("Tax cannot be negative");
  });

  test("should catch empty item names", () => {
    const state: BillState = {
      people: [{ id: "p1", name: "Alice" }],
      payerId: "p1",
      overallTax: 0,
      items: [{ id: "i1", name: "  ", price: 10, consumerIds: ["p1"] }],
    };

    const validation = validateBillState(state);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain("All items must have valid names");
  });
});

describe("Edge Cases and Stress Tests", () => {
  test("should handle very large numbers", () => {
    const state: BillState = {
      people: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
      payerId: "p1",
      overallTax: 999999.99,
      items: [
        {
          id: "i1",
          name: "Expensive Item",
          price: 1000000.0,
          consumerIds: ["p1", "p2"],
        },
      ],
    };

    const totals = computeTotals(state);
    const fixed = pennyFix(totals.perPersonUnrounded, totals.grandTotal);

    expect(totals.grandTotal).toBe(1999999.99);
    const sum = Object.values(fixed).reduce((a, b) => a + b, 0);
    expect(sum).toBe(totals.grandTotal);
  });

  test("should handle very small amounts", () => {
    const state: BillState = {
      people: [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
      ],
      payerId: "p1",
      overallTax: 0.01,
      items: [
        {
          id: "i1",
          name: "Cheap Item",
          price: 0.01,
          consumerIds: ["p1", "p2"],
        },
      ],
    };

    const totals = computeTotals(state);
    const fixed = pennyFix(totals.perPersonUnrounded, totals.grandTotal);

    const sum = Object.values(fixed).reduce((a, b) => a + b, 0);
    expect(sum).toBe(totals.grandTotal);
  });

  test("should handle many people", () => {
    const people = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Person ${i + 1}`,
    }));

    const state: BillState = {
      people,
      payerId: people[0].id,
      overallTax: 5.67,
      items: [
        {
          id: "i1",
          name: "Shared Item",
          price: 100,
          consumerIds: people.map((p) => p.id),
        },
      ],
    };

    const totals = computeTotals(state);
    const fixed = pennyFix(totals.perPersonUnrounded, totals.grandTotal);

    const sum = Object.values(fixed).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - totals.grandTotal)).toBeLessThan(0.001);
  });

  test("should handle many items", () => {
    const people = [
      { id: "p1", name: "Alice" },
      { id: "p2", name: "Bob" },
    ];

    const items = Array.from({ length: 50 }, (_, i) => ({
      id: `i${i + 1}`,
      name: `Item ${i + 1}`,
      price: Math.round((Math.random() * 20 + 1) * 100) / 100,
      consumerIds: Math.random() > 0.5 ? ["p1"] : ["p2"],
    }));

    const state: BillState = {
      people,
      payerId: "p1",
      overallTax: 15.43,
      items,
    };

    const totals = computeTotals(state);
    const fixed = pennyFix(totals.perPersonUnrounded, totals.grandTotal);

    const sum = Object.values(fixed).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - totals.grandTotal)).toBeLessThan(0.001);
  });
});
