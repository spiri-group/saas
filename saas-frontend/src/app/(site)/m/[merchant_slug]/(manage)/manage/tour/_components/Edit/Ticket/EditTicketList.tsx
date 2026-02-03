import EditTicketVariantsForm from "./EditTicketVariants";

type EditTicketProps = {
    merchantId: string
    tourId: string
}

const EditTicketList: React.FC<EditTicketProps> = (props) => {
    return (
        <EditTicketVariantsForm
            merchantId={props.merchantId}
            tourId={props.tourId}
        />
    )
}

export default EditTicketList
