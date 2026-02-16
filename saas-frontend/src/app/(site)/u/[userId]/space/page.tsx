import { Metadata } from "next";
import UI from "./ui";

export const metadata: Metadata = {
  title: "My Journey | SpiriVerse",
  description: "Your sacred digital space for spiritual growth and exploration.",
};

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function PersonalSpacePage({ params }: Props) {
  const { userId } = await params;
  return <UI userId={userId} />;
}
