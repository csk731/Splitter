import React, { useState, useCallback, useEffect } from "react";
import {
  Moon,
  Sun,
  Calculator,
  History,
  Trash2,
  FileText,
  X,
  Save,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { PeopleForm } from "./components/PeopleForm";
import { ItemsTable } from "./components/ItemsTable";
import { BillState } from "./lib/types";
import { computeTotals, createEmptyState } from "./lib/calc";
import { formatCurrency } from "./lib/utils";
import {
  saveToRecentSplits,
  loadRecentSplits,
  loadSplitById,
  deleteSplitById,
  clearRecentSplits,
  StoredSplit,
  validateBillState,
  isStateComplete,
} from "./lib/storage";

const WELCOME_DISMISSED_KEY = "splitter_welcome_dismissed";
const THEME_KEY = "splitter_theme";

function App() {
  const [state, setState] = useState<BillState>(() => createEmptyState());
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY) as
        | "light"
        | "dark"
        | null;
      return savedTheme || "light";
    } catch {
      return "light";
    }
  });
  const [emojiEnabled, setEmojiEnabled] = useState(false);
  const [showRecentSplits, setShowRecentSplits] = useState(false);
  const [recentSplits, setRecentSplits] = useState<StoredSplit[]>([]);
  const [lastSavedState, setLastSavedState] = useState<string>("");
  const [currentSplitId, setCurrentSplitId] = useState<string | null>(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try {
      return localStorage.getItem(WELCOME_DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [justSaved, setJustSaved] = useState(false);

  // Load recent splits on mount
  useEffect(() => {
    setRecentSplits(loadRecentSplits());
  }, []);

  // Apply theme to document and save to localStorage
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore localStorage errors (e.g., in private browsing mode)
    }
  }, [theme]);

  // Track state changes to determine if current split is saved
  useEffect(() => {
    const currentStateString = JSON.stringify(state);
    if (
      currentSplitId &&
      lastSavedState !== "" &&
      currentStateString !== lastSavedState
    ) {
      // State has changed since last save, but keep the currentSplitId
      // so we can update the existing split instead of creating a new one
      // Only reset currentSplitId when explicitly starting a new split
    }
  }, [state, lastSavedState, currentSplitId]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const handleUpdateState = useCallback((newState: BillState) => {
    const validation = validateBillState(newState);
    if (validation.isValid) {
      setState(newState);
      // Don't reset currentSplitId here - we want to allow updating existing splits
      // Only reset it when explicitly starting a new split
    }
  }, []);

  const handleManualSave = useCallback(() => {
    const completionCheck = isStateComplete(state);
    if (!completionCheck.isComplete) {
      return;
    }

    const currentStateString = JSON.stringify(state);

    // Check if current state is already saved
    if (currentSplitId && currentStateString === lastSavedState) {
      return; // Already saved, no need to save again
    }

    try {
      // If we have a currentSplitId, update the existing split; otherwise create new
      const resultSplitId = saveToRecentSplits(
        state,
        currentSplitId || undefined
      );

      if (resultSplitId) {
        const updatedSplits = loadRecentSplits();
        setRecentSplits(updatedSplits);

        // Update tracking
        setCurrentSplitId(resultSplitId);
        setLastSavedState(currentStateString);

        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save split:", error);
    }
  }, [state, currentSplitId, lastSavedState]);

  const handleNewSplit = useCallback(() => {
    setState(createEmptyState());
    setShowRecentSplits(false);
    setCurrentSplitId(null);
    setLastSavedState("");
  }, []);

  const handleLoadRecentSplit = useCallback((splitId: string) => {
    const loadedState = loadSplitById(splitId);
    if (loadedState) {
      setState(loadedState);
      setCurrentSplitId(splitId);
      setLastSavedState(JSON.stringify(loadedState));
      setShowRecentSplits(false);
    }
  }, []);

  const handleDeleteSplit = useCallback(
    (splitId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteSplitById(splitId);
      setRecentSplits(loadRecentSplits());

      // If we deleted the currently loaded split, reset the tracking
      if (splitId === currentSplitId) {
        setCurrentSplitId(null);
        setLastSavedState("");
      }
    },
    [currentSplitId]
  );

  const handleClearAllSplits = useCallback(() => {
    clearRecentSplits();
    setRecentSplits([]);
    setCurrentSplitId(null);
    setLastSavedState("");
  }, []);

  const handleDismissWelcome = useCallback(() => {
    setWelcomeDismissed(true);
    try {
      localStorage.setItem(WELCOME_DISMISSED_KEY, "true");
    } catch (error) {
      console.error("Failed to save welcome dismissed state:", error);
    }
  }, []);

  const totals = computeTotals(state);
  const hasItems = state.items.length > 0;

  const completionCheck = isStateComplete(state);
  const hasValidState = completionCheck.isComplete && hasItems;
  const canSave = completionCheck.isComplete && hasItems;

  // Check if current state is already saved
  const currentStateString = JSON.stringify(state);
  const isCurrentStateSaved =
    currentSplitId && currentStateString === lastSavedState;

  const regularPeople = state.people.filter((p) => !p.isExternal);
  const isEmpty = regularPeople.length === 0 && state.items.length === 0;
  const shouldShowWelcome = isEmpty && !showRecentSplits && !welcomeDismissed;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 relative">
        <div className="container max-w-full mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="h-6 w-6 text-primary" />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold">
                  Splitter
                  {emojiEnabled && <span className="ml-2">🧮</span>}
                </h1>
                {currentSplitId && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {recentSplits.find((s) => s.id === currentSplitId)
                        ?.name || "Current Split"}
                    </span>
                    {!isCurrentStateSaved && (
                      <span className="text-orange-600 dark:text-orange-400">
                        • Unsaved changes
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEmojiEnabled(!emojiEnabled)}
                title={emojiEnabled ? "Hide emoji" : "Show emoji"}
              >
                {emojiEnabled ? "🧮" : "🙂"}
              </Button>

              {canSave && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleManualSave}
                  disabled={isCurrentStateSaved}
                  title={
                    isCurrentStateSaved
                      ? "Split already saved"
                      : justSaved
                      ? "Just saved!"
                      : currentSplitId
                      ? "Update current split"
                      : "Save new split"
                  }
                  className={
                    justSaved
                      ? "text-green-600 dark:text-green-400"
                      : isCurrentStateSaved
                      ? "text-muted-foreground opacity-50"
                      : !isCurrentStateSaved && currentSplitId
                      ? "text-orange-600 dark:text-orange-400" // Show orange for unsaved changes
                      : ""
                  }
                >
                  <Save className="h-4 w-4" />
                  {justSaved ? (
                    <span className="ml-1 text-xs">Saved!</span>
                  ) : isCurrentStateSaved ? (
                    <span className="ml-1 text-xs">Saved</span>
                  ) : currentSplitId ? (
                    <span className="ml-1 text-xs">Update</span>
                  ) : (
                    <span className="ml-1 text-xs">Save</span>
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecentSplits(!showRecentSplits)}
                title="Recent Splits"
                className="relative"
              >
                <History className="h-4 w-4" />
                {recentSplits.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {recentSplits.length}
                  </span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Splits Dropdown */}
        {showRecentSplits && (
          <div className="absolute top-full right-4 w-80 bg-card border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden mt-1">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Recent Splits</h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewSplit}
                  title="New Split"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                {recentSplits.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllSplits}
                    title="Clear All"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {recentSplits.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent splits</p>
                <p className="text-xs">Save splits to see them here</p>
              </div>
            ) : (
              recentSplits.map((split) => (
                <div
                  key={split.id}
                  className={`p-3 border-b last:border-b-0 hover:bg-accent/50 cursor-pointer flex items-center justify-between group ${
                    split.id === currentSplitId
                      ? "bg-primary/10 border-primary/20"
                      : ""
                  }`}
                  onClick={() => handleLoadRecentSplit(split.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {split.name}
                      </p>
                      {split.id === currentSplitId && (
                        <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(split.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteSplit(split.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
        )}
      </header>

      {/* Click outside to close recent splits */}
      {showRecentSplits && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowRecentSplits(false)}
        />
      )}

      {/* Main Content */}
      <main className="container max-w-full mx-auto px-4 py-6 pb-32">
        <div className="space-y-6">
          {/* Top Row - People Form (Full Width) */}
          <div className="w-full">
            <PeopleForm state={state} onUpdateState={handleUpdateState} />
          </div>

          {/* Middle Row - Items Table (Full Width) */}
          <div className="w-full">
            <ItemsTable state={state} onUpdateState={handleUpdateState} />
          </div>

          {/* Bottom Row - Per Person Totals (Full Width) */}
          {hasValidState && (
            <div className="w-full">
              <div className="border rounded-lg p-4 bg-card">
                <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Per-Person Totals
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {totals.personTotals
                    .filter(
                      (person) =>
                        !state.people.find((p) => p.id === person.id)
                          ?.isExternal
                    )
                    .map((person) => {
                      const isPayer = person.id === state.payerId;
                      return (
                        <div
                          key={person.id}
                          className={`p-3 rounded-lg border text-center ${
                            isPayer
                              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                              : "bg-accent/50"
                          }`}
                        >
                          <div className="font-medium text-sm mb-1">
                            {person.name}
                          </div>
                          <div className="text-lg font-bold">
                            {formatCurrency(person.total)}
                          </div>
                          {isPayer && (
                            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                              Paid the bill
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-t z-40">
        <div className="container max-w-full mx-auto px-4 py-3">
          {hasValidState ? (
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Tax:</span>
                <span className="font-medium">
                  {formatCurrency(state.overallTax)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-bold text-lg">
                  {formatCurrency(totals.grandTotal)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <p className="text-sm">
                Add people and items to start splitting your bill
              </p>
            </div>
          )}
        </div>
      </footer>

      {/* Welcome Message for Empty State */}
      {shouldShowWelcome && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-card border rounded-lg p-6 max-w-md text-center shadow-lg pointer-events-auto relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissWelcome}
              className="absolute top-2 right-2 h-8 w-8 p-0"
              title="Dismiss permanently"
            >
              <X className="h-4 w-4" />
            </Button>

            <Calculator className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-lg font-semibold mb-2">
              Welcome to Splitter{emojiEnabled && " 🧮"}
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Split itemized bills fairly with automatic tax allocation and
              penny fixing.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Add people to split the bill with</p>
              <p>• Enter items and select who consumed each</p>
              <p>• Save completed splits for later reference</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
