import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

export interface AccountNote {
  id: string;
  content: string;
  pinned: boolean;
  createdBy: string;
  createdAt: string;
}

interface AccountNotesResponse {
  code: string;
  success: boolean;
  message: string;
  notes: AccountNote[] | null;
}

export const useAddAccountNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      accountId: string;
      accountType: "vendor" | "customer";
      note: { content: string; pinned?: boolean };
    }) => {
      const response = await gql<{ addAccountNote: AccountNotesResponse }>(
        `
        mutation AddAccountNote($accountId: String!, $accountType: String!, $note: AccountNoteInput!) {
          addAccountNote(accountId: $accountId, accountType: $accountType, note: $note) {
            code
            success
            message
            notes { id content pinned createdBy createdAt }
          }
        }
      `,
        args
      );
      return response.addAccountNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console-vendor-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["console-customer-accounts"] });
    },
  });
};

export const useDeleteAccountNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      accountId: string;
      accountType: "vendor" | "customer";
      noteId: string;
    }) => {
      const response = await gql<{ deleteAccountNote: AccountNotesResponse }>(
        `
        mutation DeleteAccountNote($accountId: String!, $accountType: String!, $noteId: String!) {
          deleteAccountNote(accountId: $accountId, accountType: $accountType, noteId: $noteId) {
            code
            success
            message
            notes { id content pinned createdBy createdAt }
          }
        }
      `,
        args
      );
      return response.deleteAccountNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console-vendor-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["console-customer-accounts"] });
    },
  });
};

export const useTogglePinAccountNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      accountId: string;
      accountType: "vendor" | "customer";
      noteId: string;
    }) => {
      const response = await gql<{ togglePinAccountNote: AccountNotesResponse }>(
        `
        mutation TogglePinAccountNote($accountId: String!, $accountType: String!, $noteId: String!) {
          togglePinAccountNote(accountId: $accountId, accountType: $accountType, noteId: $noteId) {
            code
            success
            message
            notes { id content pinned createdBy createdAt }
          }
        }
      `,
        args
      );
      return response.togglePinAccountNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console-vendor-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["console-customer-accounts"] });
    },
  });
};
