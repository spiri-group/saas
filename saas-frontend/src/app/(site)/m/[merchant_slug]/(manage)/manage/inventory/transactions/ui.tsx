"use client";

import withProtection from "@/components/ux/HOC/withProtection";
import HasMerchantAccess from "../../../../../_hooks/HasMerchantAccess";
import TransactionHistory from "../_components/TransactionHistory";

interface TransactionsUIProps {
  merchantId: string;
}

const TransactionsUIComponent = ({ merchantId }: TransactionsUIProps) => {
  return (
    <div className="space-y-6 m-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Transactions</h1>
          <p className="text-muted-foreground">
            Complete audit trail of all inventory changes
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <TransactionHistory merchantId={merchantId} />
    </div>
  );
}

const TransactionsUI = withProtection<TransactionsUIProps>(TransactionsUIComponent, HasMerchantAccess);

export default TransactionsUI;