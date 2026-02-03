"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import SpiriAssistLogo from "@/icons/spiri-assist-logo"
import SacredAnimatedBackground from "../components/Home/SacredAnimatedBackground"
import { HelpRequestFormUI } from "../components/HelpRequest"
import UseContactMe from "../components/SignedIn/_hooks/UseContactMe"
import {
  ArrowLeft,
  ArrowRight,
  Ghost,
  Shield,
  Users,
  Clock,
  CheckCircle,
  MessageCircle,
  Search,
  Heart,
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

const caseTypes = [
  {
    icon: Ghost,
    title: "Haunted Locations",
    description: "Unexplained activity in your home, workplace, or property that needs investigation."
  },
  {
    icon: Shield,
    title: "Energy Clearing",
    description: "Unwanted spiritual presence or negative energy that needs to be addressed."
  },
  {
    icon: MessageCircle,
    title: "Spirit Communication",
    description: "Connect with passed loved ones or understand messages you may be receiving."
  },
  {
    icon: Search,
    title: "Investigation",
    description: "Document and understand paranormal phenomena with professional investigators."
  },
]

const howItWorks = [
  {
    number: "1",
    title: "Submit Your Case",
    description: "Fill out our intake form with details about your situation, location, and what you are experiencing."
  },
  {
    number: "2",
    title: "Case Review",
    description: "Our team reviews your submission and matches you with the right practitioners for your needs."
  },
  {
    number: "3",
    title: "Get Connected",
    description: "A vetted team of investigators, mediums, or practitioners reaches out to help with your case."
  },
  {
    number: "4",
    title: "Resolution",
    description: "Work with your team to investigate, understand, and address the activity you are experiencing."
  }
]

const whySpiriAssist = [
  {
    icon: Users,
    title: "Vetted Practitioners",
    description: "Every investigator and practitioner on our platform is carefully vetted for experience and ethics."
  },
  {
    icon: Heart,
    title: "Compassionate Approach",
    description: "We take every case seriously and treat clients with respect and understanding."
  },
  {
    icon: Clock,
    title: "Timely Response",
    description: "Cases are reviewed promptly and matched with available practitioners in your area."
  },
  {
    icon: CheckCircle,
    title: "Full Support",
    description: "Track your case progress and communicate with your team through our platform."
  }
]

function SubmitCaseButton() {
  const meQuery = UseContactMe()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium px-8"
          data-testid="submit-case-btn"
        >
          Submit a Case
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex flex-col w-full p-8 md:w-[650px] min-h-[450px]">
        {meQuery.isSuccess && (
          <HelpRequestFormUI
            me={meQuery.data}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function SpiriAssistContent() {
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
            <SpiriAssistLogo height={100} className="h-24 md:h-[120px]" />
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-3xl md:text-5xl lg:text-6xl text-white font-light tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
          >
            Help When You Need It Most
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-lg md:text-xl text-slate-200 font-light max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          >
            Experiencing unexplained activity? Submit your case and we will connect you with a vetted team of paranormal investigators, mediums, and spiritual practitioners who can help.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 pt-4">
            <SubmitCaseButton />
            <Button
              variant="outline"
              size="lg"
              className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn How It Works
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

      {/* Case Types Section */}
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
              How We Can Help
            </h2>
            <p className="text-slate-300 text-lg font-light max-w-2xl mx-auto">
              SpiriAssist handles a variety of cases related to paranormal and spiritual experiences
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {caseTypes.map((caseType) => (
              <motion.div key={caseType.title} variants={fadeInUp}>
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 h-full">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                      <caseType.icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-xl text-white font-medium">{caseType.title}</h3>
                    <p className="text-slate-300 font-light leading-relaxed">{caseType.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative py-20 md:py-32 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-2xl md:text-4xl text-white font-light tracking-wide mb-4">
              How SpiriAssist Works
            </h2>
            <p className="text-slate-300 text-lg font-light max-w-2xl mx-auto">
              From submission to resolution, we guide you through the process
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-4"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.number}
                variants={fadeInUp}
                className="relative flex flex-col items-center text-center"
              >
                {/* Connector line (desktop only) */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-purple-500/50 to-transparent" />
                )}

                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl text-white font-medium mb-3">{step.title}</h3>
                <p className="text-slate-300 font-light">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why SpiriAssist Section */}
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
              Why Choose SpiriAssist
            </h2>
            <p className="text-slate-300 text-lg font-light max-w-2xl mx-auto">
              We are committed to helping you find answers and peace
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {whySpiriAssist.map((reason) => (
              <motion.div key={reason.title} variants={fadeInUp}>
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 h-full">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                      <reason.icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-xl text-white font-medium">{reason.title}</h3>
                    <p className="text-slate-300 font-light leading-relaxed">{reason.description}</p>
                  </CardContent>
                </Card>
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
            Ready to Get Help?
          </h2>
          <p className="text-slate-200 text-lg md:text-xl font-light max-w-xl mx-auto">
            You do not have to face this alone. Submit your case and let us connect you with professionals who can help.
          </p>
          <div className="pt-4">
            <SubmitCaseButton />
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <SpiriAssistLogo height={40} className="h-10" />
              <span className="text-slate-400 text-sm">
                A SpiriVerse Service
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/blog/what-paranormal-investigators-do">
                <Button
                  variant="link"
                  className="text-slate-400 hover:text-white"
                >
                  Learn About Paranormal Investigation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
