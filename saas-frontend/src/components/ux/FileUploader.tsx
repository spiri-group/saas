'use client';

import axios from "axios";
import classNames from "classnames";
import { useEffect, useState } from "react";
import * as NextImage from "next/image";
import { MediaType } from "@/utils/common_types";
import { media_type } from "@/utils/spiriverse";
import { FileWarningIcon, UploadIcon, XIcon } from "lucide-react";
import { isNullOrUndefined, isNullOrWhitespace } from "@/lib/functions";
import { v4 as uuid } from "uuid";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "../ui/button";

export type FileUploaderTarget = {
    container: string,
    relative_path: string
}

export type FileUploaderParams = {
    id: string,
    name? : string,
    className?:string,
    style?: React.CSSProperties,
    imageClassName?: string,
    objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down",
    connection : FileUploaderTarget,
    targetImage?: imageVariant,
    targetImageVariants?: imageVariantWithName[],
    value?: string[] | string | null,
    acceptOnly?: {
        aspectRatio?: string,
        type?: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT",
        types?: ("IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT")[],
        orientation? : "LANDSCAPE" | "PORTRAIT"
    },
    allowMultiple?: boolean,
    onDropAsync: (files: string[]) => void,
    onUploadCompleteAsync: (files: media_type[]) => void,
    includePreview?: boolean,
    onRemoveAsync?: (files: string[] | string) => void,
    buttonProps?: ButtonProps,
    minimal?: boolean,
    children?: React.ReactNode
}

type imageVariant = {
    width: number,
    height: number
}

type imageVariantWithName = imageVariant & {
    name: string
}

const type_to_extensions = {
    "IMAGE": ["jpg", "jpeg", "png", "gif", "webp", "avif"],
    "VIDEO": ["mp4", "mov", "avi", "mkv"],
    "AUDIO": ["mp3", "wav", "ogg", "flac"],
    "DOCUMENT": ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"],
    "OTHER": ["*"]
}

/**
 * FileUploader component for uploading files with specified requirements.
 *
 * @component
 * @param {FileUploaderParams} props - The component props.
 * @param {string} props.id - The unique identifier for the component.
 * @param {string} [props.name] - The name of the component.
 * @param {string} [props.className] - The CSS class name for the component.
 * @param {string} [props.imageClassName] - The CSS class name for the image.
 * @param {target} props.connection - The target connection details.
 * @param {imageVariant} [props.targetImage] - The target image variant (optional, only for images).
 * @param {imageVariantWithName[]} [props.targetImageVariants] - The target image variants with names (optional, only for images).
 * @param {string[] | string | null} [props.value] - The initial value of the component.
 * @param {Object} [props.acceptOnly] - The accepted file types and requirements.
 * @param {string} [props.acceptOnly.aspectRatio] - The aspect ratio requirement.
 * @param {"IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "OTHER"} props.acceptOnly.type - The type of files to accept.
 * @param {"LANDSCAPE" | "PORTRAIT"} [props.acceptOnly.orientation] - The orientation requirement.
 * @param {boolean} [props.allowMultiple] - Whether to allow multiple file uploads.
 * @param {(files: string[]) => void} props.onDropAsync - The callback function when files are dropped.
 * @param {(files: media_type[]) => void} props.onUploadCompleteAsync - The callback function when upload is complete.
 * @param {boolean} [props.includePreview=true] - Whether to include a preview of the uploaded files. 
 * @param {(files: string[] | string) => void} [props.onRemoveAsync] - The callback function when files are removed.
 * @param {ButtonProps} [props.buttonProps] - Additional button properties.
 * @param {boolean} [props.minimal=false] - Whether to render in minimal mode.
*/
const FileUploader : React.FC<FileUploaderParams> = ({includePreview= true, ...props}) => {
    const [dragActive, setDragActive] = useState(false);
    const [uploadingActive, setUploadingActive] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const requirements = props.acceptOnly == null ? null :{
        ...props.acceptOnly
    }

    useEffect(() => {
        if (hasError) {
            setTimeout(() => {
                setHasError(false)
                setErrorMessage(null)
            }, 3000)
        }
    }, [hasError])
  
    // handle drag events
    const handleDrag = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
        } else if (e.type === "dragleave") {
        setDragActive(false);
        }
    };

    const handleDrop = async (files: FileList) => {
        console.info("Dropped")
        setDragActive(false);
        setUploadingActive(true);
        if (files.length > 0) {
            try {
                const filenames = Array.from(files).map((file:File) => file.name);
                await props.onDropAsync(filenames);
                
                // we need to see if all files meet the requirements
                if (requirements != null) {

                    let expectedAspectRatio : number | null = null;
                    if (requirements.aspectRatio && !isNullOrWhitespace(requirements.aspectRatio)) {
                        if (!requirements.aspectRatio.includes(":")) throw new Error("Invalid aspect ratio specified. Must be in the form of 'width:height'")
                        const aspectRatio = requirements.aspectRatio.split(":");
                        expectedAspectRatio = parseInt(aspectRatio[0]) / parseInt(aspectRatio[1]);
                    }

                    await Promise.all(Array.from(files).map((file: File) => {
                        return new Promise((resolve, reject) => {
                            const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
                            const isVideo = type_to_extensions["VIDEO"].includes(fileExtension);
                            
                            // Build list of allowed extensions from type or types array
                            let allowedExtensions: string[] = [];
                            if (requirements.types && requirements.types.length > 0) {
                                // Multiple types specified - combine their extensions
                                requirements.types.forEach(t => {
                                    allowedExtensions = allowedExtensions.concat(type_to_extensions[t]);
                                });
                            } else if (requirements.type) {
                                // Single type specified
                                allowedExtensions = type_to_extensions[requirements.type];
                            }
                            const fileNameExtensionCheck = requirements == undefined || allowedExtensions.length === 0 || allowedExtensions.includes(fileExtension)
                            if (!fileNameExtensionCheck) {
                                console.warn(`File ${file.name} does not have the required extension`)
                                const errorMessage = `${allowedExtensions.join(", ")} required.`;
                                setErrorMessage(errorMessage);
                                reject(errorMessage);
                                return;
                            }

                            if (isVideo) {
                                // For video files, we'll skip dimension validation for now
                                // In a real implementation, you might want to create a video element
                                // and check its dimensions when metadata is loaded
                                resolve(true);
                                return;
                            }

                            // For non-image file types (AUDIO, DOCUMENT, OTHER), skip image validation
                            const isImage = type_to_extensions["IMAGE"].includes(fileExtension);
                            if (!isImage) {
                                // No image validation needed for non-image files
                                resolve(true);
                                return;
                            }

                            // For images, do the existing validation
                            const img = new Image();
                            img.onload = () => {
                                const threshold = 0.01; // Allowable margin of error
                                const calculatedAspectRatio = img.width / img.height;
                                const aspectRatioCheck = expectedAspectRatio == null || Math.abs(calculatedAspectRatio - expectedAspectRatio) <= threshold
                                if (!aspectRatioCheck) console.warn(`File ${file.name} has aspect ratio ${calculatedAspectRatio} which is ${aspectRatioCheck ? "within" : "outside of"} the threshold of ${threshold} of the expected aspect ratio of ${expectedAspectRatio}`);
                                
                                const orientation = img.width > img.height ? "LANDSCAPE" : "PORTRAIT";
                                const orientationCheck = (requirements == undefined || requirements.orientation == undefined) || (requirements != undefined && requirements.orientation != null && orientation == requirements.orientation);
                                if (!orientationCheck) console.warn(`File ${file.name} has orientation ${orientation}, it is expected to be ${requirements.orientation}`)
                                
                                if (aspectRatioCheck && orientationCheck) {
                                    resolve(true);
                                } else {
                                    let errorMessage = ""
                                    if (requirements != undefined) {
                                        if (!aspectRatioCheck) {
                                            if (props.targetImage != null) {
                                                errorMessage = `Invalid size, example ${props.targetImage.width} x ${props.targetImage.height}.`
                                            } else {
                                                errorMessage = `Invalid aspect ratio - ${requirements.aspectRatio} required`
                                            }
                                        }
                                    }
                                    setErrorMessage(errorMessage);
                                    reject(errorMessage);
                                }
                            }

                            img.onerror = () => {
                                setErrorMessage(`Unexpected error, try again later (CODE 1)`)
                                reject(`File ${file.name} could not be loaded.`);
                            }

                            img.src = URL.createObjectURL(file);
                        })                            
                    }));
                } else {
                    console.warn("No requirements specified")
                }

                // pprepare teh form data for upload to azure
                const formData=new FormData();
                Array.from(files).forEach(element => {
                    formData.append("files", element)
                });

                // upload to azure
                const uploadResponse = await axios.post("/api/azure_upload", formData, {
                    headers: {
                        container: props.connection.container,
                        relative_path: props.connection.relative_path,
                        target: JSON.stringify(props.targetImage),
                        variants: JSON.stringify(props.targetImageVariants)
                    }
                });
                console.log("Azure upload response:", uploadResponse.data);

                setTimeout(async () => {
                    try {
                        const mediaToReturn : media_type[] = []
                        for (const originalFilename of filenames) {
                            const originalExtension = originalFilename.split(".").pop()?.toLowerCase() || "";
                            const isVideo = type_to_extensions["VIDEO"].includes(originalExtension);
                            const isImage = type_to_extensions["IMAGE"].includes(originalExtension);
                            const isAudio = type_to_extensions["AUDIO"].includes(originalExtension);

                            let finalFilename = originalFilename.split(".")[0];

                            if (isImage) {
                                // Convert images to webp
                                finalFilename = `${finalFilename}.webp`;
                            } else {
                                // Keep original extension for videos, audio, documents, and other files
                                finalFilename = `${finalFilename}.${originalExtension}`;
                            }

                            // remove any %20 or space with a -
                            finalFilename = finalFilename.replace(/%20/g, "-").replace(/ /g, "-")

                            const url = `https://${process.env.NEXT_PUBLIC_STORAGE_ACCOUNT}.blob.core.windows.net/${props.connection.container}/${props.connection.relative_path}/${encodeURIComponent(finalFilename)}`
                            console.debug(`Obtaining metadata for url ${url}`)

                            if (isVideo) {
                                // For videos, we don't need to wait for metadata loading like images
                                mediaToReturn.push({
                                    code: uuid(),
                                    name: finalFilename,
                                    url,
                                    urlRelative: `${props.connection.container}/${props.connection.relative_path}/${finalFilename}`,
                                    type: MediaType.VIDEO,
                                    size: "RECTANGLE_HORIZONTAL"
                                })
                            } else if (isAudio) {
                                // For audio files, no dimension metadata needed
                                mediaToReturn.push({
                                    code: uuid(),
                                    name: finalFilename,
                                    url,
                                    urlRelative: `${props.connection.container}/${props.connection.relative_path}/${finalFilename}`,
                                    type: MediaType.AUDIO,
                                    size: "SQUARE"
                                })
                            } else if (!isImage) {
                                // For documents and other non-image files, no dimension metadata needed
                                // Use IMAGE type as fallback since media_type doesn't have DOCUMENT
                                mediaToReturn.push({
                                    code: uuid(),
                                    name: finalFilename,
                                    url,
                                    urlRelative: `${props.connection.container}/${props.connection.relative_path}/${finalFilename}`,
                                    type: MediaType.IMAGE, // Fallback - ideally we'd have a DOCUMENT type
                                    size: "SQUARE"
                                })
                            } else {
                                // For images, do the existing metadata checking
                                const getMetaData = (url: string, maxAttempts: number = 20, interval: number = 2000) =>
                                    new Promise<HTMLImageElement>((resolve, reject) => {
                                        let attempt = 0;

                                        const checkImage = () => {
                                        const img = new Image();
                                        img.onload = () => resolve(img);
                                        img.onerror = () => {
                                            if (attempt < maxAttempts) {
                                            attempt++;
                                            setTimeout(checkImage, interval);
                                            } else {
                                            reject(new Error(`Image at ${url} failed to load after ${maxAttempts} attempts.`));
                                            }
                                        };
                                        img.src = url;
                                        };

                                        checkImage();
                                    }
                                );

                                const img = await getMetaData(url);
                                mediaToReturn.push({
                                    code: uuid(),
                                    name: finalFilename,
                                    url,
                                    urlRelative: `${props.connection.container}/${props.connection.relative_path}/${finalFilename}`,
                                    type: MediaType.IMAGE,
                                    size: img.width == img.height ? "SQUARE" :
                                    (img.width >  img.height ? "RECTANGLE_HORIZONTAL" : "RECTANGLE_VERTICAL")
                                })
                            }
                        }
                        // show complete on the talking point
                        console.log("Uploads to azure complete.")
                        await props.onUploadCompleteAsync(mediaToReturn)
                        setUploadingActive(false);
                    } catch (error) {
                        console.error("FileUploader setTimeout callback error:", error)
                        setUploadingActive(false);
                        setHasError(true);
                        setErrorMessage("Upload processing failed");
                    }
                }, 4000)

            } catch (error) {
                console.error("FileUploader upload error:", error)
                setUploadingActive(false);
                setHasError(true);
                setErrorMessage("Upload failed - check console for details");
            }
        }
    };

    // Build accept string for file input
    const buildAcceptString = (): string => {
        if (!props.acceptOnly) return "*";

        if (props.acceptOnly.types && props.acceptOnly.types.length > 0) {
            // Multiple types - combine extensions
            let extensions: string[] = [];
            props.acceptOnly.types.forEach(t => {
                extensions = extensions.concat(type_to_extensions[t].map(ext => `.${ext}`));
            });
            return extensions.join(",");
        } else if (props.acceptOnly.type) {
            // Single type
            return type_to_extensions[props.acceptOnly.type].map(ext => `.${ext}`).join(",");
        }
        return "*";
    };

    if (props.minimal) {
        const fileCount = Array.isArray(props.value) ? props.value.length : (props.value ? 1 : 0);
        const hasValue = fileCount > 0;

        const handleClick = () => {
            document.getElementById(`input-file-upload-${props.id}`)?.click();
        };

        return (
            <div
            className={cn(
                "relative border border-dashed rounded-md px-4 py-2 inline-flex items-center justify-center text-sm cursor-pointer select-none transition-all",
                hasValue ? "bg-primary text-white" : "bg-muted text-muted-foreground",
                props.className
            )}
            onClick={handleClick}
            >
            {uploadingActive ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            ) : hasValue ? (
                <span className="font-medium">{fileCount}</span>
            ) : (
                <UploadIcon className="h-4 w-4" />
            )}

            {hasValue && (
                <button
                type="button"
                className="absolute -top-2 -right-2 p-1 rounded-full cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow"
                onClick={(e) => {
                    e.stopPropagation();
                    if (props.onRemoveAsync) {
                        props.onRemoveAsync(props.value || []);
                    }
                }}
                >
                <XIcon className="h-3.5 w-3.5" />
                </button>
            )}

            <input
                id={`input-file-upload-${props.id}`}
                className="hidden"
                type="file"
                multiple={props.allowMultiple}
                accept={buildAcceptString()}
                onInput={async (e) => {
                    const input = e.target as HTMLInputElement;
                    if (input.files) {
                        setUploadingActive(true);
                        await handleDrop(input.files);
                        setTimeout(() => {
                            setUploadingActive(false);
                        }, 4000)
                    }
                }}
            />
            </div>
        );
        }

    return (
        <>
        <div className={cn("relative flex flex-col items-center text-center rounded-lg", props.value == null ? "border-primary border-dashed border rounded-xl" : "", props.className)} id="form-file-upload" onDragEnter={handleDrag} onSubmit={(e) => e.preventDefault()}>
            <input className="hidden"
                accept={buildAcceptString()}
                type="file" id={`input-file-upload-${props.id}`} multiple={true}
                onInput={async (event: React.ChangeEvent<HTMLInputElement>) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (event.target.files != null) {
                        await handleDrop(event.target.files)
                    }
                }} />
                <label id="label-file-upload" className={classNames("flex justify-center items-center h-full w-full", dragActive ? "bg-white" : "")} htmlFor={`input-file-upload-${props.id}`}>
                <div className="cursor-pointer h-full flex flex-col items-center justify-center space-y-2 w-full rounded-xl">
                {
                    uploadingActive ? (
                        <div className={classNames("flex items-center justify-center", props.imageClassName)}>
                            <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-orange-600" />
                        </div>
                    ) :
                    hasError &&
                        <div className={classNames("flex items-center justify-center", props.imageClassName)}>
                        {
                            errorMessage != null ? 
                            (
                                <span className="text-red-800">{errorMessage}</span>
                            ) :
                            (
                               <FileWarningIcon />
                            )
                        }
                        </div>
                }
                {   !uploadingActive && !hasError && !isNullOrUndefined(props.value) && props.value.length != 0 
                    && (
                        includePreview ?
                        <>
                        <div className={classNames("relative h-full w-full rounded-lg", props.imageClassName)}>
                            <NextImage.default 
                                src={ Array.isArray(props.value) ? props.value[0] : props.value }
                                style={{ 
                                    objectFit: props.objectFit ?? "contain", 
                                    height: "100%", 
                                    ...props.style // Merge additional styles here
                                }}
                                className={props.imageClassName}
                                fill={true} alt={""} />
                        </div>
                        </> : (
                            props.onRemoveAsync != null ? (
                                <Button type="button" {...props.buttonProps} onClick={async () => {
                                    setTimeout(async () => {
                                        if (props.value == null || props.onRemoveAsync == null) return;
                                        await props.onRemoveAsync(props.value)
                                    }, 500)
                                }}>Remove</Button>
                            ) : <span>Uploaded</span> 
                        )
                    )
                }
                {!uploadingActive && !hasError && (props.value == null || props.value.length === 0) && (
                    props.children ? props.children : (
                    includePreview ? (
                        <div className={classNames("flex items-center justify-center", props.imageClassName)}>
                            <UploadIcon />
                        </div>
                        ) : (
                        <Button type="button" onClick={() => {
                            document.getElementById(`input-file-upload-${props.id}`)?.click();
                        }} {...props.buttonProps}>Upload</Button>
                        )
                    ))}
                </div> 
                </label>
            { dragActive && <div id={`drag-file-element-${props.id}`} className="absolute w-full h-full" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} 
            onDrop={async (event: React.DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                event.stopPropagation();
                if (event.dataTransfer.files != null) {
                    await handleDrop(event.dataTransfer.files)
                }
            }}></div> }
        </div>
        </>
    )
}

export default FileUploader;