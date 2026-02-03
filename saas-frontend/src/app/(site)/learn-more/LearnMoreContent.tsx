"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import SpiriLogo from "@/icons/spiri-logo"
import TikTokIcon from "@/icons/social/TikTokIcon"
import InstagramIcon from "@/icons/social/InstagramIcon"
import FacebookIcon from "@/icons/social/FacebookIcon"
import { IconStyle } from "@/icons/shared/types"
import SacredAnimatedBackground from "../components/Home/SacredAnimatedBackground"
import { SerializedBlogPost } from "@/lib/blog/types"
import {
  Store,
  Calendar,
  ClipboardList,
  Package,
  CreditCard,
  Users,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  BookOpen,
} from "lucide-react"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

const benefits = [
  {
    icon: Store,
    title: "Online Storefront",
    description: "Sell physical and digital products with a beautiful, customizable shop that reflects your spiritual brand."
  },
  {
    icon: Calendar,
    title: "Service Booking",
    description: "Offer readings, healings, and coaching sessions with integrated scheduling and calendar management."
  },
  {
    icon: ClipboardList,
    title: "Intake Modules",
    description: "Collect birth charts, health intake forms, and custom questionnaires tailored to your practice."
  },
  {
    icon: Package,
    title: "Inventory Management",
    description: "Track stock levels, manage backorders, and never oversell with smart inventory tracking."
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description: "Accept payments worldwide with Stripe-powered secure transactions and automatic payouts."
  },
  {
    icon: Users,
    title: "Customer Management",
    description: "Build lasting relationships with client profiles, order history, and communication tools."
  }
]

const steps = [
  {
    number: "1",
    title: "Create Your Profile",
    description: "Sign up and build your merchant profile with your brand, story, and offerings."
  },
  {
    number: "2",
    title: "Add Your Offerings",
    description: "Upload products, create service listings, and set your availability."
  },
  {
    number: "3",
    title: "Start Connecting",
    description: "Begin accepting orders, bookings, and grow your spiritual practice."
  }
]

interface LearnMoreContentProps {
  blogPosts: SerializedBlogPost[]
}

export default function LearnMoreContent({ blogPosts }: LearnMoreContentProps) {
  return (
    <div className="relative min-h-screen bg-slate-950">
      <SacredAnimatedBackground />

      {/* Back to Home */}
      <div className="fixed top-4 left-4 z-50">
        <Link href="/">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-16">
        <motion.div
          className="flex flex-col items-center max-w-4xl w-full space-y-6 text-center"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp}>
            <SpiriLogo height={80} className="h-20 md:h-[100px]" />
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-3xl md:text-5xl lg:text-6xl text-white font-light tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
          >
            Your Bridge to Spiritual Living
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-lg md:text-xl text-slate-200 font-light max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          >
            Join a sacred digital marketplace where spiritual practitioners connect with seekers,
            share their gifts, and build thriving practices.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link href="/m/setup">
              <Button
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-medium px-8"
              >
                Become a Merchant
                <Store className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/p/setup">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-medium px-8"
              >
                Become a Practitioner
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
          <motion.div variants={fadeInUp} className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-2">
            <motion.div
              className="w-1.5 h-1.5 bg-white/60 rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          </div>
        </motion.div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="relative py-20 md:py-32 px-4">
        <motion.div
          className="max-w-4xl mx-auto lg:max-w-none text-center space-y-8"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-2xl md:text-4xl text-white font-light tracking-wide">
            Our Mission
          </h2>

          <div className="space-y-6 text-slate-200 text-lg md:text-xl font-light leading-relaxed">
            <p>
              We believe that spiritual wisdom should be accessible to everyone, and that practitioners
              deserve a platform that honors their work.
            </p>
            <p>
              SpiriVerse creates the bridge between ancient spiritual traditions and modern technology,
              enabling healers, readers, and coaches to share their gifts with seekers around the world.
            </p>
            <p>
              More than a marketplace, we are building a community where energy, faith, and creativity
              come together to support spiritual growth and transformation.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-20 md:py-32 px-4 bg-black/20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-2xl md:text-4xl text-white font-light tracking-wide mb-4">
              Everything You Need to Grow
            </h2>
            <p className="text-slate-300 text-lg font-light max-w-2xl mx-auto">
              Powerful tools designed specifically for spiritual practitioners
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {benefits.map((benefit) => (
              <motion.div key={benefit.title} variants={fadeInUp}>
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 h-full">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                      <benefit.icon className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-xl text-white font-medium">{benefit.title}</h3>
                    <p className="text-slate-300 font-light leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 md:py-32 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-2xl md:text-4xl text-white font-light tracking-wide mb-4">
              How It Works
            </h2>
            <p className="text-slate-300 text-lg font-light max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                variants={fadeInUp}
                className="relative flex flex-col items-center text-center"
              >
                {/* Connector line (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-amber-500/50 to-transparent" />
                )}

                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-slate-900 text-2xl font-bold mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl text-white font-medium mb-3">{step.title}</h3>
                <p className="text-slate-300 font-light">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Blog/Resources Section */}
      <section className="relative py-20 md:py-32 px-4 bg-black/20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-2xl md:text-4xl text-white font-light tracking-wide mb-4">
              Resources
            </h2>
            <p className="text-slate-300 text-lg font-light max-w-2xl mx-auto mb-6">
              Guides and insights to help you succeed
            </p>
            <Link href="/blog">
              <Button
                variant="outline"
                className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
              >
                Visit Blog
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {blogPosts.map((post) => (
              <motion.div key={post.slug} variants={fadeInUp}>
                <Link href={`/blog/${post.slug}`}>
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 h-full group cursor-pointer">
                    <CardContent className="p-6 space-y-4">
                      {/* Cover image */}
                      <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center overflow-hidden relative">
                        {post.coverImage ? (
                          <Image
                            src={post.coverImage}
                            alt={post.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        ) : (
                          <BookOpen className="w-10 h-10 text-slate-600" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs text-amber-400 font-medium uppercase tracking-wider">
                          {post.category}
                        </span>
                        <h3 className="text-lg text-white font-medium group-hover:text-amber-300 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-slate-400 font-light text-sm line-clamp-2">{post.excerpt}</p>
                      </div>
                      <div className="pt-2">
                        <span className="text-amber-400 text-sm font-medium inline-flex items-center group-hover:underline">
                          Read More
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 md:py-32 px-4">
        <motion.div
          className="max-w-3xl mx-auto text-center space-y-8"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-5xl text-white font-light tracking-wide">
            Ready to Share Your Gifts?
          </h2>
          <p className="text-slate-200 text-lg md:text-xl font-light max-w-xl mx-auto">
            Join our growing community of spiritual practitioners and start connecting with seekers today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center">
            <Link href="/m/setup">
              <Button
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-medium px-8 py-6 text-lg"
              >
                Become a Merchant
                <Store className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/p/setup">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-medium px-8 py-6 text-lg"
              >
                Become a Practitioner
                <Sparkles className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo and copyright */}
            <div className="flex items-center gap-4">
              <SpiriLogo height={40} className="h-10" />
              <span className="text-slate-400 text-sm">
                &copy; {new Date().getFullYear()} SpiriVerse. All rights reserved.
              </span>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://www.tiktok.com/@spiriverse"
                target="_blank"
                rel="noopener noreferrer"
                className="group transition-all hover:scale-110"
                aria-label="Follow us on TikTok"
              >
                <div className="opacity-70 group-hover:opacity-100 transition-opacity">
                  <TikTokIcon mode={IconStyle.Fill} height={24} className="h-6" />
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
                  <InstagramIcon mode={IconStyle.Fill} height={24} className="h-6" />
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
                  <FacebookIcon mode={IconStyle.Fill} height={24} className="h-6" />
                </div>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
