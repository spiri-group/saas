import UI from "./ui";
import UIContainer from "@/components/uicontainer";
import { auth } from "@/lib/auth";

async function SettingsPage({ params } : { params: Promise<{ customerId: string }> }) {
  const session = await auth();

  const { customerId } = await params;

  if (session == null || !session.user) {
    return <></>
  }

  return (
    <UIContainer me={session.user}>
        <UI userId={customerId} />
    </UIContainer>
    )
}

export default SettingsPage;