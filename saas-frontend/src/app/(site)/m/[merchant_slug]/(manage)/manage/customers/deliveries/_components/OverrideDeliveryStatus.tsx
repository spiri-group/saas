"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gql } from "@/lib/services/gql";
import { recordref_type } from "@/utils/spiriverse";
import ComboBox from "@/components/ux/ComboBox";
import { PencilIcon } from "lucide-react";
import RichTextInput from "@/components/ux/RichTextInput";
import { countWords, isNullOrUndefined } from "@/lib/functions";

const formSchema = z.object({
  statusCode: z.string().min(1, "Please select a status"),
  reason: z.string().optional().refine((x) => isNullOrUndefined(x) || countWords(x) < 75, {
    "message": "Reason must be less than 75 words",
  }),
});

type FormValues = z.infer<typeof formSchema>;

type IconSize = "xs" | "sm" | "md" | "lg";

type Props = {
  shipmentId: string;
  orderRef: recordref_type;
  currentStatusCode?: string;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: IconSize;
};

const STATUS_OPTIONS = [
  { value: "IT", label: "In Transit" },
  { value: "DE", label: "Delivered" },
  { value: "SP", label: "Collection Location" },
  { value: "EX", label: "Exception" },
  { value: "UN", label: "Unknown" },
];

const icon_size: Record<IconSize, string> = {
  "xs": "w-3 h-3",
  "sm": "w-4 h-4",
  "md": "w-5 h-5",
  "lg": "w-6 h-6",
}

export function OverrideShippingStatusButton({
  shipmentId,
  orderRef,
  currentStatusCode,
  variant = "default",
  className,
  size = "md"
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      statusCode: currentStatusCode ?? "",
      reason: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setPending(true);
    try {
      await gql(
        `
        mutation OverrideStatus(
          $orderRef: RecordRefInput!
          $shipmentId: ID!
          $statusCode: String!
          $reason: String
        ) {
          override_delivery_status(
            orderRef: $orderRef
            shipmentId: $shipmentId
            statusCode: $statusCode
            reason: $reason
          ) {
            id
          }
        }
      `,
        {
          orderRef,
          shipmentId,
          statusCode: values.statusCode,
          reason: values.reason,
        }
      );

      queryClient
        .getQueryCache()
        .findAll({ queryKey: ["deliveries"], exact: false })
        .forEach((query) => {
          queryClient.setQueryData(query.queryKey, (old: any) => {
            if (!Array.isArray(old)) return old;
            return old.map((item) =>
              item.id === shipmentId
                ? { ...item, status_code: values.statusCode }
                : item
            );
          });
        });

      toast.success("Shipping status updated.");
      setOpen(false);
    } catch (err) {
      toast.error("Failed to update status", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild className={cn(className)}>
        <Button variant={variant} size="icon" disabled={pending}>
            <PencilIcon className={icon_size[size]} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-sm p-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="statusCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Status</FormLabel>
                  <FormControl>
                    <ComboBox
                      items={STATUS_OPTIONS}
                      value={STATUS_OPTIONS.find(x => x.value == field.value)}
                      fieldMapping={{
                        keyColumn: "value",
                        labelColumn: "label",
                      }}
                      onChange={(selected) => {
                        field.onChange(selected.value)
                      }}
                      placeholder="Select a status"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <RichTextInput
                      {...field}
                      maxWords={75}
                      placeholder="Optional"
                      className="h-[200px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-row gap-2 pt-2 w-full">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button className="flex-grow" type="submit" size="sm" disabled={pending}>
                {pending ? "Updating…" : "Confirm"}
              </Button>
            </div>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
