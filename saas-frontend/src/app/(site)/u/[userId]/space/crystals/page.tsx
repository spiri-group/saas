import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

async function CrystalsPage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  const { userId } = await params;

  if (session == null || !session.user) {
    redirect('/');
  }

  if (session.user.id !== userId) {
    redirect('/');
  }

  // Redirect to collection as the default landing page
  redirect(`/u/${userId}/space/crystals/collection`);
}

export default CrystalsPage;
