import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import UI from "./ui";

async function BookingsPage({ params }: { params: Promise<{ userId: string }> }) {
    const session = await auth();
    const { userId } = await params;

    if (session == null || !session.user) {
        redirect('/');
    }

    if (session.user.id !== userId) {
        redirect('/');
    }

    return <UI userId={userId} />;
}

export default BookingsPage;
