import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Search, Gift, Package, AlertTriangle } from "lucide-react";
import { UseTransactionHistory } from "../_hooks/UseTransactionHistory";
import Spinner from "@/components/ui/spinner";

interface TransactionHistoryProps {
  merchantId: string;
}

export default function TransactionHistory({ merchantId }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [reasonFilter, setReasonFilter] = useState("ALL");
  const [limit, ] = useState(50);

  const { data: transactions, isLoading, error } = UseTransactionHistory(merchantId, undefined, limit);

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'SALE':
        return <TrendingDown className="h-4 w-4 text-green-600" />;
      case 'RETURN':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'GIFTED':
        return <Gift className="h-4 w-4 text-purple-600" />;
      case 'RESTOCK':
        return <Package className="h-4 w-4 text-green-600" />;
      case 'DAMAGED':
      case 'LOST':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'FOUND':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getReasonBadge = (reason: string) => {
    const variants = {
      'SALE': { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      'RETURN': { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800' },
      'GIFTED': { variant: 'secondary' as const, className: 'bg-purple-100 text-purple-800' },
      'RESTOCK': { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      'DAMAGED': { variant: 'destructive' as const, className: '' },
      'LOST': { variant: 'destructive' as const, className: '' },
      'FOUND': { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      'ADJUSTMENT': { variant: 'secondary' as const, className: '' },
      'CORRECTION': { variant: 'outline' as const, className: '' },
    };

    const config = variants[reason as keyof typeof variants] || { variant: 'outline' as const, className: '' };
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {reason}
      </Badge>
    );
  };

  const getSourceBadge = (source?: string) => {
    if (!source) return null;
    
    const variants = {
      'ORDER': { variant: 'default' as const, className: 'bg-blue-100 text-blue-800' },
      'REFUND': { variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800' },
      'MANUAL': { variant: 'outline' as const, className: '' },
    };

    const config = variants[source as keyof typeof variants] || { variant: 'outline' as const, className: '' };
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {source}
      </Badge>
    );
  };

  // Filter transactions
  const filteredTransactions = transactions?.filter((transaction) => {
    const matchesSearch = !searchTerm || 
      transaction.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.variant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.recipient?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesReason = reasonFilter === "ALL" || transaction.reason === reasonFilter;
    
    return matchesSearch && matchesReason;
  }) || [];

  const reasonOptions = [
    "ALL", "SALE", "RETURN", "GIFTED", "RESTOCK", "DAMAGED", "LOST", "FOUND", "ADJUSTMENT", "CORRECTION"
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Error loading transaction history
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transaction History</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm || reasonFilter !== "ALL" ? "No transactions match your filters" : "No transactions found"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-center">Change</TableHead>
                <TableHead className="text-center">Before</TableHead>
                <TableHead className="text-center">After</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleTimeString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {transaction.product?.name || 'Unknown Product'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {transaction.variant?.name || 'Unknown Variant'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getReasonIcon(transaction.reason)}
                      {getReasonBadge(transaction.reason)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${transaction.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.delta > 0 ? '+' : ''}{transaction.delta}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {transaction.qty_before}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {transaction.qty_after}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {transaction.recipient && (
                        <div className="text-xs">
                          <span className="font-medium">To:</span> {transaction.recipient}
                        </div>
                      )}
                      {transaction.reference_id && (
                        <div className="text-xs text-muted-foreground">
                          Ref: {transaction.reference_id}
                        </div>
                      )}
                      {transaction.notes && (
                        <div className="text-xs text-muted-foreground">
                          {transaction.notes}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getSourceBadge(transaction.source)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}