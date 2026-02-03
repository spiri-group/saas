import { redirect } from "next/navigation";
import UI from "./ui";
import { auth } from "@/lib/auth";

interface PageProps {
  params: Promise<{ merchant_slug: string }>;
}

async function SpiriReadingsPage({ params }: PageProps) {
  const session = await auth();
  const { merchant_slug } = await params;

  if (session == null || !session.user) {
    redirect('/');
  }

  // Find the merchant in the user's vendors
  const merchant = session.user.vendors?.find(v => v.slug === merchant_slug);
  if (!merchant) {
    redirect('/');
  }

  return <UI merchantId={merchant.id} />;
}

export default SpiriReadingsPage;
