export type LoanStatus = 'active' | 'overdue' | 'paid';

export interface MoraConfig {
  type: 'fixed' | 'daily';
  value: number;
}

export interface Loan {
  id: string;
  clientName: string;
  clientPhoto?: string;
  principal: number;
  interestRate: number;
  totalToPay: number;
  remainingBalance: number;
  totalPaid: number;
  startDate: string;
  dueDate: string;
  status: LoanStatus;
  moraConfig: MoraConfig;
  currentMoraCharge: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface AppConfig {
  availableRates: number[];
  defaultMora: MoraConfig;
  defaultLoanDays: number;
}
