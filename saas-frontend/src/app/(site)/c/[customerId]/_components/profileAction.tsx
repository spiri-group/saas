'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button";
import UseUserComplete from "../settings/hooks/UseUserComplete";
import { usePathname } from "next/navigation";
import { isNullOrWhitespace } from "@/lib/functions";
import { useEffect } from "react";

const ProfileAction :React.FC<{ customerId: string }> = ({ customerId }) => {
    const pathName = usePathname();
    const userProfile = UseUserComplete(customerId)

    useEffect(() => {
        const mainElement = document.querySelector('main');
        if (userProfile.data != null && !isNullOrWhitespace(pathName) && userProfile.data.requiresInput && ![`/u/${customerId}/setup`].includes(pathName)) {
            if (mainElement) {
                mainElement.classList.add('mt-[125px]');
            }
        }
        return () => {
            if (mainElement) {
                mainElement.classList.remove('mt-[125px]');
            }
        };
    }, [userProfile, pathName, customerId]);


    if (userProfile.data == null || isNullOrWhitespace(pathName)) {
        return undefined;
    }

    if (userProfile.data.requiresInput) {
        if ([`/u/${customerId}/setup`].includes(pathName)) {
            return undefined;
        }   
        return (
            <div className="flex flex-row mt-20 items-center justify-center h-12 w-full fixed z-50 bg-yellow-300 px-3">
                <Link href={`/u/${customerId}/setup`}>
                    <Button variant="link" className="text-black">
                        Almost there! Complete your profile to make your shopping experience a breeze!
                    </Button>
                </Link>
            </div>
        )
    }

    return undefined;

}

export default ProfileAction;