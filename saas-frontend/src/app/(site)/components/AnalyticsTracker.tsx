"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const ANALYTICS_ENDPOINT =
    process.env.NEXT_PUBLIC_ANALYTICS_URL ||
    (process.env.NEXT_PUBLIC_graphql_proxy
        ? process.env.NEXT_PUBLIC_graphql_proxy.replace("/api/graphql", "/api/analytics-track")
        : "/api/analytics-track");

function getSessionId(): string {
    if (typeof window === "undefined") return "";
    let id = sessionStorage.getItem("sv_sid");
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem("sv_sid", id);
    }
    return id;
}

function sendBeaconEvent(url: string, scrollDepth: number, timeOnPage: number, searchParams: ReturnType<typeof useSearchParams>) {
    const payload = {
        sessionId: getSessionId(),
        url,
        referrer: document.referrer,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        utmSource: searchParams?.get("utm_source") || undefined,
        utmMedium: searchParams?.get("utm_medium") || undefined,
        utmCampaign: searchParams?.get("utm_campaign") || undefined,
        utmTerm: searchParams?.get("utm_term") || undefined,
        utmContent: searchParams?.get("utm_content") || undefined,
        eventType: "pageleave",
        scrollDepth,
        timeOnPage,
    };
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
        navigator.sendBeacon(ANALYTICS_ENDPOINT, new Blob([body], { type: "application/json" }));
    } else {
        fetch(ANALYTICS_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
        }).catch(() => {});
    }
}

export default function AnalyticsTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const pageEnteredAt = useRef<number>(Date.now());
    const maxScrollDepth = useRef<number>(0);
    const currentPath = useRef<string>("");
    const hasLeftPage = useRef<boolean>(false);

    const sendPageview = useCallback(
        (url: string) => {
            const payload = {
                sessionId: getSessionId(),
                url,
                referrer: document.referrer,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                utmSource: searchParams?.get("utm_source") || undefined,
                utmMedium: searchParams?.get("utm_medium") || undefined,
                utmCampaign: searchParams?.get("utm_campaign") || undefined,
                utmTerm: searchParams?.get("utm_term") || undefined,
                utmContent: searchParams?.get("utm_content") || undefined,
                eventType: "pageview",
            };

            fetch(ANALYTICS_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true,
            }).catch(() => {});
        },
        [searchParams]
    );

    const sendPageLeave = useCallback(() => {
        if (hasLeftPage.current) return; // Prevent duplicate pageleave
        hasLeftPage.current = true;

        const timeOnPage = Math.round((Date.now() - pageEnteredAt.current) / 1000);
        sendBeaconEvent(currentPath.current, maxScrollDepth.current, timeOnPage, searchParams);
    }, [searchParams]);

    // Track scroll depth
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (docHeight > 0) {
                const depth = Math.min(100, Math.round((scrollTop / docHeight) * 100));
                if (depth > maxScrollDepth.current) {
                    maxScrollDepth.current = depth;
                }
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Track page views on route change + send pageleave for previous page
    useEffect(() => {
        const newPath = pathname || "/";

        // Send pageleave for the previous page (SPA navigation)
        if (currentPath.current && currentPath.current !== newPath) {
            const timeOnPage = Math.round((Date.now() - pageEnteredAt.current) / 1000);
            sendBeaconEvent(currentPath.current, maxScrollDepth.current, timeOnPage, searchParams);
        }

        // Reset for new page
        currentPath.current = newPath;
        pageEnteredAt.current = Date.now();
        maxScrollDepth.current = 0;
        hasLeftPage.current = false;

        sendPageview(newPath);
    }, [pathname, sendPageview, searchParams]);

    // Track page leave on visibility change / beforeunload
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                sendPageLeave();
            } else if (document.visibilityState === "visible") {
                // User came back - allow future pageleave events
                hasLeftPage.current = false;
            }
        };

        const handleBeforeUnload = () => {
            sendPageLeave();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [sendPageLeave]);

    return null;
}
