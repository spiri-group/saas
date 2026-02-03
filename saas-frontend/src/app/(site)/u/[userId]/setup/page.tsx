import { redirect } from "next/navigation";
import UI from "./ui";
import { auth } from "@/lib/auth";

async function SettingsPage({ params } : { params: Promise<{ userId: string }> }) {
  const session = await auth();
  
    const { userId } = await params;
  
    if (session == null || !session.user) {
      return <></>
    }

    if (session.user.id !== userId) {
        // if the user is not complete redirect them to the home page
        redirect(`/`)
    }
  
    return (
        <UI userId={userId} />
      )
  }
  
  export default SettingsPage;