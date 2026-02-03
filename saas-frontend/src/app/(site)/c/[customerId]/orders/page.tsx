import UIContainer from "@/components/uicontainer";
import { auth } from "@/lib/auth";
import UI from "./ui";

async function OrdersPage() {
  const session = await auth();

  if (session == null || !session.user) {
    return <></>
  }

  return (
    <UIContainer me={session.user}>
        <UI userEmail={session.user.email} />
    </UIContainer>
    )
}

export default OrdersPage;