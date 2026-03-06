'use client';

import UI from "./ui"
import { SignIn } from "@/components/ux/SignIn"
import ComingSoonVisibility from "@/app/coming-soon/hider";
import { useSession } from "next-auth/react";

export default function UserAvatar() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (!session?.user) {
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
