'use server';

import UI from "./ui"
import { SignOut } from "@/components/ux/SignOut"
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
      <div className="flex flex-row">
          <ComingSoonVisibility hide={true}>
            <UI user={session.user} />
            <SignOut />
          </ComingSoonVisibility>
      </div>
  )
}