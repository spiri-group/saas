'use client'

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useDeleteListing } from '../hooks/UseDeleteListing';
import { useDiscontinueListing } from '../hooks/UseDiscontinueListing';
import { toast } from 'sonner';

interface DeleteListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingName: string;
  vendorId: string;
}

export function DeleteListingDialog({
  open,
  onOpenChange,
  listingId,
  listingName,
  vendorId,
}: DeleteListingDialogProps) {
  const [deleteMode, setDeleteMode] = useState<'discontinue' | 'delete'>('discontinue');

  const deleteListing = useDeleteListing();
  const discontinueListing = useDiscontinueListing();

  const handleConfirm = async () => {
    try {
      if (deleteMode === 'discontinue') {
        const result = await discontinueListing.mutateAsync({ id: listingId, vendorId });
        toast.success(result.message || 'Listing discontinued successfully');
      } else {
        const result = await deleteListing.mutateAsync({ id: listingId, vendorId });
        toast.success(result.message || 'Listing deleted successfully');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete listing');
    }
  };

  const isLoading = deleteListing.isPending || discontinueListing.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Delete Listing</span>
          </DialogTitle>
          <DialogDescription className="pt-2">
            Are you sure you want to remove <strong>{listingName}</strong> from your catalogue?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="radio"
                name="deleteMode"
                value="discontinue"
                checked={deleteMode === 'discontinue'}
                onChange={() => setDeleteMode('discontinue')}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Discontinue (Recommended)</div>
                <div className="text-sm text-muted-foreground">
                  Hide from catalogue but keep the data. You can restore it later.
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="radio"
                name="deleteMode"
                value="delete"
                checked={deleteMode === 'delete'}
                onChange={() => setDeleteMode('delete')}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-red-600">Permanently Delete</div>
                <div className="text-sm text-muted-foreground">
                  This action cannot be undone. All data will be lost.
                </div>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={deleteMode === 'delete' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : deleteMode === 'delete' ? 'Delete Permanently' : 'Discontinue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteListingDialog;
