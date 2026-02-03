import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import CrystalGuideUI from "./ui";

async function CrystalGuidePage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  const { userId } = await params;

  if (session == null || !session.user) {
    redirect('/');
  }

  if (session.user.id !== userId) {
    redirect('/');
  }

  return <CrystalGuideUI userId={userId} />;
}

export default CrystalGuidePage;
