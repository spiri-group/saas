import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UsePaymentsEnabled from "../_hooks/UsePaymentsEnabled";
import { Button } from "@/components/ui/button";
import { escape_key } from '@/lib/functions';
import { useRouter } from 'next/navigation';
import VisuallyHidden from '@/components/ux/VisuallyHidden';
import { DialogDescription } from '@radix-ui/react-dialog';
import UseLocationsConfigured from '../_hooks/UseLocationsConfigured';

type WithPaymentsEnabledProps = {
  merchantId: string;
};

type BankingInfoDialogContentProps = {
  handleClose: () => void;
}

// Extract common Dialog content into a separate component
const BankingInfoDialogContent: React.FC<BankingInfoDialogContentProps> = (props) => (
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Banking Information Required</DialogTitle>
    </DialogHeader>
    <div className="p-4">
      <p className="text-sm">To continue, you need to set up your banking information to receive payouts.</p>
      <p className="text-xl font-bold text-accent">Go to Banking &gt; Accounts</p>
    </div>
    <DialogFooter>
      <Button className="w-full" 
        onClick={props.handleClose}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
);

const LocationNotConfiguredDialogContent: React.FC<BankingInfoDialogContentProps> = (props) => (
  <DialogContent className="w-[500px]">
    <DialogHeader>
      <DialogTitle>Locations not configured</DialogTitle>
    </DialogHeader>
    <div className="p-4">
      <p className="text-sm mb-2">To continue, you need to set up your locations to create a listing (Product, Tour, Service etc)</p>
      <p className="text-xl font-bold text-accent">Go to Profile &gt; Customise &gt; Locations</p>
    </div>
    <DialogFooter>
      <Button className="w-full" onClick={props.handleClose}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
);

type WithPaymentsEnabledOptions = {
  requireLocations?: boolean; // Default true, set to false for services
};

const
withPaymentsEnabled = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithPaymentsEnabledOptions = { requireLocations: true }
): React.FC<P & WithPaymentsEnabledProps> => {
  const InternalComponent: React.FC<WithPaymentsEnabledProps & P> = ({ merchantId, ...props }) => {
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [isDialogAlreadyOpen, setIsDialogAlreadyOpen] = React.useState(false);

    useEffect(() => {
      setDialogOpen(true);
      // Check if a dialog is already open (client-side only)
      setIsDialogAlreadyOpen(document.querySelector("[data-state='open']") !== null);
    }, []);

    const paymentsEnabled = UsePaymentsEnabled(merchantId);
    // Only check locations if required (not needed for services)
    const locationsConfigured = UseLocationsConfigured(merchantId);
    const skipLocationCheck = options.requireLocations === false;

    const handleClose = (nav_path?: string[]) => {
      if (isDialogAlreadyOpen) {
        escape_key();
        if (nav_path) {
          const event = new CustomEvent("open-nav-external", {
              detail: {
                  path: nav_path,
                  action: {
                      type: "expand"
                  }
              }
          });
          window.dispatchEvent(event);
        }
      } else {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(`/m/${merchantId}/profile`);
        }
      }
    };

    // Check loading state - skip location loading if not required
    const isLoading = (paymentsEnabled.isLoading || paymentsEnabled.data == null)
      || (!skipLocationCheck && (locationsConfigured.isLoading || locationsConfigured.data == null));

    if (isLoading) {
      if (isDialogAlreadyOpen) {
        return (
          <DialogContent>
            <VisuallyHidden>
              <DialogTitle>Checking banking information available</DialogTitle>
              <DialogDescription>Doing a pre-check as to whether you have set up your banking information yet. This is required to recieve payouts.</DialogDescription>
            </VisuallyHidden>
          </DialogContent>
        )
      } else {
        return <></>;
      }
    }

    // Only check locations if required (skip for services)
    if (!skipLocationCheck && !locationsConfigured.data) {
      if (isDialogAlreadyOpen) {
        // Render only the content when a dialog is already open
        return <LocationNotConfiguredDialogContent
                  handleClose={() => {
                    handleClose(["Profile", "Customise"]);
                  }}
                />;
      }

      // Render the full Dialog with the content when no dialog is open
      return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <LocationNotConfiguredDialogContent
            handleClose={() => {
              handleClose(["Profile", "Customise"]);
            }}
            />
        </Dialog>
      );
    }

    if (paymentsEnabled.data) {
      return <WrappedComponent {...(props as P)} merchantId={merchantId} />;
    } else {
      if (isDialogAlreadyOpen) {
        // Render only the content when a dialog is already open
        return <BankingInfoDialogContent 
                  handleClose={() => {
                    handleClose(["Banking"]);
                  }}
                />;
      }

      // Render the full Dialog with the content when no dialog is open
      return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <BankingInfoDialogContent
            handleClose={() => {
              handleClose(["Banking"]);
            }}
            />
        </Dialog>
      );
    }
  };
  InternalComponent.displayName = `withPaymentsEnabled(${WrappedComponent.displayName || WrappedComponent.name})`;

  return InternalComponent;
};

withPaymentsEnabled.displayName = 'withPaymentsEnabled';

export default withPaymentsEnabled;