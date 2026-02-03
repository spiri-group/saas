import { Metadata } from "next";
import UI from "./ui";

export const metadata: Metadata = {
  title: "My Card Symbols | SpiriVerse",
  description: "Define your personal meanings for tarot cards",
};

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function MyCardSymbolsPage({ params }: Props) {
  const { userId } = await params;
  return <UI userId={userId} />;
}
