'use server';

import UI from "./ui"
import { SignIn } from "@/components/ux/SignIn"
import { auth } from "@/lib/auth";
import ComingSoonVisibility from "@/app/coming-soon/hider";

export default async function UserAvatar() {
  const session = await auth();

  if (session == null || !session.user) {
    return (
      <ComingSoonVisibility hide={true}>
        <SignIn />
      </ComingSoonVisibility>
    )
  }

  return (
      <ComingSoonVisibility hide={true}>
        <UI user={session.user} />
      </ComingSoonVisibility>
  )
}
