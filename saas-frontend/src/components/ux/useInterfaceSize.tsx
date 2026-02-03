import { useState, useEffect } from "react";

const useInterfaceSize = () => {
  const [breakpoint, setBreakpoint] = useState<string | null>(null);

  useEffect(() => {
    const breakpoints = {
      xs: "(min-width: 0px)",
      sm: "(min-width: 640px)",
      md: "(min-width: 768px)",
      lg: "(min-width: 1024px)",
      xl: "(min-width: 1280px)",
      "2xl": "(min-width: 1536px)",
      "3xl": "(min-width: 2560px)"
    } as Record<string, string>;

    const mediaQueryList = Object.entries(breakpoints).map(([size, query]) => ({
      size,
      mql: window.matchMedia(query),
    }));

    const getActiveBreakpoint = () => {
      const match = mediaQueryList
        .filter(({ mql }) => mql.matches)
        .pop();
      return match?.size ?? null;
    };

    const updateBreakpoint = () => {
      try {
        const current = getActiveBreakpoint();
        if (current !== breakpoint) setBreakpoint(current);
      } catch (err) {
        console.error("Error determining active breakpoint:", err);
      }
    };

    updateBreakpoint();
    mediaQueryList.forEach(({ mql }) => mql.addEventListener("change", updateBreakpoint));
    return () =>
      mediaQueryList.forEach(({ mql }) => mql.removeEventListener("change", updateBreakpoint));
  }, [breakpoint]);

  const isMobile = breakpoint === "xs" || breakpoint === "sm" || breakpoint === null;
  const isTablet = breakpoint === "md";
  const isDesktop = breakpoint && ["lg", "xl", "2xl", "3xl"].includes(breakpoint);

  return { breakpoint, isMobile, isTablet, isDesktop };
};

export default useInterfaceSize;
