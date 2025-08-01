export type UUID = string;

export type Person = {
  id: UUID;
  name: string;
  isExternal?: boolean; // for payer not in group
};

export type Item = {
  id: UUID;
  name: string;
  price: number; // pre-tax
  consumerIds: UUID[]; // non-empty
};

export type BillState = {
  people: Person[];
  payerId: UUID; // references a Person
  items: Item[];
  overallTax: number; // >= 0
};

export type PersonTotal = {
  id: UUID;
  name: string;
  total: number;
  items: {
    id: UUID;
    name: string;
    share: number;
  }[];
};

export type SplitwiseShare = {
  name: string;
  amount: number;
};

export type SplitwiseOutput = {
  shares: SplitwiseShare[];
  grandTotal: number;
  payerName: string;
};

export interface StoredSplit {
  id: string;
  timestamp: number;
  state: BillState;
  name: string; // Auto-generated name based on people and total
}
