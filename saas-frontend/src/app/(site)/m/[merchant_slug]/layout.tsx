import MerchantSideNav from "../_components/sidenav";
import { merchantIdFromSlug } from "../_hooks/UseMerchantIdFromSlug";
import { auth } from "@/lib/auth";
import HasMerchantAccess from "../_hooks/HasMerchantAccess";
import ViewModeToggle from "../_components/ViewModeToggle";
import LayoutContent from "../_components/LayoutContent";
import { Suspense } from "react";

export default async function Layout({ children, params}) {
    const session = await auth();

    const {merchant_slug} = await params;

    const {merchantId} = await merchantIdFromSlug(merchant_slug);

    if (!session) {
        return <></>
    }

    // If merchantId is null/undefined, the slug doesn't exist - don't render merchant components
    if (!merchantId) {
        return (
            <Suspense fallback={null}>
                <LayoutContent merchantAccessGranted={false}>
                    {children}
                </LayoutContent>
            </Suspense>
        )
    }

    const merchantAccessGranted = HasMerchantAccess(session, {
        merchantId: merchantId
    })

    return (
        <>
            <Suspense fallback={null}>
                <MerchantSideNav
                    session={session}
                    merchantId={merchantId}
                    merchantSlug={merchant_slug}
                />
            </Suspense>
            <Suspense fallback={null}>
                <ViewModeToggle
                    session={session}
                    merchantId={merchantId}
                />
            </Suspense>
            <Suspense fallback={null}>
                <LayoutContent
                    merchantAccessGranted={merchantAccessGranted}
                >
                    {children}
                </LayoutContent>
            </Suspense>
        </>
    )
}