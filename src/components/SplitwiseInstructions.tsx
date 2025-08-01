import React, { useState, useEffect } from "react";
import { Copy, Check, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { BillState } from "@/lib/types";
import { buildSplitwiseShares, generateSplitwiseText } from "@/lib/calc";
import { copyToClipboard } from "@/lib/utils";

interface SplitwiseInstructionsProps {
  state: BillState;
}

export function SplitwiseInstructions({ state }: SplitwiseInstructionsProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const splitwiseOutput = buildSplitwiseShares(state);
  const instructionText = generateSplitwiseText(splitwiseOutput);

  const handleCopy = async () => {
    try {
      const success = await copyToClipboard(instructionText);
      if (success) {
        setCopied(true);
        setCopyError(false);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopyError(true);
        setTimeout(() => setCopyError(false), 2000);
      }
    } catch (error) {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2000);
    }
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "c" &&
        e.target === document.body
      ) {
        // Only trigger if focus is not in an input
        const activeElement = document.activeElement;
        if (
          activeElement?.tagName !== "INPUT" &&
          activeElement?.tagName !== "TEXTAREA" &&
          activeElement?.tagName !== "SELECT"
        ) {
          e.preventDefault();
          handleCopy();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [instructionText]);

  if (state.items.length === 0 || splitwiseOutput.shares.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Splitwise Instructions
          </CardTitle>
          <CardDescription>
            Copy-ready instructions for Splitwise will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Add items to generate Splitwise instructions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Splitwise Instructions
        </CardTitle>
        <CardDescription>
          Copy this text and paste it into Splitwise to create the expense
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Instructions</label>
            <Button
              onClick={handleCopy}
              variant={
                copied ? "default" : copyError ? "destructive" : "outline"
              }
              size="sm"
              className="text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied!
                </>
              ) : copyError ? (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy failed
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <Textarea
            value={instructionText}
            readOnly
            className="font-mono text-sm min-h-[200px] resize-none"
            onClick={(e) => {
              // Select all text when clicking on the textarea
              (e.target as HTMLTextAreaElement).select();
            }}
          />
        </div>

        {/* Summary */}
        <div className="border-t pt-4 space-y-2">
          <h4 className="font-medium text-sm">Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total:</span>
              <span className="ml-2 font-semibold">
                ${splitwiseOutput.grandTotal.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Paid by:</span>
              <span className="ml-2 font-semibold">
                {splitwiseOutput.payerName}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-muted-foreground text-sm">
              Shares ({splitwiseOutput.shares.length} people):
            </span>
            <div className="mt-1 space-y-1">
              {splitwiseOutput.shares.map((share, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{share.name}</span>
                  <span className="font-medium">
                    ${share.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Tips:</p>
          <ul className="space-y-1 ml-2">
            <li>• Press Ctrl/Cmd+C to copy when this card is focused</li>
            <li>• Click the textarea to select all text</li>
            <li>
              • In Splitwise, create a new expense and set it to "Unequal
              shares"
            </li>
            <li>• Enter the amounts manually for each person</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
