'use client'

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Copy, Check, ExternalLink } from "lucide-react";
import UseCreateCheckoutLink from "../hooks/UseCreateCheckoutLink";
import CurrencySpan from "@/components/ux/CurrencySpan";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    merchantId: string;
    serviceId: string;
    serviceName: string;
    servicePrice: { amount: number; currency: string };
};

const CreateCheckoutLinkDialog: React.FC<Props> = ({ open, onOpenChange, merchantId, serviceId, serviceName, servicePrice }) => {
    const [customerEmail, setCustomerEmail] = useState("");
    const [expiresInHours, setExpiresInHours] = useState("24");
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const createLink = UseCreateCheckoutLink();

    const handleCreate = () => {
        createLink.mutate({
            vendorId: merchantId,
            serviceId,
            customerEmail,
            expiresInHours: parseInt(expiresInHours)
        }, {
            onSuccess: (data) => {
                if (data.checkoutUrl) {
                    setGeneratedLink(data.checkoutUrl);
                }
            }
        });
    };

    const handleCopy = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setCustomerEmail("");
        setExpiresInHours("24");
        setGeneratedLink(null);
        setCopied(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Checkout Link</DialogTitle>
                    <DialogDescription>
                        Generate a payment link for {serviceName} to send to your customer
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {!generatedLink ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="email">Customer Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="customer@example.com"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    We&apos;ll send the receipt and service details to this email
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="expires">Link Expires In</Label>
                                <Select value={expiresInHours} onValueChange={setExpiresInHours}>
                                    <SelectTrigger id="expires">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 hour</SelectItem>
                                        <SelectItem value="6">6 hours</SelectItem>
                                        <SelectItem value="24">24 hours</SelectItem>
                                        <SelectItem value="48">48 hours</SelectItem>
                                        <SelectItem value="168">7 days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Card className="p-3 bg-muted">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total Amount</span>
                                    <span className="text-lg font-bold">
                                        <CurrencySpan value={servicePrice} withAnimation={false} />
                                    </span>
                                </div>
                            </Card>

                            <Button
                                onClick={handleCreate}
                                className="w-full"
                                disabled={!customerEmail || createLink.isPending}
                            >
                                {createLink.isPending ? "Creating..." : "Generate Checkout Link"}
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label>Payment Link Generated!</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={generatedLink}
                                        readOnly
                                        className="font-mono text-xs"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCopy}
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Link copied to clipboard. Send this to {customerEmail} to complete payment.
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={handleClose}
                                >
                                    Close
                                </Button>
                                <Button
                                    className="flex-1"
                                    asChild
                                >
                                    <a href={generatedLink} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Preview
                                    </a>
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CreateCheckoutLinkDialog;
