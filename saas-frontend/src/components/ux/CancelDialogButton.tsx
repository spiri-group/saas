import { cn } from "@/lib/utils"
import { Button } from "../ui/button"
import { escape_key } from "@/lib/functions"

type CancelDialogButtonProps = {
    className?: string,
    label?: string,
    onCancel?: () => void
}

const CancelDialogButton = (props: CancelDialogButtonProps) => {
    return (
        <Button 
            type="button" 
            className={cn("flex-none", props.className)} 
            variant="destructive" 
            onClick={() => {
                if (props.onCancel) props.onCancel()
                else escape_key()
            }}>
                {props.label ?? "Cancel"}
        </Button>
    )
}

export default CancelDialogButton
