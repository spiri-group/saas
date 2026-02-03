'use client';

import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

export function SignOut() {
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    try {
      // Call NextAuth's signOut function
      await signOut({ callbackUrl: '/' });

      // Invalidate the TanStack Query cache after signing out
      queryClient.invalidateQueries({
        queryKey: ['user-me-contact', 'user-me-nav', 'setup-me'],
      }); // Or specify keys if needed
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleSignOut}
      className="text-white text-xs md:text-sm"
    >
      Sign Out
    </Button>
  );
}
