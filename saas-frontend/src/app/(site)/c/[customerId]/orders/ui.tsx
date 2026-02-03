'use client';

import UseOrders from "@/app/(site)/m/_components/Order/hooks/UseOrders";
import { Panel, PanelContent, PanelHeader } from "@/components/ux/Panel";
import OrderRow from "./_components/OrderRow";

type Props = {
    userEmail: string;
}

const UI: React.FC<Props> = (props) => {
    const orders = UseOrders(props.userEmail);

    return (
       <Panel className="mt-3 mr-3">
            <PanelHeader>
                Orders
            </PanelHeader>
            <PanelContent className="space-y-2">
                {(orders.data ?? []).map((order) => (
                    <OrderRow 
                        key={order.id} 
                        order={order}
                            />
                ))}
            </PanelContent>
       </Panel>        
    )
}

export default UI;