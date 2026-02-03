"use client";

import { motion } from "framer-motion";
import {
  CheckCircleIcon,
  TruckIcon,
  AlertTriangleIcon,
  LocateIcon,
  ClockIcon,
} from "lucide-react";
import { tracking_event_type } from "@/utils/spiriverse";
import { JSX } from "react";
import React from "react";

type NormalizedTrackingStatus =
  | "in_transit"
  | "delivered"
  | "error"
  | "unknown"
  | "delivered_to_service_point";

const statusCodeToTrackingStatus: Record<string, NormalizedTrackingStatus> = {
  IT: "in_transit",
  NY: "in_transit",
  DE: "delivered",
  SP: "delivered_to_service_point",
  EX: "error",
  UN: "unknown",
};

const trackingStatusMeta: Record<
  NormalizedTrackingStatus | "default",
  { label: string; icon: JSX.Element; className: string }
> = {
  in_transit: {
    label: "In Transit",
    icon: <TruckIcon size={14} />,
    className: "bg-yellow-100 text-yellow-800",
  },
  delivered: {
    label: "Delivered",
    icon: <CheckCircleIcon size={14} />,
    className: "bg-green-100 text-green-800",
  },
  delivered_to_service_point: {
    label: "Collection Location",
    icon: <LocateIcon size={14} />,
    className: "bg-blue-100 text-blue-800",
  },
  error: {
    label: "Exception",
    icon: <AlertTriangleIcon size={14} />,
    className: "bg-red-100 text-red-800",
  },
  unknown: {
    label: "Unknown",
    icon: <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />,
    className: "bg-gray-50 text-gray-400 border border-gray-200 px-2 py-0.5",
  },
  default: {
    label: "Status",
    icon: <ClockIcon size={14} />,
    className: "bg-muted text-foreground",
  },
};

type BadgeSize = "sm" | "md" | "lg" | "xl" | "2xl";

const sizeMap: Record<BadgeSize, {
  text: string;
  padding: string;
  icon: number;
}> = {
  sm: { text: "text-xs", padding: "px-1.5 py-0.5", icon: 12 },
  md: { text: "text-sm", padding: "px-2 py-0.5", icon: 14 },
  lg: { text: "text-base", padding: "px-3 py-1", icon: 16 },
  xl: { text: "text-lg", padding: "px-4 py-1.5", icon: 18 },
  "2xl": { text: "text-xl", padding: "px-5 py-2", icon: 20 },
};

type Props = {
  event?: tracking_event_type | null;
  delay?: number;
  size?: BadgeSize;
};

export default function TrackingStatusBadge({
  event,
  delay = 0.3,
  size = "md",
}: Props) {
  const normalized = event
    ? statusCodeToTrackingStatus[event.status_code] ?? "default"
    : "unknown";
  const meta = trackingStatusMeta[normalized];
  const animate = normalized !== "unknown";

  const sizing = sizeMap[size];

  const badgeClass = `inline-flex items-center gap-1 rounded-md font-medium ${sizing.text} ${sizing.padding} ${meta.className}`;

  const iconWithSize = React.cloneElement(meta.icon, {
    size: sizing.icon,
  });

  return (
    <div className="space-y-1" key={event?.status_code ?? "none"}>
      {animate ? (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.95, rotateX: -15 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay }}
          className={badgeClass}
        >
          {iconWithSize}
          {meta.label}
        </motion.div>
      ) : (
        <div className={badgeClass}>
          {iconWithSize}
          {meta.label}
        </div>
      )}
    </div>
  );
}
