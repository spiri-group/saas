import { auth } from "@/lib/auth"
import HomeContent from "./components/Home/HomeContent"

export default async function Home() {
  const session = await auth()

  return <HomeContent session={session} />
}