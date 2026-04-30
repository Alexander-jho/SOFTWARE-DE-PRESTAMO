import { differenceInDays, isAfter } from 'date-fns';
import { Loan, MoraConfig } from '../types';

export function calculateTotalToPay(principal: number, interestRate: number) {
  return principal * (1 + interestRate / 100);
}

export function calculateCurrentMora(loan: Loan, today: Date = new Date()) {
  const dueDate = new Date(loan.dueDate);
  if (!isAfter(today, dueDate) || loan.status === 'paid') {
    return 0;
  }

  const daysOverdue = differenceInDays(today, dueDate);
  if (daysOverdue <= 0) return 0;

  if (loan.moraConfig.type === 'fixed') {
    return loan.moraConfig.value;
  } else {
    // Daily mora
    return loan.moraConfig.value * daysOverdue;
  }
}

export function syncLoanStatus(loan: Loan, today: Date = new Date()): Partial<Loan> {
  const dueDate = new Date(loan.dueDate);
  const isOverdue = isAfter(today, dueDate);
  
  let newStatus = loan.status;
  if (loan.remainingBalance <= 0) {
    newStatus = 'paid';
  } else if (isOverdue) {
    newStatus = 'overdue';
  } else {
    newStatus = 'active';
  }

  const moraCharge = calculateCurrentMora(loan, today);
  
  return {
    status: newStatus,
    currentMoraCharge: moraCharge,
    // Note: In a real app, you might want to increase totalToPay when mora is applied
    // For this version, we'll keep principal interest + mora in the "total to pay" display
  };
}
