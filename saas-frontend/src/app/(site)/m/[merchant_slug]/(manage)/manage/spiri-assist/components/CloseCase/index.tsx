import { Button, ButtonProps } from "@/components/ui/button"
import useFormStatus from "@/components/utils/UseFormStatus";
import UseCloseCase from "./hooks/UseCloseCase";
import { recordref_type } from "@/utils/spiriverse";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type CloseCaseButtonProps = ButtonProps & {
    caseRef: recordref_type;
    onSuccess?: () => void;
    onError?: () => void;
}

const CloseCaseButton: React.FC<CloseCaseButtonProps> = ({ caseRef, onSuccess, ...props }) => {
    
    const status = useFormStatus();
    const { mutation } = UseCloseCase();

    const [areYouSurePrompt, setAreYouSurePrompt] = useState<boolean>(false);

    const closeCase = async () => {
        await status.submit(mutation.mutateAsync, caseRef, () => {
          if (onSuccess) {
            onSuccess();
          }
        });
    }

    return (
        <>
        <Button 
            {...props} onClick={() => {
                setAreYouSurePrompt(true);
            }}>
            Close Case
        </Button>
        <Dialog open={areYouSurePrompt}>
            <DialogContent>
                <div className="text-lg font-bold">Are you sure you want to close this case?</div>
                <div className="flex justify-end space-x-2 mt-4">
                    <Button onClick={() => {
                        setAreYouSurePrompt(false);
                    }} variant="destructive">Cancel</Button>
                    <Button onClick={async () => {
                        await closeCase();
                        setAreYouSurePrompt(false);
                    }} variant={status.button.variant}>
                        {status.formState === "idle" ? "Close Case" : status.button.title}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
        </>
    )
}

export default CloseCaseButton