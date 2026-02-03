'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PDFPrintButton from "@/app/(site)/components/0_PDFS/_components/PDFPrintButton";
import PDFSaveButton from "@/app/(site)/components/0_PDFS/_components/PDFSaveButton";
import { Truck, Package, DollarSign } from "lucide-react";

type ReturnShippingLabel = {
    id: string;
    label_id: string;
    label_download: {
        pdf: string;
        png?: string;
        zpl?: string;
    };
    tracking_number: string;
    whoPayShipping: string;
    cost: {
        amount: number;
        currency: string;
    };
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
};

type ReturnShippingLabelsProps = {
    labels: ReturnShippingLabel[];
    className?: string;
};

const pdfUrl = (url: string): string => {
    return `/api/proxy-label?url=${encodeURIComponent(url)}`;
};

const ReturnShippingLabels: React.FC<ReturnShippingLabelsProps> = ({ labels, className }) => {
    if (!labels || labels.length === 0) {
        return null;
    }

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase()
        }).format(amount);
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                <h3 className="font-medium">Return Shipping Labels</h3>
            </div>

            {labels.map((label) => (
                <Card key={label.id}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                            <span>Return Label</span>
                            <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                                <DollarSign className="h-4 w-4" />
                                {formatCurrency(label.cost.amount, label.cost.currency)}
                                <span className="text-xs">
                                    ({label.whoPayShipping} pays)
                                </span>
                            </div>
                        </CardTitle>
                        <CardDescription>
                            Tracking: {label.tracking_number}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Boxes Information */}
                        <div className="space-y-3">
                            <h4 className="font-medium flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Packages ({label.boxes.length})
                            </h4>
                            
                            {label.boxes.map((box) => (
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

                        {/* Label Actions */}
                        {label.label_download?.pdf && (
                            <div className="flex gap-2 pt-2 border-t">
                                <PDFPrintButton
                                    variant="outline"
                                    size="sm"
                                    pdfUrl={pdfUrl(label.label_download.pdf)}
                                    className="flex-1"
                                />
                                <PDFSaveButton
                                    variant="outline"
                                    size="sm"
                                    pdfUrl={pdfUrl(label.label_download.pdf)}
                                    defaultFileName={`return-label-${label.tracking_number}.pdf`}
                                    label="Download"
                                    className="flex-1"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}

            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                <p className="font-medium mb-1">📦 Return Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Print the return shipping label(s) above</li>
                    <li>Package your items in the boxes as indicated</li>
                    <li>Attach the printed label to each package</li>
                    <li>Drop off at your carrier&apos;s location or schedule pickup</li>
                </ol>
            </div>
        </div>
    );
};

export default ReturnShippingLabels;