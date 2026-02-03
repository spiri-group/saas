import { redirect } from "next/navigation";
import UI from "./ui";
import { auth } from "@/lib/auth";

async function CompanionPage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  const { userId } = await params;

  if (session == null || !session.user) {
    redirect('/');
  }

  if (session.user.id !== userId) {
    redirect('/');
  }

  return <UI userId={userId} />;
}

export default CompanionPage;
