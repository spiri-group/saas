'use client';

import { Separator } from "@/components/ui/separator";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import useInterfaceSize from "@/components/ux/useInterfaceSize";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type PaymentLayoutProps = {
  open: boolean;
  className?: string;
  onOpenChange: (open: boolean) => void;
  paymentContent: React.ReactNode;
  children: React.ReactNode;
};

export function PaymentLayout({ open, onOpenChange, paymentContent, className, children }: PaymentLayoutProps) {
  const { isMobile } = useInterfaceSize();

  return (
     <div className={cn("relative flex w-full h-full min-h-0", className)}>
      <div className="flex-1 overflow-y-auto relative h-full min-h-0">{children}</div>

      {!isMobile && (
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
              className="h-full min-h-0 flex"
            >
              <Separator orientation="vertical" className="w-px mx-4" />
              <div className="w-[400px] h-full min-h-0 shrink-0 overflow-y-auto">
                {paymentContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {isMobile && (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="p-4 max-h-[85vh]">
            {paymentContent}
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
