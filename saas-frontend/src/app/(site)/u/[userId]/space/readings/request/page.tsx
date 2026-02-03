import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

async function RequestReadingPage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  const { userId } = await params;

  if (session == null || !session.user) {
    redirect('/');
  }

  // Redirect to personal space - SpiriReading is now accessed via dialog from sidenav
  redirect(`/u/${userId}/space`);
}

export default RequestReadingPage;
