import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Search, AlertTriangle, Star } from "lucide-react";
import { UseInventoryItems } from "../_hooks/UseInventoryOverview";
import Spinner from "@/components/ui/spinner";
import useDebounce from "@/components/ux/UseDebounce";

interface ProductInventoryTableProps {
  merchantId: string;
  onAdjustInventory: (variantId?: string) => void;
}

export default function ProductInventoryTable({ 
  merchantId, 
  onAdjustInventory 
}: ProductInventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { query } = UseInventoryItems(merchantId, "default", debouncedSearch);
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Flatten all pages into single array
  const allItems = data?.pages.flatMap(page => page.items) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Inventory</CardTitle>
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
          <CardTitle>Current Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Error loading inventory data
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Out of Stock
        </Badge>;
      case 'LOW_STOCK':
        return <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3" />
          Low Stock
        </Badge>;
      default:
        return <Badge variant="default" className="bg-green-100 text-green-800">
          In Stock
        </Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Current Inventory</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {allItems.length === 0 && !isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            {debouncedSearch ? "No products match your search" : "No inventory data available"}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-center">On Hand</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead className="text-center">Committed</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.map((item) => (
                  <TableRow key={`${item.product_id}-${item.variant_id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.product_name}</span>
                        {item.is_ooak && (
                          <span title="One-of-a-Kind">
                            <Star className="h-4 w-4 text-purple-600" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{item.variant_name}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-medium">{item.qty_on_hand}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAdjustInventory(item.variant_id)}
                          className="gap-1 h-6 px-2 text-xs"
                        >
                          <Edit className="h-3 w-3" />
                          Adjust
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-medium ${item.qty_available <= 0 ? 'text-red-600' : 
                        item.qty_available <= (item.low_stock_threshold || 5) ? 'text-yellow-600' : 'text-green-600'}`}>
                        {item.qty_available}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-muted-foreground">{item.qty_committed}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(item.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Infinite scroll trigger */}
            {hasNextPage && (
              <div ref={loadMoreRef} className="flex items-center justify-center py-4">
                {isFetchingNextPage ? (
                  <Spinner />
                ) : (
                  <div className="text-sm text-muted-foreground">Scroll for more items...</div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}