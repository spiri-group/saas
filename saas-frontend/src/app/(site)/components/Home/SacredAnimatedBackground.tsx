'use client';

import { motion } from "framer-motion";

export default function SacredAnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Dark slate background */}
      <div className="absolute inset-0 bg-slate-950" />
      
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
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}
