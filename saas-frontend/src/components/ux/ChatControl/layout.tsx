'use client';

import { Separator } from "@/components/ui/separator";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import useInterfaceSize from "@/components/ux/useInterfaceSize";
import ChatControl, { ChatControlProps } from ".";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type ChatLayoutProps = {
  open: boolean;
  className?: string;
  onOpenChange: (open: boolean) => void;
  chatProps: ChatControlProps;
  children: React.ReactNode; // ← this was missing
};

export function ChatLayout({ open, onOpenChange, chatProps, className, children }: ChatLayoutProps) {
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
              <div className="w-[320px] h-full min-h-0 shrink-0">
                <ChatControl {...chatProps} className="h-full min-h-0" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {isMobile && (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="p-2">
            <ChatControl {...chatProps} className="h-[80vh]" />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
