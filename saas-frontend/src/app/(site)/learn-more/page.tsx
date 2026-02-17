import { Metadata } from "next"
import LearnMoreContent from "./LearnMoreContent"
import { getAllPosts, serializePost } from "@/lib/blog/posts"

const baseUrl = "https://www.spiriverse.com"
const pageUrl = `${baseUrl}/learn-more`
const ogImage = `${baseUrl}/blog/og-default.png`

const title = "SpiriVerse – Spiritual Marketplace for Practitioners & Seekers"
const description =
  "Join SpiriVerse, the sacred digital marketplace connecting spiritual practitioners with seekers. Sell products, book services, and grow your healing practice online."

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "spiritual marketplace",
    "spiritual practitioners",
    "holistic healing",
    "energy healing",
    "tarot readings",
    "astrology",
    "meditation",
    "spiritual business",
    "online healing platform",
    "book spiritual services",
  ],
  openGraph: {
    type: "website",
    url: pageUrl,
    title,
    description,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "SpiriVerse – Spiritual Marketplace",
      },
    ],
    siteName: "SpiriVerse",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
    creator: "@spiriverse",
  },
  alternates: {
    canonical: pageUrl,
  },
  other: {
    "ld+json": JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        description,
        url: pageUrl,
        publisher: {
          "@type": "Organization",
          name: "SpiriVerse",
          url: baseUrl,
          logo: {
            "@type": "ImageObject",
            url: `${baseUrl}/spiriverse-logo.png`,
          },
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "SpiriVerse",
        url: baseUrl,
        logo: `${baseUrl}/spiriverse-logo.png`,
        sameAs: [
          "https://www.tiktok.com/@spiriverse",
          "https://www.instagram.com/spiri_verse/",
          "https://www.facebook.com/SpiriVerse",
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: baseUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Learn More",
            item: pageUrl,
          },
        ],
      },
    ]),
  },
}

export default async function LearnMorePage() {
  const allPosts = await getAllPosts()
  // Get the 3 most recent posts
  const recentPosts = allPosts.slice(0, 3).map(serializePost)

  return <LearnMoreContent blogPosts={recentPosts} />
}
