"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-center"
      duration={5000}
      richColors={true} // force richColors to always apply
      className={cn("z-[70]", props.className)} // combine className safely
      {...props} // place after richColors so it doesn't override it
    />
  );
};

export { Toaster };
