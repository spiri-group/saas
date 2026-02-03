'use client';

import React, { useState } from 'react';
import { DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { PlusIcon, CreditCardIcon, TrashIcon, LoaderIcon, ArrowLeftIcon } from "lucide-react";
import StripeLogo from "@/icons/stripe-logo";
import useMerchantCards from './hooks/UseMerchantCards';
import { useDeleteCard, useSetDefaultCard } from './hooks/UseCardOperations';
import AddCardForm from './components/AddCardForm';

type Props = {
    merchantId: string;
}

const MerchantCardsComponent: React.FC<Props> = ({ merchantId }) => {
    const [isAddingCard, setIsAddingCard] = useState(false);

    // Use actual hooks for data and operations
    const { data: cards = [], isLoading, error, refetch } = useMerchantCards(merchantId);
    const deleteCardMutation = useDeleteCard();
    const setDefaultCardMutation = useSetDefaultCard();

    const formatCardBrand = (brand: string) => {
        return brand.charAt(0).toUpperCase() + brand.slice(1);
    };

    const getCardIcon = () => {
        // Could use actual brand icons later
        return <CreditCardIcon className="h-5 w-5" />;
    };

    const handleAddCardSuccess = () => {
        setIsAddingCard(false);
        refetch(); // Refresh the cards list
    };

    const handleDeleteCard = (cardId: string) => {
        if (confirm('Are you sure you want to delete this card?')) {
            deleteCardMutation.mutate({ merchantId, cardId });
        }
    };

    const handleSetDefault = (cardId: string) => {
        setDefaultCardMutation.mutate({ merchantId, cardId });
    };

    if (isLoading) {
        return (
            <DialogContent className="max-w-none w-[600px] max-h-[700px]">
                <DialogHeader>
                    <h2 className="text-xl font-bold">Manage Payment Cards</h2>
                </DialogHeader>
                <div className="flex items-center justify-center py-8">
                    <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading cards...</span>
                </div>
                <div className="flex justify-start">
                    <CancelDialogButton />
                </div>
            </DialogContent>
        );
    }

    if (error) {
        return (
            <DialogContent className="max-w-none w-[600px] max-h-[700px]">
                <DialogHeader>
                    <h2 className="text-xl font-bold">Manage Payment Cards</h2>
                </DialogHeader>
                <div className="text-center py-8">
                    <p className="text-destructive">Failed to load payment cards</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Please try again later or contact support if the problem persists
                    </p>
                </div>
                <div className="flex justify-start">
                    <CancelDialogButton />
                </div>
            </DialogContent>
        );
    }

    // Show Add Card form
    if (isAddingCard) {
        return (
            <DialogContent className="max-w-none w-[500px]">
                <DialogHeader className="flex flex-row items-center space-x-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingCard(false)}
                        className="p-1 h-auto"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                    </Button>
                    <h2 className="text-xl font-bold">Add Payment Card</h2>
                </DialogHeader>

                <div className="py-4">
                    <AddCardForm
                        merchantId={merchantId}
                        onSuccess={handleAddCardSuccess}
                        onCancel={() => setIsAddingCard(false)}
                    />
                </div>

                <div className="flex justify-end items-center mt-2">
                    <a
                        href="https://stripe.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md hover:border-foreground/20"
                    >
                        <span className="text-xs">Secured by</span>
                        <StripeLogo height={36} />
                    </a>
                </div>
            </DialogContent>
        );
    }

    return (
        <DialogContent className="max-w-none w-[600px] max-h-[700px]">
            <DialogHeader className="flex flex-row justify-between items-center">
                <h2 className="text-xl font-bold">Manage Payment Cards</h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingCard(true)}
                >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Card
                </Button>
            </DialogHeader>

            <div className="space-y-4 max-h-96 overflow-y-auto">
                {cards.length === 0 ? (
                    <div className="text-center py-8">
                        <CreditCardIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No payment cards added yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Add a card to handle subscription payments and other business expenses
                        </p>
                    </div>
                ) : (
                    cards.map((card) => (
                        <Card key={card.id} className="relative">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        {getCardIcon()}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {formatCardBrand(card.brand)} •••• {card.last4}
                                                </span>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {card.funding} • Expires {card.exp_month.toString().padStart(2, '0')}/{card.exp_year}
                                                {card.country && ` • ${card.country}`}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        {cards.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSetDefault(card.paymentMethodId)}
                                                disabled={setDefaultCardMutation.isPending}
                                            >
                                                {setDefaultCardMutation.isPending ? (
                                                    <LoaderIcon className="h-3 w-3 animate-spin mr-2" />
                                                ) : null}
                                                Set Default
                                            </Button>
                                        )}
                                        {cards.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteCard(card.paymentMethodId)}
                                                disabled={deleteCardMutation.isPending}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                {deleteCardMutation.isPending ? (
                                                    <LoaderIcon className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <TrashIcon className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <div className="flex justify-between items-center mt-4">
                <CancelDialogButton />
                <a
                    href="https://stripe.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md hover:border-foreground/20"
                >
                    <span className="text-xs">Secured by</span>
                    <StripeLogo height={36} />
                </a>
            </div>
        </DialogContent>
    );
};

export default MerchantCardsComponent;