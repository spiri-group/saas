'use client';

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PackageIcon, CalendarClockIcon } from "lucide-react";
import UpsertProductReturnPolicies from "./ProductReturnPolicies";
import UpsertServiceCancellationPolicies from "./ServiceCancellationPolicies";

type Props = {
    merchantId: string;
}

const ReturnAndCancellationPoliciesWrapper: React.FC<Props> = ({ merchantId }) => {
    const [activeTab, setActiveTab] = useState<"products" | "services">("products");

    return (
        <DialogContent className="h-[700px] w-[900px] flex flex-col gap-3">
            <div className="flex flex-col gap-2">
                <DialogTitle>Return & Cancellation Policies</DialogTitle>
                <DialogDescription>
                    Manage refund policies for physical products and cancellation policies for service appointments
                </DialogDescription>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "products" | "services")} className="flex-1 min-h-0 flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="products" className="flex items-center gap-2">
                        <PackageIcon className="h-4 w-4" />
                        Product Returns
                    </TabsTrigger>
                    <TabsTrigger value="services" className="flex items-center gap-2">
                        <CalendarClockIcon className="h-4 w-4" />
                        Service Cancellations
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="products" className="flex-1 min-h-0">
                    <UpsertProductReturnPolicies merchantId={merchantId} />
                </TabsContent>

                <TabsContent value="services" className="flex-1 min-h-0">
                    <UpsertServiceCancellationPolicies merchantId={merchantId} />
                </TabsContent>
            </Tabs>
        </DialogContent>
    );
};

export default ReturnAndCancellationPoliciesWrapper;
