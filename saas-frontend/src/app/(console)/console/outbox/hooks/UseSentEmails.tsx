import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

export interface SentEmail {
  id: string;
  sentBy: string;
  sentByEmail: string;
  recipients: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyHtml: string;
  htmlSnapshot: string;
  emailStatus: string;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
}

const UseSentEmails = (search?: string) => {
  return useQuery({
    queryKey: ["console-sent-emails", search],
    queryFn: async () => {
      const response = await gql<{ sentEmails: SentEmail[] }>(
        `
        query SentEmails($search: String) {
          sentEmails(search: $search) {
            id
            sentBy
            sentByEmail
            recipients
            cc
            bcc
            subject
            bodyHtml
            htmlSnapshot
            emailStatus
            scheduledFor
            sentAt
            createdAt
          }
        }
      `,
        { search: search || undefined }
      );
      return response.sentEmails;
    },
    refetchInterval: 30000,
  });
};

export default UseSentEmails;
