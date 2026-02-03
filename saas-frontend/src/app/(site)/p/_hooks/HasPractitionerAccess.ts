import { Session } from "next-auth";

type Props = {
    practitionerId: string
}

const HasPractitionerAccess = (session: Session, props: Props) => {
    if (session == null) return false;
    if (session.user.vendors == null) return false;

    // Check if user owns this practitioner vendor
    // Practitioners use docType: PRACTITIONER but are still stored in vendors
    return session.user.vendors.some((vendor) => vendor.id === props.practitionerId);
}

export default HasPractitionerAccess;
