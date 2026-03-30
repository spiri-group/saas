'use client';

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { sendOTP } from "./function";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { signIn, useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, LogIn, UserPlus, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const SignIn = () => {
  const queryClient = useQueryClient();
  const { data: session, update } = useSession();

  const [showEmailInput, setShowEmailInput] = useState(false);
  const [otpCaptureActive, setOtpCaptureActive] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpValidating, setOtpValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const [email, setEmailState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sv_login_email') || null;
    }
    return null;
  });

  const setEmail = (value: string | null) => {
    setEmailState(value);
    if (typeof window !== 'undefined') {
      if (value) {
        localStorage.setItem('sv_login_email', value);
      }
    }
  };
  const [, setOtp] = useState<string>("");
  const [otpKey, setOtpKey] = useState(0); // Key to force OTP input reset

  const [resendCount, setResendCount] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [firstSend, setFirstSend] = useState(true);

  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleCancel = () => {
    setOtpSent(false);
    setOtpCaptureActive(false);
    setShowEmailInput(false);
    setEmail(null);
    setOtp("");
    setResendCount(0);
    setResendCooldown(false);
    setFirstSend(true);
  };

  // Reset when user signs out
  useEffect(() => {
    if (!session) {
      setIsValid(false);
    }
  }, [session]);

  useEffect(() => {
    if (otpSent) {
      const timer = setTimeout(() => {
        setOtpCaptureActive(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [otpSent]);

  // Focus the email input when it appears and sync any browser-autofilled value
  useEffect(() => {
    if (showEmailInput && emailInputRef.current) {
      // Small delay to let the animation start and browser autofill to populate
      setTimeout(() => {
        if (emailInputRef.current) {
          emailInputRef.current.focus();
          // Browser autofill sets the DOM value without triggering onChange,
          // so sync the input's value to React state
          const autofilled = emailInputRef.current.value;
          if (autofilled && autofilled !== email) {
            setEmail(autofilled);
          }
        }
      }, 200);
    }
  }, [showEmailInput]);

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
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const result = await signIn("credentials", { email, otp: otpValue, timezone, redirect: false });

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
        <div className="flex flex-col items-center gap-3 w-full max-w-md">
          <p className="text-white/80 text-sm text-center">
            We sent a code to <span className="text-white font-medium">{email}</span>
          </p>
          <InputOTP key={otpKey} aria-label="input-login-otp" maxLength={6} autoFocus onChange={handleOTPChange}>
            <InputOTPGroup>
              {[...Array(6)].map((_, idx) => (
                <InputOTPSlot key={idx} index={idx} className="text-white ring-slate-700" />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendOTP}
              disabled={otpSending}
              aria-label="Resend Code"
              data-testid="signin-resend-btn"
              className={cn(
                "border-white/20 transition-colors duration-300",
                resendStatus === "success" && "text-green-400 border-green-400/30",
                resendStatus === "error" && "text-red-400 border-red-400/30",
                resendStatus === "sending" && "animate-spin opacity-50 pointer-events-none",
                resendStatus === "idle" && "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Resend Code
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              aria-label="Cancel"
              data-testid="signin-cancel-btn"
              className="text-white/60 hover:text-white"
            >
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
    <div className={cn("flex flex-col items-center", divClassName)}>
      {/* Step 1: Log In / Sign Up buttons */}
      <div
        className={cn(
          "flex flex-row gap-3 w-full transition-all duration-300 ease-out overflow-hidden",
          showEmailInput ? "max-h-0 opacity-0 mb-0" : "max-h-20 opacity-100 mb-0"
        )}
      >
        <Button
          type="button"
          variant="outline"
          className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
          onClick={() => setShowEmailInput(true)}
          data-testid="signin-login-btn"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Log In
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={() => setShowEmailInput(true)}
          data-testid="signin-signup-btn"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Sign Up
        </Button>
      </div>

      {/* Step 2: Email input (animates in) */}
      <div
        className={cn(
          "w-full transition-all duration-300 ease-out overflow-hidden",
          showEmailInput ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <form
          className="flex flex-row space-x-2 w-full items-center"
          onSubmit={handleSendOTP}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setShowEmailInput(false); setEmail(null); }}
            className="flex-none text-white/70 hover:text-white"
            data-testid="signin-back-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Input
            ref={emailInputRef}
            name="email"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            glass={false}
            defaultValue={email || ''}
            onChange={(ev) => setEmail(ev.target.value)}
            data-testid="signin-email-input"
          />
          <Button
            type="submit"
            className="flex-none"
            disabled={!isValidEmail(email)}
            data-testid="signin-send-code-btn"
          >
            Continue
          </Button>
        </form>
      </div>

      <p className="text-xs text-white/50 mt-2 text-center" data-testid="signin-legal-text">
        By continuing, you agree to our{' '}
        <Link href="/legal/terms-of-service" className="underline hover:text-white/70">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/legal/privacy-policy" className="underline hover:text-white/70">
          Privacy Policy
        </Link>
      </p>

      <p className="text-xs text-white/30 mt-4 text-center">
        <Link href="/booking/find" className="underline hover:text-white/50">
          Already have a booking? Find it here
        </Link>
      </p>
    </div>
  );
};
