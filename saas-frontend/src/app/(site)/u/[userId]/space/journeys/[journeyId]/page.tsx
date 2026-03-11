import { redirect } from "next/navigation";
import UI from "./ui";
import { auth } from "@/lib/auth";

async function JourneyPlayerPage({ params }: { params: Promise<{ userId: string; journeyId: string }> }) {
  const session = await auth();
  const { userId, journeyId } = await params;

  if (session == null || !session.user) {
    redirect('/');
  }

  if (session.user.id !== userId) {
    redirect('/');
  }

  return <UI userId={userId} journeyId={journeyId} />;
}

export default JourneyPlayerPage;
