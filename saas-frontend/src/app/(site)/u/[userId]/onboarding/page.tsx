import { redirect } from "next/navigation";
import UI from "./ui";
import { auth } from "@/lib/auth";

async function OnboardingPage({ params } : { params: Promise<{ userId: string }> }) {
  const session = await auth();

  const { userId } = await params;

  if (session == null || !session.user) {
    return <></>
  }

  if (session.user.id !== userId) {
    redirect(`/`)
  }

  return (
    <UI userId={userId} />
  )
}

export default OnboardingPage;
