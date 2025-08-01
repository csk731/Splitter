import React, { useState } from "react";
import {
  Users,
  Plus,
  Trash2,
  AlertCircle,
  Crown,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Card, CardContent } from "./ui/card";
import { Person, BillState } from "@/lib/types";
import { generateId } from "@/lib/calc";

interface PeopleFormProps {
  state: BillState;
  onUpdateState: (state: BillState) => void;
}

interface FieldError {
  personId?: string;
  field: string;
  message: string;
}

export function PeopleForm({ state, onUpdateState }: PeopleFormProps) {
  const [newPersonName, setNewPersonName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

  const addFieldError = (error: FieldError) => {
    setFieldErrors((prev) => {
      const filtered = prev.filter(
        (e) => !(e.personId === error.personId && e.field === error.field)
      );
      return [...filtered, error];
    });
  };

  const removeFieldError = (personId: string | undefined, field: string) => {
    setFieldErrors((prev) =>
      prev.filter((e) => !(e.personId === personId && e.field === field))
    );
  };

  const getFieldError = (personId: string | undefined, field: string) => {
    return fieldErrors.find(
      (e) => e.personId === personId && e.field === field
    );
  };

  const addPerson = async () => {
    const trimmedName = newPersonName.trim();

    removeFieldError(undefined, "newPersonName");

    let hasErrors = false;

    if (!trimmedName) {
      addFieldError({ field: "newPersonName", message: "Please enter a name" });
      hasErrors = true;
    }

    if (trimmedName.length > 50) {
      addFieldError({
        field: "newPersonName",
        message: "Name is too long (max 50 characters)",
      });
      hasErrors = true;
    }

    const existingNames = state.people.map((p) => p.name.toLowerCase());
    if (trimmedName && existingNames.includes(trimmedName.toLowerCase())) {
      addFieldError({
        field: "newPersonName",
        message: "This name already exists",
      });
      hasErrors = true;
    }

    if (hasErrors) return;

    setIsSubmitting(true);

    try {
      const newPerson: Person = {
        id: generateId(),
        name: trimmedName,
      };

      const newState = {
        ...state,
        people: [...state.people, newPerson],
      };

      onUpdateState(newState);
      setNewPersonName("");
    } catch (err) {
      addFieldError({
        field: "newPersonName",
        message: "Failed to add person",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removePerson = (personId: string) => {
    removeFieldError(undefined, "removal");

    if (personId === state.payerId) {
      addFieldError({
        field: "removal",
        message: "Can't remove the person who paid the bill",
      });
      return;
    }

    const hasItems = state.items.some((item) =>
      item.consumerIds.includes(personId)
    );
    if (hasItems) {
      addFieldError({
        field: "removal",
        message: "Can't remove a person who has items assigned to them",
      });
      return;
    }

    setFieldErrors((prev) => prev.filter((e) => e.personId !== personId));

    const newState = {
      ...state,
      people: state.people.filter((p) => p.id !== personId),
    };

    onUpdateState(newState);
  };

  const updatePersonName = (personId: string, newName: string) => {
    const trimmedName = newName.trim();

    removeFieldError(personId, "name");

    if (newName === "") {
      addFieldError({
        personId,
        field: "name",
        message: "Name cannot be empty",
      });
    } else if (trimmedName.length > 50) {
      addFieldError({
        personId,
        field: "name",
        message: "Name is too long (max 50 characters)",
      });
      return;
    } else {
      const otherNames = state.people
        .filter((p) => p.id !== personId)
        .map((p) => p.name.toLowerCase());

      if (trimmedName && otherNames.includes(trimmedName.toLowerCase())) {
        addFieldError({
          personId,
          field: "name",
          message: "This name already exists",
        });
        return;
      }
    }

    const newState = {
      ...state,
      people: state.people.map((p) =>
        p.id === personId ? { ...p, name: newName } : p
      ),
    };

    onUpdateState(newState);
  };

  const updatePayer = (payerId: string) => {
    removeFieldError(undefined, "payer");

    if (payerId === "external") {
      const externalPayer = state.people.find((p) => p.isExternal);
      if (!externalPayer) {
        const newExternalPayer: Person = {
          id: generateId(),
          name: "External Payer",
          isExternal: true,
        };

        const newState = {
          ...state,
          people: [...state.people, newExternalPayer],
          payerId: newExternalPayer.id,
        };

        onUpdateState(newState);
      } else {
        onUpdateState({ ...state, payerId: externalPayer.id });
      }
    } else if (payerId === "") {
      addFieldError({
        field: "payer",
        message: "Please select who paid the bill",
      });
      return;
    } else {
      const newPeople = state.people.filter((p) => !p.isExternal);

      onUpdateState({
        ...state,
        people: newPeople,
        payerId,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) {
      e.preventDefault();
      addPerson();
    }
  };

  const handleInputChange = (value: string) => {
    setNewPersonName(value);
    if (value.trim()) {
      removeFieldError(undefined, "newPersonName");
    }
  };

  const regularPeople = state.people.filter((p) => !p.isExternal);
  const payer = state.people.find((p) => p.id === state.payerId);
      // const hasErrors = fieldErrors.length > 0;

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {/* Error Display */}
        {getFieldError(undefined, "removal") && (
          <div className="flex items-center gap-2 p-2 mb-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{getFieldError(undefined, "removal")?.message}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFieldError(undefined, "removal")}
              className="ml-auto h-auto p-1 text-destructive hover:text-destructive"
            >
              ×
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {/* Header with Add Person */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">People:</span>
            </div>

            {/* Add Person Input */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Input
                placeholder="Add person..."
                value={newPersonName}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                className={`h-8 ${
                  getFieldError(undefined, "newPersonName")
                    ? "border-destructive"
                    : ""
                }`}
                maxLength={50}
                disabled={isSubmitting}
              />
              <Button
                onClick={addPerson}
                disabled={!newPersonName.trim() || isSubmitting}
                size="sm"
                className="h-8 px-3"
              >
                {isSubmitting ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Payer Selection */}
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Payer:</span>
              <Select
                value={payer?.isExternal ? "external" : state.payerId}
                onChange={(e) => updatePayer(e.target.value)}
                className={`h-9 min-w-[150px] ${
                  getFieldError(undefined, "payer") ? "border-destructive" : ""
                }`}
              >
                <option value="">Select...</option>
                {regularPeople.length > 0 && (
                  <optgroup label="Group Members">
                    {regularPeople.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Other">
                  <option value="external">External Payer</option>
                </optgroup>
              </Select>
            </div>
          </div>

          {/* Error Messages */}
          {getFieldError(undefined, "newPersonName") && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {getFieldError(undefined, "newPersonName")?.message}
            </p>
          )}
          {getFieldError(undefined, "payer") && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {getFieldError(undefined, "payer")?.message}
            </p>
          )}

          {/* People Chips */}
          {regularPeople.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {regularPeople.map((person) => {
                const isPayer = person.id === state.payerId;
                const hasItems = state.items.some((item) =>
                  item.consumerIds.includes(person.id)
                );
                const itemCount = state.items.filter((item) =>
                  item.consumerIds.includes(person.id)
                ).length;
                const nameError = getFieldError(person.id, "name");
                const isEditing = editingPersonId === person.id;

                return (
                  <div key={person.id} className="flex flex-col">
                    <div
                      className={`
                      flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition-all
                      ${
                        isPayer
                          ? "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                          : "bg-accent border-border hover:bg-accent/80"
                      }
                      ${nameError ? "border-destructive" : ""}
                    `}
                    >
                      {isPayer && (
                        <Crown className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      )}

                      {isEditing ? (
                        <Input
                          value={person.name}
                          onChange={(e) =>
                            updatePersonName(person.id, e.target.value)
                          }
                          onBlur={() => setEditingPersonId(null)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              setEditingPersonId(null);
                            }
                          }}
                          className="h-5 px-1 text-sm border-none bg-transparent"
                          autoFocus
                          maxLength={50}
                        />
                      ) : (
                        <span
                          className="cursor-pointer"
                          onClick={() => setEditingPersonId(person.id)}
                          title="Click to edit name"
                        >
                          {person.name}
                        </span>
                      )}

                      {hasItems && (
                        <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                          {itemCount}
                        </span>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePerson(person.id)}
                        disabled={isPayer || hasItems}
                        className="h-5 w-5 p-0 opacity-60 hover:opacity-100 hover:text-destructive"
                        title={
                          isPayer
                            ? "Can't remove current payer"
                            : hasItems
                            ? "Can't remove person with assigned items"
                            : "Remove person"
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {nameError && (
                      <p className="text-xs text-destructive ml-2 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {nameError.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-2 text-muted-foreground">
              <p className="text-sm">
                No people added yet - add people to split the bill with
              </p>
            </div>
          )}

          {/* Quick Stats */}
          {regularPeople.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>
                {regularPeople.length} people • {state.items.length} items
              </span>
              {state.items.length > 0 && (
                <span>
                  Total: $
                  {(
                    state.items.reduce((sum, item) => sum + item.price, 0) +
                    state.overallTax
                  ).toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
