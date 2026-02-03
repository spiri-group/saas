"use client"

import HomeSearch from "./HomeSearch"
import SpiriLogo from "@/icons/spiri-logo"
import TikTokIcon from "@/icons/social/TikTokIcon"
import InstagramIcon from "@/icons/social/InstagramIcon"
import FacebookIcon from "@/icons/social/FacebookIcon"
import { IconStyle } from "@/icons/shared/types"
import { SignIn } from "@/components/ux/SignIn"
import { Session } from "next-auth"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { UserCircle } from "lucide-react"
import UseUserComplete from "../../c/[customerId]/settings/hooks/UseUserComplete"
import { VendorDocType } from "@/utils/spiriverse"

interface HomeContentProps {
  session: Session | null
}

export default function HomeContent({ session: initialSession }: HomeContentProps) {
  // Use client-side session which updates after sign-in
  const { data: clientSession } = useSession()

  // Use client session if available (after sign-in), otherwise use initial server session
  const session = clientSession || initialSession

  const isLoggedIn = !!session?.user
  const vendors = session?.user?.vendors || []
  const hasVendors = vendors.length > 0

  // Fetch user completion status client-side (will auto-update when session changes)
  const userCompleteQuery = UseUserComplete(session?.user?.id || "")
  const needsProfileCompletion = isLoggedIn && userCompleteQuery.data?.requiresInput === true

  // Logged-in users see search-first layout
  if (isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 relative">
        <div className="flex flex-col items-center max-w-3xl w-full space-y-4 md:space-y-6">

          {/* Logo */}
          <div className="flex justify-center mb-1 md:mb-2">
            <Link href="/">
              <SpiriLogo height={80} className="h-20 md:h-[100px]" />
            </Link>
          </div>

          {/* Welcome */}
          <p className="text-white/90 text-lg font-light">
            Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}
          </p>

          {/* Search */}
          <div className="w-full max-w-2xl">
            <HomeSearch />
          </div>

          {/* Profile completion prompt */}
          {needsProfileCompletion && (
            <Link
              href={`/u/${session?.user?.id}/setup`}
              className="w-full max-w-md px-6 py-4 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-500/30 hover:to-amber-500/30 transition-all duration-300 border-2 border-yellow-400/50 hover:border-yellow-400/70 backdrop-blur-sm"
            >
              <div className="flex items-center justify-center gap-3">
                <UserCircle className="h-6 w-6 text-yellow-300" />
                <p className="text-white font-medium text-lg">Complete Your Profile</p>
              </div>
            </Link>
          )}

          {/* Quick nav */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {!needsProfileCompletion && (
              <Link href={`/u/${session?.user?.id}/space`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  My Space
                </Button>
              </Link>
            )}
            {hasVendors && vendors.slice(0, 2).map((vendor) => {
              const isPractitioner = vendor.docType === VendorDocType.PRACTITIONER
              const href = isPractitioner
                ? `/p/${vendor.slug || vendor.id}/manage`
                : `/m/${vendor.slug || vendor.id}`
              return (
                <Link key={vendor.id} href={href}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    {vendor.name || 'Your Space'}
                  </Button>
                </Link>
              )
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-white/40 hover:text-white hover:bg-white/10 text-xs"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Logged-out: original welcome/search UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 relative">

      {/* Main sacred content */}
      <div className="flex flex-col items-center max-w-3xl w-full space-y-4 md:space-y-6">

        {/* Logo */}
        <div className="flex justify-center mb-1 md:mb-2">
          <SpiriLogo height={80} className="h-20 md:h-[100px]" />
        </div>

        {/* Tagline */}
        <div className="text-center space-y-2 md:space-y-4">
          <h1 className="text-2xl md:text-4xl text-white font-light tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            Your Bridge to Spiritual Living
          </h1>
          <p className="text-base md:text-xl text-slate-200 font-light italic max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            A sacred digital space connecting energy, faith, and creativity.
          </p>
        </div>

        {/* Learn More & Blog Links */}
        <div className="flex items-center gap-3">
          <Link href="/learn-more">
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
            >
              Learn More
            </Button>
          </Link>
          <Link href="/blog">
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
            >
              Visit Blog
            </Button>
          </Link>
        </div>

        {/* Social Media Links */}
        <div className="flex items-center justify-center gap-3 md:gap-6">
          <a
            href="https://www.tiktok.com/@spiriverse"
            target="_blank"
            rel="noopener noreferrer"
            className="group transition-all hover:scale-110"
            aria-label="Follow us on TikTok"
          >
            <div className="opacity-70 group-hover:opacity-100 transition-opacity">
              <TikTokIcon mode={IconStyle.Fill} height={28} className="h-7 md:h-[40px]" />
            </div>
          </a>
          <a
            href="https://www.instagram.com/spiri_verse/"
            target="_blank"
            rel="noopener noreferrer"
            className="group transition-all hover:scale-110"
            aria-label="Follow us on Instagram"
          >
            <div className="opacity-70 group-hover:opacity-100 transition-opacity">
              <InstagramIcon mode={IconStyle.Fill} height={28} className="h-7 md:h-[40px]" />
            </div>
          </a>
          <a
            href="https://www.facebook.com/SpiriVerse"
            target="_blank"
            rel="noopener noreferrer"
            className="group transition-all hover:scale-110"
            aria-label="Follow us on Facebook"
          >
            <div className="opacity-70 group-hover:opacity-100 transition-opacity">
              <FacebookIcon mode={IconStyle.Fill} height={28} className="h-7 md:h-[40px]" />
            </div>
          </a>
        </div>

        {/* Sacred search portal */}
        <div className="w-full max-w-2xl pt-1 md:pt-2">
          <HomeSearch />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 md:gap-4 w-full max-w-md py-3 md:py-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <span className="text-white/60 text-sm font-light">or</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>

        {/* Sacred sign in / sign up */}
        <div className="flex flex-col items-center gap-3 md:gap-4 w-full max-w-md">
          <p className="text-white/80 text-sm font-light">Begin your journey</p>
          <div className="w-full">
            <SignIn />
          </div>
        </div>

      </div>
    </div>
  )
}
