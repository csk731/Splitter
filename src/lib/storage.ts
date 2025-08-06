import { BillState, StoredSplit } from "./types";
import { createEmptyState, generateId } from "./calc";

/**
 * Deep copy a BillState to avoid reference issues
 */
function deepCopyBillState(state: BillState): BillState {
  return {
    ...state,
    people: state.people.map((person) => ({ ...person })),
    items: state.items.map((item) => ({
      ...item,
      consumerIds: [...item.consumerIds],
    })),
  };
}

const STORAGE_KEY = "spliteasy_recent_splits";
const MAX_STORED_SPLITS = 10;

/**
 * Generate a descriptive name for a split
 */
function generateSplitName(state: BillState): string {
  const regularPeople = state.people.filter((p) => !p.isExternal);
  const peopleCount = regularPeople.length;
  const itemCount = state.items.length;
  const total =
    state.items.reduce((sum, item) => sum + item.price, 0) + state.overallTax;

  if (peopleCount === 0 || itemCount === 0) {
    return "Empty Split";
  }

  const date = new Date().toLocaleDateString();
  return `${peopleCount} people, ${itemCount} items, $${total.toFixed(
    2
  )} - ${date}`;
}

/**
 * Load recent splits from localStorage
 */
export function loadRecentSplits(): StoredSplit[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const splits = JSON.parse(stored) as StoredSplit[];

    // Validate structure
    if (!Array.isArray(splits)) {
      console.warn("Invalid stored splits, clearing storage");
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    // Validate each split and filter out invalid ones
    const validSplits = splits.filter((split) => {
      try {
        if (!split.id || !split.timestamp || !split.state || !split.name) {
          return false;
        }

        // Validate the state
        const validation = validateBillState(split.state);
        return validation.isValid;
      } catch {
        return false;
      }
    });

    // Sort by timestamp (newest first) and limit to MAX_STORED_SPLITS
    return validSplits
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_STORED_SPLITS);
  } catch (error) {
    console.error("Failed to load recent splits:", error);
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

/**
 * Save a split to recent splits - updates existing if splitId provided, creates new otherwise
 */
export function saveToRecentSplits(
  state: BillState,
  existingSplitId?: string
): string {
  try {
    // Don't save empty states or states that are not complete
    const completion = isStateComplete(state);
    if (!completion.isComplete) {
      console.warn("Not saving incomplete state:", completion.warnings);
      return "";
    }

    const currentSplits = loadRecentSplits();
    let splitId: string;

    if (existingSplitId) {
      // Update existing split
      const existingIndex = currentSplits.findIndex(
        (s) => s.id === existingSplitId
      );
      if (existingIndex !== -1) {
        // Update the existing split
        currentSplits[existingIndex] = {
          ...currentSplits[existingIndex],
          state: deepCopyBillState(state), // Deep copy to avoid reference issues
          name: generateSplitName(state),
          timestamp: Date.now(), // Update timestamp to show it was recently modified
        };
        splitId = existingSplitId;
      } else {
        // Split not found, create new one
        splitId = generateId();
        const newSplit: StoredSplit = {
          id: splitId,
          timestamp: Date.now(),
          state: deepCopyBillState(state),
          name: generateSplitName(state),
        };
        currentSplits.unshift(newSplit);
      }
    } else {
      // Create new split
      splitId = generateId();
      const newSplit: StoredSplit = {
        id: splitId,
        timestamp: Date.now(),
        state: deepCopyBillState(state),
        name: generateSplitName(state),
      };
      currentSplits.unshift(newSplit);
    }

    // Sort by timestamp (newest first) and limit to MAX_STORED_SPLITS
    const updatedSplits = currentSplits
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_STORED_SPLITS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSplits));
    return splitId;
  } catch (error) {
    console.error("Failed to save recent split:", error);
    return "";
  }
}

/**
 * Load a specific split by ID
 */
export function loadSplitById(id: string): BillState | null {
  const splits = loadRecentSplits();
  const split = splits.find((s) => s.id === id);
  return split ? split.state : null;
}

/**
 * Delete a split by ID
 */
export function deleteSplitById(id: string): void {
  try {
    const splits = loadRecentSplits();
    const filteredSplits = splits.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSplits));
  } catch (error) {
    console.error("Failed to delete split:", error);
  }
}

/**
 * Clear all recent splits
 */
export function clearRecentSplits(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear recent splits:", error);
  }
}

/**
 * Reset to empty state (no initial data)
 */
export function resetToEmpty(): BillState {
  return createEmptyState();
}

/**
 * Export state as JSON string
 */
export function exportState(state: BillState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Import state from JSON string with comprehensive validation
 */
export function importState(jsonString: string): BillState {
  try {
    const parsed = JSON.parse(jsonString) as BillState;

    // Validate using our validation function
    const validation = validateBillState(parsed);
    if (!validation.isValid) {
      throw new Error(`Invalid state: ${validation.errors.join(", ")}`);
    }

    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to import state: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Validate bill state for consistency
 * Note: This allows incomplete states (items without consumers) for editing,
 * but flags them as validation warnings rather than hard errors
 */
export function validateBillState(state: BillState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check basic structure
  if (!state || typeof state !== "object") {
    errors.push("Invalid state structure");
    return { isValid: false, errors };
  }

  if (!Array.isArray(state.people)) {
    errors.push("People must be an array");
    return { isValid: false, errors };
  }

  if (!Array.isArray(state.items)) {
    errors.push("Items must be an array");
    return { isValid: false, errors };
  }

  if (typeof state.overallTax !== "number") {
    errors.push("Overall tax must be a number");
    return { isValid: false, errors };
  }

  if (!state.payerId || typeof state.payerId !== "string") {
    errors.push("Payer ID is required");
    return { isValid: false, errors };
  }

  // Check if people exist (allow empty for initial state)
  // const regularPeople = state.people.filter((p) => !p.isExternal);

  // Check if payer exists
  const payer = state.people.find((p) => p.id === state.payerId);
  if (!payer) {
    errors.push("Payer must be selected from people list");
  }

  // Validate people
  for (const person of state.people) {
    if (!person.id || typeof person.id !== "string") {
      errors.push("All people must have valid IDs");
    }

    if (
      !person.name ||
      typeof person.name !== "string" ||
      person.name.trim().length === 0
    ) {
      errors.push(`Person with ID ${person.id || "unknown"} has invalid name`);
    }
  }

  // Check items - allow incomplete items during editing
  for (const item of state.items) {
    if (!item.id || typeof item.id !== "string") {
      errors.push("All items must have valid IDs");
    }

    if (
      !item.name ||
      typeof item.name !== "string" ||
      item.name.trim().length === 0
    ) {
      errors.push("All items must have valid names");
    }

    if (typeof item.price !== "number" || item.price < 0) {
      errors.push(`Item "${item.name || "unknown"}" has invalid price`);
    }

    if (!Array.isArray(item.consumerIds)) {
      errors.push(`Item "${item.name || "unknown"}" has invalid consumer list`);
    }

    // Allow empty consumerIds during editing - don't make it a hard error
    // The UI will show warnings for incomplete items

    // Check if all consumers exist (only if there are consumers)
    for (const consumerId of item.consumerIds || []) {
      const consumer = state.people.find((p) => p.id === consumerId);
      if (!consumer) {
        errors.push(
          `Item "${
            item.name || "unknown"
          }" has invalid consumer ID: ${consumerId}`
        );
      }
    }
  }

  // Check tax
  if (state.overallTax < 0) {
    errors.push("Tax cannot be negative");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if bill state is complete and ready for final calculations
 * This is stricter than validateBillState and requires all items to have consumers
 */
export function isStateComplete(state: BillState): {
  isComplete: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // First check if the basic validation passes
  const validation = validateBillState(state);
  if (!validation.isValid) {
    return { isComplete: false, warnings: validation.errors };
  }

  // Check for completeness issues
  const regularPeople = state.people.filter((p) => !p.isExternal);

  if (regularPeople.length === 0) {
    warnings.push("At least one person is required");
  }

  if (state.items.length === 0) {
    warnings.push("At least one item is required");
  }

  // Check for incomplete items
  for (const item of state.items) {
    if (item.price === 0) {
      warnings.push(`Item "${item.name}" needs a price`);
    }

    if (item.consumerIds.length === 0) {
      warnings.push(`Item "${item.name}" needs at least one consumer`);
    }
  }

  return {
    isComplete: warnings.length === 0,
    warnings,
  };
}
