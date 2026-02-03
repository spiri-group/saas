'use client';

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { sendOTP } from "./function";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { signIn, useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, X } from "lucide-react";

export const SignIn = () => {
  const queryClient = useQueryClient();
  const { update } = useSession();

  const [otpCaptureActive, setOtpCaptureActive] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpValidating, setOtpValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const [email, setEmail] = useState<string | null>(null);
  const [, setOtp] = useState<string>("");
  const [otpKey, setOtpKey] = useState(0); // Key to force OTP input reset

  const [resendCount, setResendCount] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [firstSend, setFirstSend] = useState(true);

  const handleCancel = () => {
    setOtpSent(false);
    setOtpCaptureActive(false);
    setEmail(null);
    setOtp("");
    setResendCount(0);
    setResendCooldown(false);
    setFirstSend(true);
  };

  useEffect(() => {
    if (otpSent) {
      const timer = setTimeout(() => {
        setOtpCaptureActive(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [otpSent]);

  const isValidEmail = (email: string | null): boolean =>
    !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSendOTP = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const submittedEmail = ev.currentTarget.email?.value;
    if (!isValidEmail(submittedEmail)) {
      toast.error("Please enter a valid email address.", { duration: Infinity });
      return;
    }

    setEmail(submittedEmail);
    setOtpSending(true);
    try {
      await sendOTP(submittedEmail);
      if (!firstSend) {
        toast.success(`OTP has been sent to ${submittedEmail}`);
      }
      setOtpSent(true);
      setFirstSend(false);
    } catch {
      toast.error("Could not send OTP. Please try again.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) {
      toast.error("Missing email.");
      return;
    }

    if (resendCount >= 3) {
      toast.warning("You've hit the resend limit. Try again later.");
      setResendStatus("error");
      setTimeout(() => setResendStatus("idle"), 2000);
      return;
    }

    if (resendCooldown) {
      toast.warning("Please wait before resending.");
      setResendStatus("error");
      setTimeout(() => setResendStatus("idle"), 2000);
      return;
    }

    setResendCooldown(true);
    setOtpSending(true);
    setResendStatus("sending");

    try {
      await sendOTP(email);
      toast.success(`A new code was sent to ${email}`);
      setResendStatus("success");
    } catch {
      toast.error("Could not resend OTP. Try again shortly.");
      setResendStatus("error");
    } finally {
      setOtpSending(false);
      setResendCount((count) => count + 1);
      setTimeout(() => setResendCooldown(false), 60000);
      setTimeout(() => setResendStatus("idle"), 2000);
    }
  };

  const handleOTPChange = async (otpValue: string) => {
    setOtp(otpValue);
    if (otpValue.length === 6) {
      setOtpValidating(true);

      try {
        const result = await signIn("credentials", { email, otp: otpValue, redirect: false });

        // Check if sign in succeeded
        // NOTE: NextAuth returns { ok: true, error: "CredentialsSignin" } on credential failure
        // So we need to check specifically for CredentialsSignin error
        const hasCredentialsError = result?.error === 'CredentialsSignin';

        if (result?.ok === true && !hasCredentialsError) {
          setIsValid(true);
          // Update session to get fresh data from server
          await update();
          // Invalidate all user-related queries to force refetch with new session
          queryClient.invalidateQueries({
            queryKey: ['user-me-contact', 'user-me-nav', 'setup-me', 'user-requires-input'],
          });
          setOtpValidating(false);
        } else {
          // Authentication failed - show error and clear OTP
          toast.error("Invalid verification code. Please try again.");
          setOtp("");
          setOtpKey(prev => prev + 1); // Force OTP input to remount and clear
          setOtpValidating(false);
        }
      } catch {
        // Handle any exceptions during sign in
        toast.error("Invalid verification code. Please try again.");
        setOtp("");
        setOtpKey(prev => prev + 1); // Force OTP input to remount and clear
        setOtpValidating(false);
      }
    }
  };

  const divClassName = "w-full max-w-md";

  if (isValid) return null;

  if (otpSending && !otpSent) {
    return (
      <div className={`${divClassName} flex justify-center items-center`} role="status" aria-live="polite">
        <span className="text-white text-center">Sending Code...</span>
      </div>
    );
  }

  if (otpValidating) {
    return (
      <div className={`${divClassName} flex justify-center items-center`} role="status" aria-live="polite">
        <span className="text-white text-center">Validating...</span>
      </div>
    );
  }

  if (otpSent) {
    if (otpCaptureActive) {
      return (
        <div className="flex flex-col md:flex-row items-center gap-2 w-full max-w-md">
          <InputOTP key={otpKey} aria-label="input-login-otp" maxLength={6} autoFocus onChange={handleOTPChange}>
            <InputOTPGroup>
              {[...Array(6)].map((_, idx) => (
                <InputOTPSlot key={idx} index={idx} className="text-white ring-slate-700" />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendOTP}
              disabled={otpSending}
              aria-label="Resend Code"
              title={
                resendCount >= 3
                  ? "Resend limit reached"
                  : resendCooldown
                  ? "Try again shortly"
                  : "Resend Code"
              }
              className={cn(
                "transition-colors duration-300",
                resendStatus === "success" && "text-green-500",
                resendStatus === "error" && "text-red-500",
                resendStatus === "sending" && "animate-spin opacity-50 pointer-events-none",
                resendStatus === "idle" && "text-white/70 hover:text-white"
              )}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Resend
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              aria-label="Cancel"
              title="Cancel"
              className="text-white/70 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      );
    } else {
      return (
        <div className={`${divClassName} flex justify-center items-center`} role="status" aria-live="polite">
          <span className="text-white text-center">Email sent!</span>
        </div>
      );
    }
  }

  return (
    <form
      className={cn("flex flex-row space-x-2", divClassName)}
      onSubmit={handleSendOTP}
    >
      <Input
        name="email"
        placeholder="Email"
        autoComplete="email"
        glass={false}
        onChange={(ev) => setEmail(ev.target.value)}
      />
      <Button
        type="submit"
        className="flex-none w-40"
        disabled={!isValidEmail(email)}
      >
        Login / Signup
      </Button>
    </form>
  );
};