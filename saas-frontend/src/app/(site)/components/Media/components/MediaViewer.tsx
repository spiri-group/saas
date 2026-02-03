import React, { useState } from 'react';
import { CommunicationModeType, media_type, message_type } from '@/utils/spiriverse';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import ChatControl from '@/components/ux/ChatControl';
import CancelDialogButton from '@/components/ux/CancelDialogButton';
import Image from "next/image";
import { cn } from '@/lib/utils';

type MediaViewerProps = {
    files: media_type[],
    message: message_type,
    merchantId?: string,
    className?: string
}

const MediaViewer: React.FC<MediaViewerProps> = (props) => {
    const [selectedImageDetails, setSelectedImageDetails] = useState<media_type | null>(null)

    return (
        <>
            <div className={cn("flex flex-wrap", props.className)}>
            {props.files.map((file) => (
                <div
                key={file.url}
                className="w-auto h-24 mb-2 mr-2 rounded-md border border-gray-200 bg-muted p-2 cursor-pointer"
                onClick={() => setSelectedImageDetails(file)}
                >
                <img
                    alt="media"
                    src={file.url}
                    className="h-full max-w-[120px] object-contain"
                />
                </div>
            ))}
            </div>
            {selectedImageDetails && (
                <Dialog open={!!selectedImageDetails} onOpenChange={() => setSelectedImageDetails(null)}>
                    <DialogContent className="flex flex-col p-4 h-[600px] w-[800px]">
                        <DialogHeader>
                            <DialogTitle>Media Viewer</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-row space-x-4 min-h-0 flex-grow">
                            <div className="flex flex-col space-y-2">
                                { props.files.length > 1 &&
                                <Carousel className={cn((props.files?.length ?? 0) > 1 ? "mx-6" : "")}>
                                    <CarouselContent className="p-2 flex flex-row">
                                        {props.files.map((file) => (
                                            <CarouselItem key={file.url} className="p-1 h-16 relative">
                                                <Image
                                                    src={file.url}
                                                    className="cursor-pointer"
                                                    fill={true}
                                                    objectFit='contain'
                                                    alt={file.title ?? ""}
                                                    onClick={() => setSelectedImageDetails(file)}
                                                />
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    { (props.files?.length ?? 0) > 1 && <CarouselNext />}
                                    { (props.files?.length ?? 0) > 1 && <CarouselPrevious />}
                                </Carousel>
                                }
                                <div className="flex flex-col space-y-2 mt-4 h-full w-[300px]">
                                    <div className="relative h-[200px]">
                                        <Image 
                                            fill={true}
                                            objectFit='contain'
                                            src={selectedImageDetails.url}
                                            alt={''} />
                                    </div>
                                    <div className="flex flex-row justify-between space-x-2 items-center">
                                        <span className="text-lg font-semibold">{selectedImageDetails.title}</span>
                                    </div>
                                    { selectedImageDetails.hashtags && selectedImageDetails.hashtags.length > 0 &&
                                    <ul className="flex flex-row justify-start space-x-1 pl-1 mt-2">
                                        {selectedImageDetails.hashtags?.slice(0, 5).map((hashtag) => (
                                            <li key={hashtag} className="text-xs font-bold">#{hashtag}</li>
                                        ))}
                                    </ul>
                                    }
                                    <span className="text-sm bg-muted-foreground/10 rounded-md flex-grow overflow-y-auto p-3">{selectedImageDetails.description}</span>
                                </div>
                            </div>
                            <ChatControl
                                className="flex-grow pl-4"
                                allowResponseCodes={false}
                                title="Share your thoughts"
                                vendorSettings={{ withUserName: false, withCompanyLogo: false, withCompanyName: false }}
                                forObject={props.message.ref}
                                withDiscussion={false}
                                withTitle={true}
                                merchantId={props.merchantId}
                                defaultMode={CommunicationModeType.PLATFORM}
                                withAttachments={false}
                            />
                        </div>
                        <CancelDialogButton />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

export default MediaViewer;
