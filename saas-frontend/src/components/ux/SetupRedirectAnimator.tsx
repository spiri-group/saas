"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { UserCircle } from "lucide-react"

interface Props {
  message?: string
  delayMs?: number
}

export default function SetupRedirectAnimator({ message = 'Let\u2019s get started\u2026', delayMs = 700 }: Props) {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => router.push('/setup'), delayMs)
    return () => clearTimeout(t)
  }, [router, delayMs])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ y: 18, scale: 0.98 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-400/40 rounded-lg px-6 py-4 flex items-center gap-3"
        >
          <UserCircle className="h-6 w-6 text-yellow-300" />
          <span className="text-white font-medium">{message}</span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
