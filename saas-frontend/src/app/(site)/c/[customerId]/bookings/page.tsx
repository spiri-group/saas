import { auth } from "@/lib/auth";
import UI from "./ui";
import UIContainer from "@/components/uicontainer";

async function BookingsPage(params) {
  const session = await auth();

  if (session == null || !session.user) {
    return <></>
  }
    
  return (
      <UIContainer me={session.user}>
        <UI userId={params.customerId} />
      </UIContainer>
    )
}

export default BookingsPage;