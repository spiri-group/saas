import { media_type, recordref_type } from "../../../utils/spiriverse";

import UseCreateMessage, { messageSchema } from "./hooks/UseCreateMessage";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import IconButton from "@/components/ui/iconbutton";
import { CheckIcon, SendHorizonalIcon } from "lucide-react";
import { v4 as uuid } from "uuid";
import FileUploader from "../FileUploader";
import { useState } from "react";
import useFormStatus from "@/components/utils/UseFormStatus";
import Spinner from "@/components/ui/spinner";

type BLProps = {
    forObject: recordref_type,
    merchantId?: string
    replyTo?: recordref_type
    deliverTo?: {
        userId: string,
        mode: string
    },
    onSuccess?: (value: messageSchema) => void,
    onComplete?: (values: messageSchema) => void,
    onCancel?: () => void,
    withAttachments: boolean
}

type Props = BLProps & {
    // allowResponseCodes: boolean
    // onMessageSent?: (message: message_type) => void
}

const useBL = (props: BLProps) => { 
    // const [requiresResponse, setRequiresResponse] = useState<boolean>(false)
    // const [responseCode, setResponseCode] = useState<string | null>(null)

    const createMessage = UseCreateMessage(props.forObject, props.deliverTo, props.merchantId, props.replyTo)
    const status = useFormStatus();

     // const clear = () => {
    //     setRequiresResponse(false)
    //     setResponseCode(null)
    // }

    return {
        // clear,
        form: createMessage.form,
        values: createMessage.values,
        status,
        submit: async (data: messageSchema) => {
            await status.submit(createMessage.mutation.mutateAsync, data, () => {
                createMessage.form.reset({
                    id: uuid(),
                    text: "",
                    media: []
                })
                if (props.onComplete) props.onComplete(data)
                status.reset();
            })
        }
        // requiresResponse: {
        //     get: requiresResponse,
        //     set: setRequiresResponse
        // },
        // responseCode: {
        //     get: responseCode,
        //     set: setResponseCode
        // }
    }
}

const NewMessage: React.FC<Props> = (props) => {
    const bl = useBL(props)
    const [, setMedia] = useState<media_type[]>([])

    return (
        <Form {...bl.form}>
            <form className="flex flex-row w-full space-x-2 items-center" onSubmit={bl.form.handleSubmit(bl.submit)}> 
                {props.withAttachments && (
                    <FormField
                        name="media"
                        render={({ field }) => (
                        <FormControl>
                            <FileUploader
                                minimal
                                id={bl.values.id}
                                className="border border-dashed rounded-md p-2 w-10 h-10 flex-none"
                                connection={{
                                container: "public",
                                relative_path: `chat/${bl.values.id}`,
                                }}
                                targetImage={{ height: 300, width: 500 }}
                                targetImageVariants={[]}
                                value={field.value || []}
                                onRemoveAsync={(files) => {
                                    const currentMedia = field.value || [];
                                    let next = currentMedia;
                                    if (Array.isArray(files)) {
                                        next = currentMedia.filter((m) => !files.some((f) => f == m));
                                    }
                                    setMedia(next);
                                    field.onChange(next);
                                }}
                                onDropAsync={() => {
                                    field.onChange([]);
                                }}
                                onUploadCompleteAsync={(files: media_type[]) => {
                                    const currentMedia = field.value || [];

                                    const filesWithTitles = files.map((file, index) => ({
                                        ...file,
                                        title: `Attachment ${currentMedia.length + index + 1}`,
                                        description: "Description for attachment",
                                    }));

                                    const next = [...currentMedia, ...filesWithTitles];

                                    setMedia(next);
                                    field.onChange(next);
                                }}
                            />
                        </FormControl>
                        )}
                    />
                    )}

                <FormField 
                    name="text"
                    control={bl.form.control}
                    render={({field}) => {
                        return (
                            <FormItem className="w-full">
                                <FormControl>
                                    <Textarea 
                                        {...field} 
                                        placeholder="Type message"
                                        onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                                            const target = e.target as HTMLTextAreaElement;
                                            if (e.currentTarget.value.length < 22) {
                                                if (target.scrollHeight > 40) {
                                                    target.style.height = '40px';
                                                }
                                                return;
                                            };
                                            target.style.height = 'auto';
                                            target.style.height = target.scrollHeight + 2 + 'px';
                                        }}
                                        style={{
                                            maxHeight: "120px",
                                            minHeight: 40,
                                            padding: "8px",
                                            boxSizing: "border-box",
                                            height: 40,
                                            backgroundColor: "transparent",
                                            resize: "none"
                                        }}
                                        maxLength={140}
                                    />
                                </FormControl>
                            </FormItem>
                        )
                    }} />
                { bl.status.formState == "idle" ?
                    <IconButton type="submit" variant="link" icon={<SendHorizonalIcon />} data-testid="chat-send-btn" /> :
                      bl.status.formState === "processing" ? 
                        <Spinner /> :
                        <CheckIcon className="text-green-500" />
                }
            </form>
        </Form>
    )
}

export default NewMessage