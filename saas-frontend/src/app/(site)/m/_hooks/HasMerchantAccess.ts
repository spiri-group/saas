import { Session } from "next-auth";

type Props = {
    merchantId: string
}

const HasMerchantAccess = (session: Session, props: Props) => {
    if (session == null) return false;
    if (session.user.vendors == null) return false;

    return session.user.vendors.some((vendor) => vendor.id == props.merchantId)
}

export default HasMerchantAccess;