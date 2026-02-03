import UseRefundOrder from "@/app/(site)/components/RequestOrder/hooks/UseRefundOrder"
import UseOrder from "@/app/(site)/m/_components/Order/hooks/UseOrder"
import { Button } from "@/components/ui/button"
import { DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import CurrencySpan from "@/components/ux/CurrencySpan"
import RefundInput from "@/components/ux/RefundInput"
import BouncingDots from "@/icons/BouncingDots"
import { isNullOrUndefined } from "@/lib/functions"
import { recordref_type } from "@/utils/spiriverse"
import { DateTime } from "luxon"
import { useWatch } from "react-hook-form"

type BLProps = {
    order: {
        ref: recordref_type
        id: string, customerEmail: string
    }
}

const useBL = ({
    order: { id, customerEmail }
}: BLProps) => {

    const order = UseOrder(id, customerEmail);
    const refund = UseRefundOrder(order.data);

    useWatch({
        control: refund.form.control,
        name: "lines",
    })

    return {
        ready: !isNullOrUndefined(order.data),
        data: order.data,
        refund
    }
}

type Props = BLProps & {
    abortDialog: () => void
}

const UI: React.FC<Props> = (props) => {
    const bl = useBL(props);

    const as_currency = (amount: number) => {
        if (!bl.data) throw `No data available to convert amount to currency`;
        return {
            amount: parseFloat(amount.toFixed(2)),
            currency: bl.data!.paymentSummary.currency
        }
    }

    if (!bl.ready) return <DialogContent><BouncingDots numberOfDots={5} /></DialogContent>;

    const total_refunded = isNullOrUndefined(bl.refund.values.lines) ? 0 : bl.refund.values.lines.reduce((acc, line) => acc + line.refund.amount, 0);
    const recieved = (bl.data?.paymentSummary.payout.recieves ?? 0) - total_refunded;

    return (
        <DialogContent>
            <div className="rounded-lg bg-gray-100 p-4">
                {bl.ready && !isNullOrUndefined(bl.data) && (
                  <>
                    <div className="flex flex-row justify-between">
                      <div className="flex flex-col space-y-1 text-sm">
                        <span>{bl.data.code}</span>
                        <span>{bl.data.customer.name}</span>
                      </div>
                      <div className="flex flex-col space-y-1 text-sm">
                        <span>{DateTime.fromISO(bl.data.createdDate).toLocaleString({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </>  
                )}
            </div>
            <Table>
                <TableHeader className="sticky">
                    <TableHead>Description</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Refunded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableHeader>
                <TableBody>
                {bl.ready && bl.data?.lines.map((line, idx) => {
                    const refund = !isNullOrUndefined(bl.refund.values.lines) ? bl.refund.values.lines.find((l) => l.id === line.id) : undefined;
                    return (
                    <TableRow key={line.id}>
                        <TableCell className="text-sm font-bold">{line.descriptor}</TableCell>
                        <TableCell className="text-xs">{line.quantity} @ <CurrencySpan value={line.price} /></TableCell>
                        <TableCell className="text-xs"><CurrencySpan value={line.tax} /></TableCell>
                        <TableCell className="text-right">
                            { refund && (
                                <CurrencySpan
                                    className="font-bold" 
                                    value={{
                                        amount: line.subtotal.amount + line.tax.amount,
                                        currency: line.subtotal.currency
                                    }} 
                                />
                            )}
                        </TableCell>
                        <TableCell>
                            <CurrencySpan 
                                withAnimation={true}
                                value={refund ? refund.refund : {
                                    amount: 0,
                                    currency: line.subtotal.currency
                                }} />
                        </TableCell>
                        <TableCell>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button className="px-0" variant="link">Refund</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto">
                                    <RefundInput
                                        originalAmount={{
                                            amount: line.subtotal.amount + line.tax.amount,
                                            currency: line.subtotal.currency
                                        }}
                                        value={refund?.refund}
                                        onChange={(value) => {
                                            bl.refund.form.setValue(`lines.${idx}.refund`, value, { shouldValidate : true })
                                            bl.refund.form.setValue(`lines.${idx}.dirty`, true, { shouldValidate : true })
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                        </TableCell>
                    </TableRow>
                    )
                })}
                </TableBody>
            </Table>
            <h2 className="font-bold text-sm">Merchant Summary</h2>
            <Table>
                <TableHeader>
                    <TableHead>Order Value</TableHead>
                    <TableHead>Fees amount</TableHead>
                    <TableHead>Tax on Fees</TableHead>
                    <TableHead>Refunded</TableHead>
                    <TableHead className="text-right">Recieved</TableHead>
                </TableHeader>
                <TableBody>
                    {bl.ready && !isNullOrUndefined(bl.data) && (
                    <TableRow>
                        <TableCell className="font-bold"><CurrencySpan value={as_currency(bl.data?.paymentSummary.payout.subtotal ?? 0)} /></TableCell>
                        <TableCell className="text-xs"><CurrencySpan value={as_currency(bl.data?.paymentSummary.payout.fees ?? 0)} /></TableCell>
                        <TableCell className="text-xs"><CurrencySpan value={as_currency(bl.data?.paymentSummary.payout.tax ?? 0)} /></TableCell>
                        <TableCell className="text-xs"><CurrencySpan value={as_currency(total_refunded)} /></TableCell>
                        <TableCell className="text-right font-bold"><CurrencySpan withAnimation={true} value={as_currency(recieved)} /></TableCell>
                    </TableRow>
                    )}
                </TableBody>
            </Table>
            <DialogFooter className="flex flex-row space-x-3">
                <Button className="flex-none w-32" variant="destructive" onClick={props.abortDialog}>Close</Button>
                <Button 
                    variant={bl.refund.status.button.variant}
                    className="flex-grow" 
                    disabled={bl.refund.status.formState === "processing"}
                    onClick={async () => {
                        await bl.refund.status.submit(bl.refund.mutation.mutateAsync, bl.refund.values, () => {
                            bl.refund.form.reset();
                            props.abortDialog();
                        });
                    }}
                    >{bl.refund.status.formState === "idle" ? `Confirm changes` : bl.refund.status.button.title}</Button>
            </DialogFooter>
        </DialogContent>
    );
}

export default UI;