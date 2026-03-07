"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { fkMotion } from "@/lib/styles/motion";

export function Card({
  children,
  className,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  const baseClassName = ["fk-glass-card", "p-4", className ?? ""].join(" ");

  if (!hover) {
    return <div className={baseClassName}>{children}</div>;
  }

  return (
    <motion.div
      className={baseClassName}
      variants={fkMotion.variants.cardHover}
      initial="rest"
      whileHover="hover"
      transition={fkMotion.transition.fast}
    >
      {children}
    </motion.div>
  );
}