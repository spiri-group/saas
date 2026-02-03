import { View, Text } from "@react-pdf/renderer"
import PageLayout, { PageLayoutStyles } from "../PageLayout"
import { order_type } from "@/utils/spiriverse"
import { isNullOrUndefined } from "@/lib/functions"
import { formatCurrency } from "@/components/ux/CurrencySpan"
import { DateTime } from "luxon"

export const InvoiceUI: React.FC<{order?: order_type}> = ({
    order
}) => {

    if (isNullOrUndefined(order)) {
        return <></>
    }

    const { paymentSummary: { currency, charged }  } = order
    const currency_string = (amount: number) => {
        return formatCurrency(amount, currency)
    }

    const colors = {
        accent: "#f6b041", // Spiriverse Yellow
        primary: "#bd202e", // Spiriverse Red
    }

    const DeliveryComponent = () => {
        if (isNullOrUndefined(order.delivery)) return <></>
        const { line1, city, state, postal_code, country } = order.delivery.addressComponents
        return (
            <View style={{display: "flex", flexDirection: "column", alignItems: "flex-start", maxWidth: "25%"}}>
                <Text style={[PageLayoutStyles.bold, {fontSize: "8px"}]}>Deliver To</Text>
                <Text style={[{fontSize: "10px", marginTop: 4}]}>{order.delivery.name}</Text>
                <Text style={[{fontSize: "10px", marginTop: 4}]}>{line1}</Text>       
                <Text style={[{fontSize: "10px", marginTop: 4}]}>
                    {postal_code} {city}, {state} {country}
                </Text>                          
            </View>
        )
    }

    const BillingComponent = () => {
        if (isNullOrUndefined(order.billing)) return <></>
        const { line1, city, state, postal_code, country } = order.billing.addressComponents
        return (
            <View style={{display: "flex", flexDirection: "column", alignItems: "flex-end", maxWidth: "25%"}}>
                <Text style={[PageLayoutStyles.bold, {fontSize: "8px"}]}>Invoice To</Text>
                <Text style={[{fontSize: "10px", marginTop: 4}]}>{order.billing.name}</Text>
                <Text style={[{fontSize: "10px", marginTop: 4}]}>{line1}</Text>
                <Text style={[{fontSize: "10px", marginTop: 4}]}>
                    {postal_code} {city}, {state} {country}
                </Text>
            </View>
        )
    }

    const lines = order.lines;
    const payments = order.payments;

    const tableHeaderStyles = {
        border: "1px solid #d0d0d0",
        padding: "8px",
        fontSize: "10px",
        backgroundColor: "#f0f0f0"
    };

    const tableContentStyles = {
        border: "1px solid #e0e0e0",
        padding: "8px",
        fontSize: "10px"
    };

    const ItemsTable = () => (
        <View style={{ marginTop: 20 }}>
            <Text style={[PageLayoutStyles.bold, { fontSize: 12 }]}>Items</Text>
            <View style={{ flexDirection: "row", marginTop: 10, borderBottom: "1px solid #d0d0d0" }}>
                <Text style={{ width: "40%", ...tableHeaderStyles }}>Description</Text>
                <Text style={{ width: "20%", ...tableHeaderStyles }}>Quantity</Text>
                <Text style={{ width: "20%", ...tableHeaderStyles }}>Price</Text>
                <Text style={{ width: "20%", ...tableHeaderStyles }}>Subtotal</Text>
            </View>
            {lines.map((line, index) => (
                <View key={index} style={{ flexDirection: "row", borderBottom: "1px solid #e0e0e0" }}>
                    <View style={{ width: "40%", ...tableContentStyles }}>
                        <Text style={PageLayoutStyles.bold}>{line.item_description}</Text>
                        <Text style={{ fontSize: 9, marginTop:5 }}>Sold by {line.merchant.name} ({line.soldFrom.state}, {line.soldFrom.country})</Text>
                    </View>
                    <Text style={{ width: "20%", ...tableContentStyles }}>{line.quantity}</Text>
                    <Text style={{ width: "20%", ...tableContentStyles }}>{currency_string(line.price.amount)}</Text>
                    <Text style={[{ width: "20%", ...tableContentStyles }, PageLayoutStyles.bold]}>{currency_string(line.price.amount * line.quantity)}</Text>
                </View>
            ))}
        </View>
    );

    const formatDate = (isoString: string) => {
        return DateTime.fromISO(isoString).toFormat("EEE d'th' MMM yyyy")
    }

    const PaymentsTable = () => (
        <View style={{ marginTop: 20 }}>
            <Text style={[PageLayoutStyles.bold, { fontSize: 12 }]}>Payments</Text>
            <View style={{ flexDirection: "row", marginTop: 10, borderBottom: "1px solid #d0d0d0" }}>
                <Text style={{ width: "20%", ...tableHeaderStyles }}>No</Text>
                <Text style={{ width: "30%", ...tableHeaderStyles }}>Method</Text>
                <Text style={{ width: "25%", ...tableHeaderStyles }}>Date</Text>
                <Text style={{ width: "25%", ...tableHeaderStyles }}>Amount</Text>
            </View>
            {payments.map((payment, index) => (
                <View key={index} style={{ flexDirection: "row", borderBottom: "1px solid #e0e0e0" }}>
                    <Text style={[{ width: "20%", ...tableContentStyles, fontWeight: "bold" }, PageLayoutStyles.bold]}>{payment.code}</Text>
                    <Text style={{ width: "30%", ...tableContentStyles }}>{payment.method_description}</Text>
                    <Text style={{ width: "25%", ...tableContentStyles }}>{formatDate(payment.date)}</Text>
                    <Text style={[{ width: "25%", ...tableContentStyles }, PageLayoutStyles.bold]}>{currency_string(payment.charge.paid)}</Text>
                </View>
            ))}
        </View>
    );

    return (
        <PageLayout
            bottomContent={
                <View style={{ flex:1, flexDirection: 'column', alignItems: 'flex-end'}}>
                    <Text style={[{fontSize: 12, color: "white"}]}>Subtotal: {currency_string(charged.subtotal)}</Text>
                    <Text style={[{fontSize: 12, color: "white", marginTop: "10px"}]}>Fees: {currency_string(charged.fees)}</Text>
                    <Text style={[{fontSize: 12, color: "white", marginTop: "10px"}]}>Tax: {currency_string(charged.tax)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: "10px"}}>
                        <Text style={[ PageLayoutStyles.bold, {fontSize: 16, color: colors.primary, }]}>
                            Grand Total
                        </Text>
                        <Text style={[ PageLayoutStyles.bold, {fontSize: 16, color: colors.accent, marginLeft: "5px"}]}>
                            {currency_string(charged.paid)}
                        </Text>
                    </View>
                </View>
            }
            topRightContent={
                <View style={{display: "flex", flexDirection: "column", alignItems: "flex-end"}}>
                    <View style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                        <Text style={[{fontSize: 14, color: "white"}]}>INVOICE</Text>
                        <Text style={[{marginLeft: 5, fontSize: 16, color: colors.accent}, PageLayoutStyles.bold]}>{order.code}</Text>
                    </View>
                    <Text style={[{fontSize: 12, color: "white", marginTop: "10px"}]}>{formatDate(order.createdDate)}</Text>
                </View>
            }
        >
            <View style={{ display: "flex", marginTop:20, flexDirection: "row", justifyContent: "space-between"}}>
                <DeliveryComponent />
                <BillingComponent />
            </View>
            <ItemsTable />
            <PaymentsTable />
        </PageLayout>
    )
}