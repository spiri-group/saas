'use client';

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import useInterfaceSize from "@/components/ux/useInterfaceSize";
import { useState } from "react";

type ResponsiveContainerProps = {
    children: React.ReactNode;
    content: (onClose: () => void) => React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({ 
    children, 
    content,
    open: controlledOpen,
    onOpenChange 
}) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const { isMobile } = useInterfaceSize();
    
    // Use controlled state if provided, otherwise use internal state
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    const handleClose = () => {
        setOpen(false);
    };

    if (!isMobile) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                    {content(handleClose)}
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                {children}
            </DrawerTrigger>
            <DrawerContent className="max-h-[80vh] flex flex-col">
                <div className="px-4 pb-4">
                    {content(handleClose)}
                </div>
            </DrawerContent>
        </Drawer>
    );
};

export default ResponsiveContainer;