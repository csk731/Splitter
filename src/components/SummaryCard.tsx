// import React from "react";
import { Users, ShoppingCart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { BillState } from "@/lib/types";
import { computeTotals } from "@/lib/calc";
import { formatCurrency } from "@/lib/utils";

interface SummaryCardProps {
  state: BillState;
}

export function SummaryCard({ state }: SummaryCardProps) {
  const totals = computeTotals(state);
  const regularPeople = state.people.filter((p) => !p.isExternal);

  // Don't show summary if there are validation issues
  const hasEmptyPrices = state.items.some((item) => item.price === 0);
  const hasItemsWithoutConsumers = state.items.some(
    (item) => item.consumerIds.length === 0
  );
  const hasValidData =
    state.items.length > 0 &&
    regularPeople.length > 0 &&
    !hasEmptyPrices &&
    !hasItemsWithoutConsumers;

  if (!hasValidData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v5h5" />
              <path d="M21 12a9 9 0 0 0-9-9m0 0L3 12m9-9v9" />
            </svg>
            Summary
          </CardTitle>
          <CardDescription>
            Complete the items and consumer selection to see the summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <svg
              className="h-12 w-12 mx-auto mb-3 opacity-50"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="hsl(120, 25%, 45%)"
                stroke="hsl(120, 25%, 35%)"
                strokeWidth="2"
              />
              <g stroke="white" strokeWidth="2.5" fill="none">
                <line x1="20" y1="20" x2="20" y2="10" opacity="0.9" />
                <line x1="20" y1="20" x2="28.66" y2="26" opacity="0.9" />
                <line x1="20" y1="20" x2="11.34" y2="26" opacity="0.9" />
              </g>
              <circle cx="20" cy="10" r="2" fill="white" opacity="0.95" />
              <circle cx="28.66" cy="26" r="2" fill="white" opacity="0.95" />
              <circle cx="11.34" cy="26" r="2" fill="white" opacity="0.95" />
              <circle cx="20" cy="20" r="3" fill="white" opacity="0.9" />
              <text
                x="20"
                y="20"
                fill="hsl(120, 25%, 45%)"
                fontFamily="Arial, sans-serif"
                fontSize="4"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="central"
              >
                $
              </text>
            </svg>
            <p className="font-medium">Summary will appear here</p>
            <p className="text-sm">
              Add items and select consumers to see totals
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3v5h5" />
            <path d="M21 12a9 9 0 0 0-9-9m0 0L3 12m9-9v9" />
          </svg>
          Summary
        </CardTitle>
        <CardDescription>Bill breakdown and per-person totals</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bill Overview */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{regularPeople.length}</p>
            <p className="text-xs text-muted-foreground">People</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{state.items.length}</p>
            <p className="text-xs text-muted-foreground">Items</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <svg
                className="h-4 w-4 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(totals.grandTotal)}
            </p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>

        {/* Totals Breakdown */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax:</span>
            <span>{formatCurrency(state.overallTax)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Grand Total:</span>
            <span className="text-lg">{formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>

        {/* Per-Person Totals */}
        <div className="space-y-2 pt-4 border-t">
          <h4 className="font-medium text-sm">Per-Person Totals</h4>
          <div className="space-y-2">
            {totals.personTotals
              .filter(
                (person) =>
                  !state.people.find((p) => p.id === person.id)?.isExternal
              )
              .map((person) => (
                <div key={person.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{person.name}:</span>
                  <span className="font-medium">
                    {formatCurrency(person.total)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Payer Info */}
        {(() => {
          const payer = state.people.find((p) => p.id === state.payerId);
          if (payer) {
            return (
              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid by:</span>
                  <span className="font-medium">{payer.name}</span>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </CardContent>
    </Card>
  );
}
