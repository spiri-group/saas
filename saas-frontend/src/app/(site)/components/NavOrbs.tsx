'use client';

import { motion } from "framer-motion";

export default function NavOrbs() {
  return (
    <motion.div
      className="absolute inset-0 z-0 pointer-events-none"
      animate={{
        background: [
          "radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.4) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 40%)",
          "radial-gradient(circle at 80% 40%, rgba(139, 92, 246, 0.4) 0%, transparent 40%), radial-gradient(circle at 20% 60%, rgba(59, 130, 246, 0.3) 0%, transparent 40%)",
          "radial-gradient(circle at 50% 80%, rgba(59, 130, 246, 0.4) 0%, transparent 40%), radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.3) 0%, transparent 40%)",
          "radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.4) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 40%)",
        ],
      }}
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
