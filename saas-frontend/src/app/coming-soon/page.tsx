"use client";

import SpiriLogo from "@/icons/spiri-logo";
import ExpressionOfInterestForm from "./expression-of-interest-form";
import ShareDialog from "./share-dialog";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import TikTokIcon from "@/icons/social/TikTokIcon";
import InstagramIcon from "@/icons/social/InstagramIcon";
import FacebookIcon from "@/icons/social/FacebookIcon";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, Share2 } from "lucide-react";
import { IconStyle } from "@/icons/shared/types";

function ScrambleText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayText, setDisplayText] = useState("");
  const [isScrambling, setIsScrambling] = useState(true);

  useEffect(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let iteration = 0;
    let timeoutId: NodeJS.Timeout;

    const scramble = () => {
      timeoutId = setTimeout(() => {
        setDisplayText(
          text
            .split("")
            .map((char, index) => {
              if (char === " ") return " ";
              if (index < iteration) return text[index];
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join("")
        );

        iteration += 1 / 3;

        if (iteration < text.length) {
          scramble();
        } else {
          setDisplayText(text);
          setIsScrambling(false);
        }
      }, 60);
    };

    const initialDelay = setTimeout(() => {
      scramble();
    }, delay);

    return () => {
      clearTimeout(initialDelay);
      clearTimeout(timeoutId);
    };
  }, [text, delay]);

  return <span className={isScrambling ? "opacity-80" : ""}>{displayText}</span>;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function ComingSoonPage() {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isShareDrawerOpen, setIsShareDrawerOpen] = useState(false);

  return (
    <div className="relative flex flex-col md:flex-row items-center md:items-stretch justify-center flex-grow overflow-hidden p-4 gap-8 md:gap-16">
      {/* Animated background */}
      <div className="absolute inset-0 bg-slate-950">
        {/* Moving gradient orbs */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.4) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 40%)",
              "radial-gradient(circle at 80% 40%, rgba(139, 92, 246, 0.4) 0%, transparent 40%), radial-gradient(circle at 20% 60%, rgba(59, 130, 246, 0.3) 0%, transparent 40%)",
              "radial-gradient(circle at 50% 80%, rgba(59, 130, 246, 0.4) 0%, transparent 40%), radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.3) 0%, transparent 40%)",
              "radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.4) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 40%)",
            ],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-stretch justify-center w-full gap-8 md:gap-16">
        {/* Left side - Logo and tagline */}
        <div className="flex flex-col items-center justify-center text-center md:w-[500px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 mt-8 md:mt-0"
        >
          <SpiriLogo height={180} className="h-[8vh] md:h-[180px] w-auto" />
        </motion.div>

        <motion.h1
          {...fadeInUp}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-2xl md:text-4xl font-bold text-white mb-8"
        >
          Your Bridge to Spiritual Living
        </motion.h1>

        {/* Social Media Links */}
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mb-4 flex items-center justify-center gap-4 md:gap-6"
        >
          <a
            href="https://www.tiktok.com/@spiriverse"
            target="_blank"
            rel="noopener noreferrer"
            className="group transition-all hover:scale-110"
            aria-label="Follow us on TikTok"
          >
            <div className="opacity-70 group-hover:opacity-100 transition-opacity">
              <TikTokIcon mode={IconStyle.Fill} height={32} className="md:h-[40px]" />
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
              <InstagramIcon mode={IconStyle.Fill} height={32} className="md:h-[40px]" />
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
              <FacebookIcon mode={IconStyle.Fill} height={32} className="md:h-[40px]" />
            </div>
          </a>
        </motion.div>

        <motion.p
          {...fadeInUp}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="text-xl md:text-2xl text-slate-400 font-mono"
        >
          <ScrambleText text="February 2026" delay={1100} />
        </motion.p>

        {/* Action Links */}
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.85, duration: 0.6 }}
          className="mt-6 hidden md:flex items-center justify-center gap-4"
        >
          <Link
            href="/blog"
            className="text-slate-400 hover:text-white transition-colors underline underline-offset-4"
          >
            Visit our Blog
          </Link>
          <Link
            href="/learn-more"
            className="text-slate-400 hover:text-white transition-colors underline underline-offset-4"
          >
            Learn More
          </Link>
          <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share Page
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  Share SpiriVerse
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Help us spread the word about SpiriVerse!
                </DialogDescription>
              </DialogHeader>
              <ShareDialog />
              <DialogFooter className="sm:justify-center">
                <Button
                  onClick={() => setIsShareDialogOpen(false)}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Mobile Action Links */}
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.85, duration: 0.6 }}
          className="mt-6 md:hidden flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-4">
            <Link
              href="/blog"
              className="text-slate-400 hover:text-white transition-colors underline underline-offset-4"
            >
              Visit our Blog
            </Link>
            <Link
              href="/learn-more"
              className="text-slate-400 hover:text-white transition-colors underline underline-offset-4"
            >
              Learn More
            </Link>
          </div>
          <Drawer open={isShareDrawerOpen} onOpenChange={setIsShareDrawerOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share Page
              </Button>
            </DrawerTrigger>
            <DrawerContent className="bg-slate-900 border-slate-700">
              <DrawerHeader>
                <DrawerTitle className="text-white flex items-center gap-2 justify-center">
                  <Share2 className="h-5 w-5 text-primary" />
                  Share SpiriVerse
                </DrawerTitle>
                <DrawerDescription className="text-slate-400 text-center">
                  Help us spread the word about SpiriVerse!
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4">
                <ShareDialog />
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 w-full"
                  >
                    Close
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </motion.div>

        {/* Mobile Drawer Button */}
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-4 md:hidden"
        >
          <Drawer>
            <DrawerTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg">
                <Bell className="mr-2 h-5 w-5" />
                Get Notified
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[95vh]">
              <DrawerHeader className="sr-only">
                <DrawerTitle>Expression of Interest</DrawerTitle>
                <DrawerDescription>Get notified at launch!</DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-8 overflow-y-auto max-h-[calc(95vh-2rem)]">
                <ExpressionOfInterestForm />
              </div>
            </DrawerContent>
          </Drawer>
        </motion.div>

        {/* <div className="mt-8">
          <PageQRCode
              srOnly
              size={100}
              logo="/spiriverse-v-only.svg"
              dotType="dots"
              cornerColor="var(--accent)" // style the square "eye" border
              cornerType="extra-rounded"
              cornerDotColor="var(--accent)"     // keep center of the "eye" high contrast
              cornerDotType="dot"
              backgroundColor="#ffffff"
              logoSizeRatio={0.3}
            />
        </div> */}
      </div>

        {/* Right side - Form (Desktop only) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="hidden md:flex md:w-[500px] items-center"
        >
          <ExpressionOfInterestForm />
        </motion.div>
      </div>
    </div>
  );
}
