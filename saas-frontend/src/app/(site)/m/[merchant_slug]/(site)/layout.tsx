import React from "react";
import { auth } from "@/lib/auth";
import { merchantIdFromSlug } from "../../_hooks/UseMerchantIdFromSlug";
import { isNullOrUndefined } from "@/lib/functions";
import UIContainer from "@/components/uicontainer";
import MerchantSidebarLayout from "./sidenav";
import MerchantTopBarLayout from "./MerchantTopBarLayout";

interface MerchantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ merchant_slug: string }>;
}

export default async function MerchantLayout({ children, params }: MerchantLayoutProps) {
  const session = await auth();
  const slug = (await params).merchant_slug;
  const { merchantId } = await merchantIdFromSlug(slug);

  if (!session?.user) {
    return <div>Please log in to access this page.</div>;
  }

  return (
    <UIContainer me={session.user}>
      <MerchantSidebarLayout
        merchantId={merchantId}
        user={isNullOrUndefined(session) ? undefined : session.user}
      >
        <MerchantTopBarLayout>
          {children}
        </MerchantTopBarLayout>
      </MerchantSidebarLayout>
    </UIContainer>
  );
}

