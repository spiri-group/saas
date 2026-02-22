'use client';

import { Button } from "@/components/ui/button";
import { useUnifiedCart, UNIFIED_CART_EVENT } from "./useUnifiedCart";
import { ShoppingBasketIcon } from "lucide-react";
import { useEffect, useState } from "react";
import DetailedShoppingCart, { TOGGLE_DETAILED_CART } from "./Detailed";
import useEventDispatcher from "@/components/utils/Events/UseEventDispatcher";
import UseEventListener from "@/components/utils/Events/UseEventListener";
import { motion, useAnimation } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

const Nav: React.FC = () => {
    const [mounted, setMounted] = useState(false);
    const { data: session } = useSession();
    const { totalItems } = useUnifiedCart();
    const toggleCartVisibility = useEventDispatcher(TOGGLE_DETAILED_CART);
    const controls = useAnimation();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Animate cart icon when items change
    UseEventListener(UNIFIED_CART_EVENT, () => {
        controls.start({
            rotate: [0, -10, 10, -10, 10, 0],
            transition: { duration: 0.5 }
        });
    });

    if (!mounted || !session?.user) return null;

    return (
        <>
        <Button
            variant="ghost"
            className="group relative h-full my-4"
            onClick={toggleCartVisibility}
            aria-label="Shopping cart"
            data-testid="cart-button"
        >
            <motion.div animate={controls}>
                <ShoppingBasketIcon className="text-white" size={44} />
            </motion.div>
            {totalItems > 0 && (
                <div
                    className={cn(
                        "absolute bottom-2 right-2 text-xs rounded-full h-8 w-8 flex items-center justify-center",
                        "group-hover:bg-black bg-red-500"
                    )}
                    data-testid="cart-count"
                >
                    {totalItems > 99 ? '99+' : totalItems}
                </div>
            )}
        </Button>
        <DetailedShoppingCart />
        </>
    );
};

export default Nav;
