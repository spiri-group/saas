import LearnMoreContent from "./LearnMoreContent"
import { getAllPosts, serializePost } from "@/lib/blog/posts"

export const metadata = {
  title: "Learn More | SpiriVerse",
  description: "Discover how SpiriVerse creates a bridge to spiritual living. Join our community of spiritual practitioners and connect with seekers worldwide.",
}

export default async function LearnMorePage() {
  const allPosts = await getAllPosts()
  // Get the 3 most recent posts
  const recentPosts = allPosts.slice(0, 3).map(serializePost)

  return <LearnMoreContent blogPosts={recentPosts} />
}
