'use client';

import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { recordref_type } from "@/utils/spiriverse";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useUpdateProductLiveStatus } from "../hooks/UseUpdateProductLiveStatus";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";

const ListProductSuccess: React.FC<{ forObject: recordref_type }> = ({ forObject }) => {
    const { merchant_slug } = useParams();
    const [isLive, setIsLive] = useState(false);
    const updateLiveStatus = useUpdateProductLiveStatus();

    const handleMakeLive = async () => {
        const result = await updateLiveStatus.mutateAsync({
            merchantId: forObject.partition as string,
            productId: forObject.id,
            isLive: true
        });

        if (result.success) {
            setIsLive(true);
        }
    };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold">Product Created!</h2>
            </DialogHeader>
            <DialogDescription className="text-center space-y-3">
                <p>Your product has been saved successfully.</p>
                {!isLive ? (
                    <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <EyeOff className="h-4 w-4 text-amber-600" />
                        <span className="text-sm text-amber-800">
                            This product is currently in <strong>draft</strong> and not visible to customers.
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <Eye className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800">
                            Your product is now <strong>live</strong> and visible to customers!
                        </span>
                    </div>
                )}
            </DialogDescription>
            <DialogFooter className="flex flex-col gap-2 sm:flex-col">
                {!isLive && (
                    <Button
                        onClick={handleMakeLive}
                        disabled={updateLiveStatus.isPending}
                        className="w-full"
                        variant="default"
                    >
                        {updateLiveStatus.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Making Live...
                            </>
                        ) : (
                            <>
                                <Eye className="mr-2 h-4 w-4" />
                                Make Product Live
                            </>
                        )}
                    </Button>
                )}
                <div className="flex gap-2 w-full">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                            window.location.href = `/m/${merchant_slug}/product/${forObject.id}`;
                        }}
                    >
                        View Product
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                            window.location.href = `/m/${merchant_slug}`;
                        }}
                    >
                        Back to Profile
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
    );
};

export default ListProductSuccess;