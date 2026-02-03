"use client";

import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { escape_key } from "@/lib/functions";
import { recordref_type } from "@/utils/spiriverse";

type Props = {
  shipmentId: string;
  orderRef: recordref_type;
  statusCode?: string;
  className?: string;
  variant?: ButtonProps["variant"];
};

export function ArchiveDeliveryButton({
  shipmentId,
  orderRef,
  statusCode,
  className = "",
  variant = "default"
}: Props) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const isDelivered = statusCode === "DE";
  if (!isDelivered) return null;

  async function handleClick() {
    setPending(true);

    try {
      await gql(`
        mutation MarkReviewed($orderRef: RecordRefInput!, $shipmentId: ID!) {
          mark_delivery_as_reviewed(orderRef: $orderRef, shipmentId: $shipmentId) {
            id
          }
        }
      `, {
        orderRef,
        shipmentId,
      });

      // Evict this shipment from all matching delivery queries
      queryClient
        .getQueryCache()
        .findAll({ queryKey: ["deliveries"], exact: false })
        .forEach((query) => {
          queryClient.setQueryData(query.queryKey, (old: any) => {
            if (!Array.isArray(old)) return old;
            return old.filter((item) => item.id !== shipmentId);
          });
        });

      toast.success("Delivery archived", {
        description: "You can find it in your historical deliveries.",
        action: {
          label: "View History",
          onClick: () => router.push("/history"),
        },
      });

      escape_key(); 

    } catch (error) {
      toast.error("Failed to archive delivery", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant={variant}
      className={cn(className)}
      size="sm"
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? "Archiving..." : "Archive Delivery"}
    </Button>
  );
}
