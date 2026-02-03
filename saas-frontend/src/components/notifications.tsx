"use client";

import { useEffect } from "react";
import { useSignalRConnection } from "./utils/SignalRProvider";
import { toast } from "sonner";
import { Toaster } from "./ui/sonner";
import { useRouter } from "next/navigation";

type SignalRMessage = {
  status?: string;
  url?: string;
  senderId: string;
  message: string;
  persisted: boolean;
  description?: string;
  position?: "bottom-center" | "top-center";
};

const Notifications: React.FC = () => {
  const signalR = useSignalRConnection();
  const router = useRouter();

  useEffect(() => {
    if (signalR?.connection) {
      signalR.connection.on("notification", (message: SignalRMessage) => {
        const {
          status,
          message: text,
          url,
          persisted,
          position = "top-center",
        } = message;

        const duration = persisted ? Infinity : 5000;

        const content = (
          <div className="flex flex-col space-y-1">
            <span>{text}</span>
            {url && (
              <button
                onClick={() => router.push(url)}
                className="mt-1 self-start text-sm text-blue-600 hover:underline"
              >
                Go to page
              </button>
            )}
          </div>
        );

        switch (status) {
          case "success":
            toast.success(content, { duration, position });
            break;
          case "error":
            toast.error(content, { duration, position });
            break;
          case "warn":
            toast.warning(content, { duration, position });
            break;
          case "info":
            toast.info(content, { duration, position });
            break;
          default:
            toast(content, { duration, position });
            break;
        }
      });
    }

    return () => {
      signalR?.connection?.off("notification");
    };
  }, [signalR, router]);

  return <Toaster />;
};

export default Notifications;