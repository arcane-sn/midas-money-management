export interface AccountBalance {
  kind: 'assets' | 'liabilities';
  balance: number;
}

export interface NetWorth {
  assetsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
}

export function computeNetWorth(accountsList: readonly AccountBalance[]): NetWorth {
  const assetsTotal = accountsList.filter((a) => a.kind === 'assets').reduce((sum, a) => sum + a.balance, 0);
  const liabilitiesTotal = accountsList.filter((a) => a.kind === 'liabilities').reduce((sum, a) => sum + a.balance, 0);
  return { assetsTotal, liabilitiesTotal, netWorth: assetsTotal + liabilitiesTotal };
}
