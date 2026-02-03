"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface ExpressionOfInterestFormData {
  userType: "merchant" | "customer";
  name: string;
  email: string;
  referralSource: "socials" | "google" | "friend" | "mind-body-spirit-festival";
}

export default function ExpressionOfInterestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ExpressionOfInterestFormData>({
    defaultValues: {
      userType: "merchant",
      name: "",
      email: "",
      referralSource: "socials",
    },
  });

  const onSubmit = async (data: ExpressionOfInterestFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/expression-of-interest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to submit expression of interest");
      }

      setIsSubmitted(true);
      form.reset();
    } catch {
      setError(
        "We couldn&apos;t submit your expression of interest. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-2xl border border-slate-700 p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-green-400 mb-4">
          Thank You!
        </h2>
        <p className="text-slate-300 mb-4">
          We&apos;ve received your expression of interest. We&apos;ll be in touch soon!
        </p>
        <Button
          onClick={() => setIsSubmitted(false)}
          variant="outline"
          className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          Submit Another
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-2xl border border-slate-700 p-8 w-full">
      <h2 className="text-2xl font-bold text-white mb-2 text-center hidden md:block">
        Expression of Interest
      </h2>
      <p className="text-slate-400 mb-6 text-center">
        Get notified at launch!
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="userType"
            rules={{ required: "Please select a user type" }}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-slate-200 font-semibold">
                  I am a...
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-row md:flex-col gap-2 md:space-y-2"
                  >
                    <div className="flex items-center space-x-3 bg-slate-800/50 p-3 rounded-md border border-slate-700 flex-1">
                      <RadioGroupItem value="customer" id="customer" />
                      <Label
                        htmlFor="customer"
                        className="font-normal cursor-pointer flex-1 text-slate-300"
                      >
                        Customer
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 bg-slate-800/50 p-3 rounded-md border border-slate-700 flex-1">
                      <RadioGroupItem value="merchant" id="merchant" />
                      <Label
                        htmlFor="merchant"
                        className="font-normal cursor-pointer flex-1 text-slate-300"
                      >
                        Merchant
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            rules={{ required: "Name is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-200 font-semibold">
                  Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Your name"
                    glass={true}
                    autoComplete="off"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            rules={{
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-200 font-semibold">
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    glass={true}
                    autoComplete="off"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="referralSource"
            rules={{ required: "Please select how you heard about us" }}
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-slate-400 text-sm font-normal">
                  How did you hear about us?
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col md:flex-row md:flex-wrap gap-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="socials" id="socials" />
                      <Label
                        htmlFor="socials"
                        className="font-normal cursor-pointer text-sm text-slate-300"
                      >
                        Social
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="google" id="google" />
                      <Label
                        htmlFor="google"
                        className="font-normal cursor-pointer text-sm text-slate-300"
                      >
                        Google
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="friend" id="friend" />
                      <Label
                        htmlFor="friend"
                        className="font-normal cursor-pointer text-sm text-slate-300"
                      >
                        Friend
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="mind-body-spirit-festival" id="mind-body-spirit-festival" />
                      <Label
                        htmlFor="mind-body-spirit-festival"
                        className="font-normal cursor-pointer text-sm text-slate-300"
                      >
                        Mind Body Spirit
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div className="bg-red-950/50 border border-red-800 text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Interest"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
