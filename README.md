# SplitEasy

Split restaurant bills fairly when everyone ordered different things.

## What it does

You know that awkward moment when the check comes and everyone ordered different priced items? This fixes that. Just add who's there, what everyone ate, and the tax amount. It'll tell you exactly who owes what.

## Features

- Splits tax proportionally based on what each person ordered
- Handles the penny rounding so totals match perfectly
- Saves your splits so you can reference them later
- Works on your phone
- Light/dark mode

## Setup

```bash
npm install
npm run dev
```

Go to http://localhost:5173

## How to use

1. Add everyone's names
2. Pick who paid the bill
3. Add each item and mark who had it
4. Enter the tax amount
5. Done - everyone knows what they owe

## Example

4 people go to dinner:

- Shared appetizer: $12 (everyone)
- Alice's pasta: $16
- Bob's pizza: $14
- Your salad: $10
- Tax: $5.20

Result:

- Alice owes: $18.64
- Bob owes: $16.43
- You owe: $13.20
- Friend owes: $13.73

No more "let's just split it evenly" when you only had a salad.

## Built with

React + TypeScript + Tailwind CSS
