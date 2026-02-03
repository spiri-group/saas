import { isNullOrWhitespace } from "@/lib/functions";
import { vendor_type } from "@/utils/spiriverse";
import { Mail, Phone, LinkIcon } from "lucide-react";
import Link from "next/link";
import MerchantCard from "./MerchantCard";

type Props = {
    vendor: vendor_type;
    visibility?: {
        isVisible: boolean;
        toggle: () => void;
        isPending?: boolean;
    } | null;
}

const Contact : React.FC<Props> = ({vendor, visibility}) => {
    // Hide completely if visibility is explicitly null (customer view + not visible)
    if (visibility === null) {
        return <></>;
    }

    return (
        <MerchantCard vendor={vendor} visibility={visibility} title="Contact Information">
            <div className="flex flex-col space-y-2">
                    {isNullOrWhitespace(vendor.contact.public.email) ? <></> : (
                    <Link href={`mailto:${vendor.contact.public.email}`} className="flex flex-row items-center space-x-3 hover:underline"> 
                        <Mail style={vendor.colors != null ? {
                            color: `${vendor.colors.primary.background}`
                        } : {}} size={16} /> 
                        <span> {vendor.contact.public.email} </span> 
                    </Link>
                    )}
                    {vendor.contact.public.phoneNumber == null ? <></> : (
                    <Link href={`tel:${vendor.contact.public.phoneNumber.value}`} className="flex flex-row items-center space-x-3 hover:underline"> 
                        <Phone style={vendor.colors != null ? {
                            color: `${vendor.colors.primary.background}`
                        } : {}} size={16} />  
                        <span> {vendor.contact.public.phoneNumber.displayAs}  </span> 
                    </Link> 
                    )}
                    {isNullOrWhitespace(vendor.website) ? <></> : (
                    <Link target="_blank" href={vendor.website} className="flex flex-row items-center space-x-3 hover:underline"> 
                        <LinkIcon style={vendor.colors != null ? {
                            color: `${vendor.colors.primary.background}`
                        } : {}} size={16} />  
                        <span> {vendor.website} </span> 
                    </Link>
                    )}
            </div>
        </MerchantCard>
    )
}

export default Contact;