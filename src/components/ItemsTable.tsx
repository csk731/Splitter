import React, { useState, useRef, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  Trash2,
  DollarSign,
  AlertCircle,
  Check,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { BillState, Item } from "@/lib/types";
import { generateId, allocateItemTaxes } from "@/lib/calc";
import { formatCurrency } from "@/lib/utils";

interface ItemsTableProps {
  state: BillState;
  onUpdateState: (state: BillState) => void;
}

interface FieldError {
  itemId?: string;
  field: string;
  message: string;
}

export function ItemsTable({ state, onUpdateState }: ItemsTableProps) {
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Refs for auto-focusing inputs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Ref to track focus timeout for cleanup
  const focusTimeoutRef = useRef<number | null>(null);

  const regularPeople = state.people.filter((p) => !p.isExternal);

  // Calculate tax allocation for display
  const itemTaxes = allocateItemTaxes(state.items, state.overallTax);
  const subtotal = state.items.reduce((sum, item) => sum + item.price, 0);

  // Auto-focus name input when no items exist (for initial focus)
  useEffect(() => {
    // Clear any existing timeout
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }

    if (state.items.length === 0 && regularPeople.length > 0) {
      focusTimeoutRef.current = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }

    // Cleanup function
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [state.items.length, regularPeople.length]);

  const addFieldError = (error: FieldError) => {
    setFieldErrors((prev) => {
      const filtered = prev.filter(
        (e) => !(e.itemId === error.itemId && e.field === error.field)
      );
      return [...filtered, error];
    });
  };

  const removeFieldError = (itemId: string | undefined, field: string) => {
    setFieldErrors((prev) =>
      prev.filter((e) => !(e.itemId === itemId && e.field === field))
    );
  };

  const getFieldError = (itemId: string | undefined, field: string) => {
    return fieldErrors.find((e) => e.itemId === itemId && e.field === field);
  };

  const validatePrice = (priceStr: string): number | null => {
    if (priceStr === "" || priceStr === undefined) return null;
    const parsed = parseFloat(priceStr);
    if (isNaN(parsed) || parsed < 0) return null;
    return Math.round(parsed * 100) / 100;
  };

  const addItem = () => {
    // Prevent multiple simultaneous submissions
    if (isSubmitting) return;

    const trimmedName = newItemName.trim();

    removeFieldError(undefined, "newItemName");
    removeFieldError(undefined, "newItemPrice");

    let hasErrors = false;

    // Name is mandatory
    if (!trimmedName) {
      addFieldError({
        field: "newItemName",
        message: "Please enter an item name",
      });
      hasErrors = true;
    }

    if (trimmedName.length > 100) {
      addFieldError({
        field: "newItemName",
        message: "Item name is too long (max 100 characters)",
      });
      hasErrors = true;
    }

    if (regularPeople.length === 0) {
      addFieldError({
        field: "newItemName",
        message: "Add people first before adding items",
      });
      hasErrors = true;
    }

    const existingNames = state.items.map((item) => item.name.toLowerCase());
    if (trimmedName && existingNames.includes(trimmedName.toLowerCase())) {
      addFieldError({
        field: "newItemName",
        message: "This item already exists",
      });
      hasErrors = true;
    }

    // Price is mandatory
    if (!newItemPrice.trim()) {
      addFieldError({ field: "newItemPrice", message: "Please enter a price" });
      hasErrors = true;
    } else {
      const validatedPrice = validatePrice(newItemPrice);
      if (validatedPrice === null) {
        addFieldError({
          field: "newItemPrice",
          message: "Please enter a valid price",
        });
        hasErrors = true;
      } else if (validatedPrice === 0) {
        addFieldError({
          field: "newItemPrice",
          message: "Price must be greater than 0",
        });
        hasErrors = true;
      }
    }

    if (hasErrors) return;

    setIsSubmitting(true);

    try {
      const validatedPrice = validatePrice(newItemPrice);
      const newItem: Item = {
        id: generateId(),
        name: trimmedName,
        price: validatedPrice || 0,
        consumerIds: [], // Default to empty, require manual selection
      };

      const newState = {
        ...state,
        items: [newItem, ...state.items], // Add new item at the top
      };

      onUpdateState(newState);

      // Clear inputs after successful addition
      setNewItemName("");
      setNewItemPrice("");

      // Auto-focus name input for faster entry
      // Use requestAnimationFrame instead of setTimeout for better performance
      requestAnimationFrame(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      });
    } catch (err) {
      addFieldError({ field: "newItemName", message: "Failed to add item" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateItemPrice = (itemId: string, priceString: string) => {
    updateItem(itemId, { price: priceString as any });
  };

  const updateItem = (itemId: string, updates: Partial<Item>) => {
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      removeFieldError(itemId, "name");

      if (updates.name === "") {
        addFieldError({
          itemId,
          field: "name",
          message: "Item name cannot be empty",
        });
      } else if (trimmedName.length > 100) {
        addFieldError({
          itemId,
          field: "name",
          message: "Item name is too long (max 100 characters)",
        });
        return;
      } else {
        const otherNames = state.items
          .filter((item) => item.id !== itemId)
          .map((item) => item.name.toLowerCase());

        if (trimmedName && otherNames.includes(trimmedName.toLowerCase())) {
          addFieldError({
            itemId,
            field: "name",
            message: "This item name already exists",
          });
          return;
        }
      }
    }

    if (updates.price !== undefined) {
      removeFieldError(itemId, "price");
      const priceValue = updates.price as any; // Handle both string and number
      if (priceValue === "" || priceValue === 0) {
        addFieldError({
          itemId,
          field: "price",
          message: "Please enter a price",
        });
        updates.price = 0;
      } else {
        const validatedPrice = validatePrice(priceValue.toString());
        if (validatedPrice === null) {
          addFieldError({
            itemId,
            field: "price",
            message: "Please enter a valid price",
          });
          return;
        }
        updates.price = validatedPrice;
      }
    }

    const newState = {
      ...state,
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    };

    onUpdateState(newState);
  };

  const removeItem = (itemId: string) => {
    setFieldErrors((prev) => prev.filter((e) => e.itemId !== itemId));

    const newState = {
      ...state,
      items: state.items.filter((item) => item.id !== itemId),
    };

    onUpdateState(newState);
  };

  const toggleConsumer = (itemId: string, personId: string) => {
    const item = state.items.find((i) => i.id === itemId);
    if (!item) return;

    removeFieldError(itemId, "consumers");

    const isCurrentlySelected = item.consumerIds.includes(personId);
    let newConsumerIds: string[];

    if (isCurrentlySelected) {
      newConsumerIds = item.consumerIds.filter((id) => id !== personId);
      if (newConsumerIds.length === 0) {
        addFieldError({
          itemId,
          field: "consumers",
          message: "At least one person must consume this item",
        });
      }
    } else {
      newConsumerIds = [...item.consumerIds, personId];
      removeFieldError(itemId, "consumers");
    }

    updateItem(itemId, { consumerIds: newConsumerIds });
  };

  const updateTax = (taxValue: string) => {
    removeFieldError(undefined, "tax");

    if (taxValue === "") {
      onUpdateState({ ...state, overallTax: 0 });
      return;
    }

    const validatedTax = validatePrice(taxValue);
    if (validatedTax === null) {
      addFieldError({
        field: "tax",
        message: "Please enter a valid tax amount",
      });
      return;
    }

    onUpdateState({ ...state, overallTax: validatedTax });
  };

  const handleNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) {
      e.preventDefault();
      if (newItemName.trim()) {
        // Move to price field
        priceInputRef.current?.focus();
      }
    }
  };

  const handlePriceKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent 'e', 'E', '+', '-' from being entered in number inputs
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Check for validation warnings
  const hasEmptyPrices = state.items.some((item) => item.price === 0);
  const hasItemsWithoutConsumers = state.items.some(
    (item) => item.consumerIds.length === 0
  );
  const hasValidationWarnings = hasEmptyPrices || hasItemsWithoutConsumers;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Items & Tax
        </CardTitle>
        <CardDescription>
          Add items and select who consumed each item
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Warnings */}
        {hasValidationWarnings && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md text-amber-800 dark:text-amber-300 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">
                Complete the following to see summary:
              </p>
              <ul className="text-xs space-y-0.5">
                {hasEmptyPrices && <li>• Add prices for all items</li>}
                {hasItemsWithoutConsumers && (
                  <li>• Select consumers for all items</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Tax Input */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <label
              htmlFor="tax-input"
              className="text-sm font-medium whitespace-nowrap"
            >
              Total Tax:
            </label>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
            <div className="w-32">
              <Input
                id="tax-input"
                type="number"
                placeholder="0.00"
                value={state.overallTax || ""}
                onChange={(e) => updateTax(e.target.value)}
                onKeyDown={handleNumberKeyDown}
                className={`text-center ${
                  getFieldError(undefined, "tax") ? "border-destructive" : ""
                }`}
                step="0.01"
                min="0"
              />
              {getFieldError(undefined, "tax") && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {getFieldError(undefined, "tax")?.message}
                </p>
              )}
            </div>
            {state.overallTax > 0 && (
              <div className="text-sm text-muted-foreground flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                  <span className="whitespace-nowrap">
                    Applied across {state.items.length} items
                  </span>
                  {subtotal > 0 && (
                    <span className="text-primary whitespace-nowrap">
                      ({((state.overallTax / subtotal) * 100).toFixed(1)}% rate)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-sm min-w-[200px]">
                    Item
                  </th>
                  <th className="text-right p-3 font-medium text-sm w-32 min-w-[120px]">
                    Price
                  </th>
                  <th className="text-right p-3 font-medium text-sm w-28 min-w-[100px]">
                    Tax
                  </th>
                  <th className="text-right p-3 font-medium text-sm w-32 min-w-[120px]">
                    Total
                  </th>
                  <th className="text-center p-3 font-medium text-sm min-w-[280px]">
                    Consumers
                  </th>
                  <th className="text-center p-3 font-medium text-sm w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Add New Item Row */}
                <tr className="border-b bg-accent/20">
                  <td className="p-3">
                    <div>
                      <Input
                        ref={nameInputRef}
                        placeholder="Enter item name"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyPress={handleNameKeyPress}
                        className={`${
                          getFieldError(undefined, "newItemName")
                            ? "border-destructive"
                            : ""
                        }`}
                        maxLength={100}
                        disabled={isSubmitting}
                      />
                      {getFieldError(undefined, "newItemName") && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {getFieldError(undefined, "newItemName")?.message}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div>
                      <Input
                        ref={priceInputRef}
                        type="number"
                        placeholder="0.00"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        onKeyPress={handlePriceKeyPress}
                        onKeyDown={handleNumberKeyDown}
                        className={`text-right ${
                          getFieldError(undefined, "newItemPrice")
                            ? "border-destructive"
                            : ""
                        }`}
                        step="0.01"
                        min="0"
                        disabled={isSubmitting}
                      />
                      {getFieldError(undefined, "newItemPrice") && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {getFieldError(undefined, "newItemPrice")?.message}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right text-sm text-muted-foreground">
                    -
                  </td>
                  <td className="p-3 text-right text-sm text-muted-foreground">
                    -
                  </td>
                  <td className="p-3 text-center text-sm text-muted-foreground">
                    Select after adding
                  </td>
                  <td className="p-3 text-center">
                    <Button
                      onClick={addItem}
                      disabled={
                        !newItemName.trim() ||
                        !newItemPrice.trim() ||
                        isSubmitting
                      }
                      size="sm"
                      className="h-8 w-8 p-0"
                      title={
                        !newItemName.trim() && !newItemPrice.trim()
                          ? "Enter item name, then price"
                          : !newItemName.trim()
                          ? "Enter item name first"
                          : !newItemPrice.trim()
                          ? "Enter item price"
                          : "Add item (or press Enter in price field)"
                      }
                    >
                      {isSubmitting ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                    </Button>
                  </td>
                </tr>

                {/* Existing Items */}
                {state.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-muted-foreground"
                    >
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No items added yet</p>
                      <p className="text-sm">Add items to split among people</p>
                    </td>
                  </tr>
                ) : (
                  state.items.map((item, index) => {
                    const itemTax = itemTaxes[index] || 0;
                    const itemTotal = item.price + itemTax;
                    const isIncomplete =
                      item.price === 0 || item.consumerIds.length === 0;
                    const nameError = getFieldError(item.id, "name");
                    const priceError = getFieldError(item.id, "price");
                    const consumersError = getFieldError(item.id, "consumers");

                    return (
                      <tr
                        key={item.id}
                        className={`border-b hover:bg-accent/30 ${
                          isIncomplete
                            ? "bg-amber-50/50 dark:bg-amber-950/10"
                            : ""
                        }`}
                      >
                        <td className="p-3">
                          <div>
                            <Input
                              value={item.name}
                              onChange={(e) =>
                                updateItem(item.id, { name: e.target.value })
                              }
                              className={`${
                                nameError ? "border-destructive" : ""
                              } ${
                                isIncomplete
                                  ? "border-amber-300 dark:border-amber-700"
                                  : ""
                              }`}
                              maxLength={100}
                            />
                            {nameError && (
                              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {nameError.message}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <Input
                              type="number"
                              value={item.price || ""}
                              onChange={(e) =>
                                updateItemPrice(item.id, e.target.value)
                              }
                              onKeyDown={handleNumberKeyDown}
                              className={`text-right ${
                                priceError ? "border-destructive" : ""
                              } ${
                                isIncomplete
                                  ? "border-amber-300 dark:border-amber-700"
                                  : ""
                              }`}
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                            />
                            {priceError && (
                              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {priceError.message}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right text-sm">
                          {item.price > 0 && state.overallTax > 0 ? (
                            <div className="font-medium whitespace-nowrap">
                              {formatCurrency(itemTax)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-sm font-medium">
                          {item.price > 0 ? (
                            <div className="whitespace-nowrap">
                              {formatCurrency(itemTotal)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {regularPeople.length === 0 ? (
                              <span className="text-xs text-muted-foreground">
                                No people added
                              </span>
                            ) : (
                              regularPeople.map((person) => {
                                const isSelected = item.consumerIds.includes(
                                  person.id
                                );
                                return (
                                  <Button
                                    key={person.id}
                                    variant={isSelected ? "default" : "outline"}
                                    size="sm"
                                    onClick={() =>
                                      toggleConsumer(item.id, person.id)
                                    }
                                    className="h-6 px-2 text-xs"
                                    title={`${isSelected ? "Remove" : "Add"} ${
                                      person.name
                                    }`}
                                  >
                                    {isSelected && (
                                      <Check className="h-3 w-3 mr-1" />
                                    )}
                                    {person.name}
                                  </Button>
                                );
                              })
                            )}
                          </div>
                          {consumersError && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1 justify-center">
                              <AlertCircle className="h-3 w-3" />
                              {consumersError.message}
                            </p>
                          )}
                          {item.consumerIds.length > 0 && (
                            <div className="text-xs text-muted-foreground text-center mt-1">
                              <div className="whitespace-nowrap">
                                {formatCurrency(
                                  itemTotal / item.consumerIds.length
                                )}{" "}
                                per person
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Remove item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer with Totals */}
              {state.items.length > 0 && (
                <tfoot className="bg-muted/50 border-t">
                  <tr>
                    <td className="p-3 font-medium">
                      Total ({state.items.length} item
                      {state.items.length !== 1 ? "s" : ""})
                    </td>
                    <td className="p-3 text-right font-medium">
                      <div className="whitespace-nowrap">
                        {formatCurrency(subtotal)}
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium">
                      <div className="whitespace-nowrap">
                        {formatCurrency(state.overallTax)}
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold text-lg">
                      <div className="whitespace-nowrap">
                        {formatCurrency(subtotal + state.overallTax)}
                      </div>
                    </td>
                    <td className="p-3 text-center text-sm text-muted-foreground">
                      {regularPeople.length} people
                    </td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Quick Stats */}
        {state.items.length > 0 && (
          <div className="text-xs text-muted-foreground pt-2 border-t flex justify-between">
            <span>
              {state.items.length} items • {regularPeople.length} people
            </span>
            <span>
              Avg:{" "}
              {formatCurrency(
                (subtotal + state.overallTax) /
                  Math.max(regularPeople.length, 1)
              )}{" "}
              per person
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
