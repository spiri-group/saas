import { useMutation } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

const UsePreviewAdHocEmail = () => {
  return useMutation({
    mutationFn: async (bodyHtml: string) => {
      const response = await gql<{ previewAdHocEmail: string }>(
        `
        query PreviewAdHocEmail($bodyHtml: String!) {
          previewAdHocEmail(bodyHtml: $bodyHtml)
        }
      `,
        { bodyHtml }
      );
      return response.previewAdHocEmail;
    },
  });
};

export default UsePreviewAdHocEmail;
