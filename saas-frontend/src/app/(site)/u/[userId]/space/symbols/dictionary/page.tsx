import { Metadata } from "next";
import UI from "./ui";

export const metadata: Metadata = {
  title: "Symbol Dictionary | SpiriVerse",
  description: "Your personal symbol dictionary and meanings",
};

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function SymbolDictionaryPage({ params }: Props) {
  const { userId } = await params;
  return <UI userId={userId} />;
}
