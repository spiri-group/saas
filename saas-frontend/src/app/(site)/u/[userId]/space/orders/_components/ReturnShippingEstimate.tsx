'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, CreditCard } from "lucide-react";
import { useState } from "react";
import StripePayment from "@/app/(site)/components/StripePayment";
import CurrencySpan from "@/components/ux/CurrencySpan";

type ReturnShippingEstimate = {
    id: string;
    rate_id: string;
    whoPayShipping: string;
    cost: {
        amount: number;
        currency: string;
    };
    setupIntentId?: string;
    setupIntentClientSecret?: string;
    boxes: Array<{
        id: string;
        code: string;
        dimensions_cm: {
            depth: number;
            width: number;
            height: number;
        };
        used_weight: number;
        items: Array<{
            id: string;
            name: string;
            quantity: number;
        }>;
    }>;
    status: string;
};

type ReturnShippingEstimateProps = {
    estimate: ReturnShippingEstimate & {
        setupIntentId?: string;
        setupIntentClientSecret?: string;
    };
    className?: string;
    onPaymentComplete?: () => void;
};

const ReturnShippingEstimate: React.FC<ReturnShippingEstimateProps> = ({ estimate, className, onPaymentComplete }) => {
    const [showPayment, setShowPayment] = useState(false);

    const getStatusBadge = () => {
        switch (estimate.status) {
            case 'pending_payment':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Payment Required</Badge>;
            case 'ready_for_labels':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ready</Badge>;
            case 'labels_generated':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Labels Ready</Badge>;
            default:
                return <Badge variant="outline">{estimate.status}</Badge>;
        }
    };

    const requiresCustomerPayment = estimate.whoPayShipping === 'customer' && estimate.status === 'pending_payment';

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                <h3 className="font-medium">Return Shipping</h3>
                {getStatusBadge()}
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>Return Shipping Cost</span>
                        <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                            <CurrencySpan value={estimate.cost} />
                            <span className="text-xs">
                                ({estimate.whoPayShipping} pays)
                            </span>
                        </div>
                    </CardTitle>
                    <CardDescription>
                        {requiresCustomerPayment ? 
                            "Payment required to generate return shipping labels" :
                            "Shipping labels will be generated automatically"
                        }
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Boxes Information */}
                    <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Packages ({estimate.boxes.length})
                        </h4>
                        
                        {estimate.boxes.map((box) => (
                            <div key={box.id} className="border rounded-lg p-3 bg-muted/20">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium">{box.code}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {box.dimensions_cm.depth}×{box.dimensions_cm.width}×{box.dimensions_cm.height}cm
                                        <br />
                                        {box.used_weight}kg
                                    </div>
                                </div>
                                
                                <div className="text-sm space-y-1">
                                    {box.items.map((item) => (
                                        <div key={item.id} className="text-muted-foreground">
                                            {item.name} (×{item.quantity})
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Payment Section */}
                    {requiresCustomerPayment && (
                        <div className="pt-4 border-t">
                            {!showPayment ? (
                                <Button 
                                    onClick={() => setShowPayment(true)}
                                    className="w-full"
                                    size="lg"
                                >
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Pay for Return Shipping
                                </Button>
                            ) : (
                                <div className="space-y-4">
                                    <h4 className="font-medium">Complete Payment</h4>
                                    <StripePayment
                                        type="SETUP"
                                        clientSecret={estimate.setupIntentClientSecret!}
                                        onCancel={() => setShowPayment(false)}
                                        onAlter={() => {
                                            setShowPayment(false);
                                            if (onPaymentComplete) {
                                                onPaymentComplete();
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {!requiresCustomerPayment && (
                <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">📋 Next Steps:</p>
                    <ul className="list-decimal list-inside space-y-1">
                        {estimate.status === 'ready_for_labels' && (
                            <li>Shipping labels will be generated automatically</li>
                        )}
                        {estimate.status === 'labels_generated' && (
                            <>
                                <li>Print the return shipping labels</li>
                                <li>Package your items as indicated above</li>
                                <li>Attach labels and drop off at carrier location</li>
                            </>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ReturnShippingEstimate;