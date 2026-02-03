// This is a component that allows a person to choose a background

import { MediaSchema } from "@/shared/schemas/media";
import { z } from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import FileUploader, { FileUploaderTarget } from "./FileUploader";
import React from "react";
import { HexColorPicker } from "react-colorful";
import { DialogFooter } from "../ui/dialog";
import { escape_key } from "@/lib/functions";
import { Button } from "../ui/button";
import CancelDialogButton from "./CancelDialogButton";

export const BackgroundSchema = z.object({
    color: z.string().optional(),
    image: MediaSchema.optional().nullable(),
})

export type Background = z.infer<typeof BackgroundSchema>;

type Props = {
    id: string;
    connection: FileUploaderTarget;
    value: Background;
    onChange: (value: Background) => void;
}

const BackgroundPicker :React.FC<Props> = (props) => {

    const [oldBackground, ] = React.useState<Background>(props.value);
    const [isConfirmed, setIsConfirmed] = React.useState(false);
    
    if (props.value == null) {
        return <></>
    }

    return <>
        <Popover onOpenChange={(open) => {
            if (!open && !isConfirmed) {
                // we assume they escaped or clicked outside so we reset it
                props.onChange(oldBackground);
            }
        }}>
            <PopoverTrigger asChild>
                <div
                    style={{
                        backgroundImage: props.value.image != null ? `url('${props.value.image.url}')` : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundColor: props.value.color
                    }} 
                    className="h-10 w-full rounded-lg border border-input cursor-pointer">
                </div>
            </PopoverTrigger>
            <PopoverContent className="grid grid-cols-2 grid-rows-auto w-[500px]">
                <div className="flex flex-col">
                    <span className="mb-3">Color</span>
                    <HexColorPicker 
                        color={props.value.color} 
                        onChange={(newColor) => {
                            props.onChange({
                                ...props.value,
                                color: newColor
                            });
                        }} 
                    />
                </div>
                <div className="flex flex-col">
                    <div className="flex flex-row justify-between items-center">
                        <span className="mb-3">Image</span>
                        {props.value.image != null &&
                            <Button
                                className="pt-0"
                                variant="link" onClick={() => {
                                props.onChange({
                                    image: undefined
                                });
                            }}>Remove</Button>
                        }
                    </div>
                    <FileUploader 
                           {...props} 
                           className="w-full aspect-video rounded-xl border-2 border-input border-dashed"
                           value={props.value.image ? [props.value.image.url] : []}
                           acceptOnly={{
                                type: "IMAGE",
                                orientation: "LANDSCAPE"
                           }}
                           targetImage={{
                                width: 1920,
                                height: 1080
                           }}
                           targetImageVariants={[]}
                           allowMultiple={false}
                           onUploadCompleteAsync={(files) => {
                                 if (files.length > 0) {
                                      props.onChange({
                                       ...props.value,
                                       image: {
                                        ...files[0],
                                        title: "Background Image",
                                        description: "A background image",
                                        hashtags: []  
                                      }});
                                 }
                           }}   
                           onDropAsync={() => {
                                // clear the current image
                                props.onChange({
                                    image: undefined
                                });
                           }}               
                        />
                </div>
                <DialogFooter className="col-span-2 mt-3">
                    <CancelDialogButton
                        onCancel={() => {
                            setIsConfirmed(false);
                            props.onChange(oldBackground);
                            escape_key();
                        }} />
                    <Button 
                        type="button"
                        variant="default"
                        className="w-full"
                        onClick={() => {
                            setIsConfirmed(true);
                            escape_key();
                        }}>Confirm</Button>
                </DialogFooter>
            </PopoverContent>
        </Popover>
    </>
}

export default BackgroundPicker;

