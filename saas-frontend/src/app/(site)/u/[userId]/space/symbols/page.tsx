import UI from "./ui";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Symbols | SpiriVerse",
  description: "Your personal symbol dictionary and patterns",
};

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function SymbolsPage({ params }: Props) {
  const { userId } = await params;
  return <UI userId={userId} />;
}
