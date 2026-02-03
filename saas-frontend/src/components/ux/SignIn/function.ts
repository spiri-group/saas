"use server"

import { generateAndSendOTP } from "@/lib/services/otp";

export const sendOTP = async (email: string) => {
    "use server";
    if (email) {
        await generateAndSendOTP({
            to: (email).toString(), strategy: "email"
        });
        return true;
    }
    return false;
};

// export const logIn = async (email: string, otp: string) => {
//     "use server";
//     const resp = await signIn("credentials", {
//         email, otp, redirect: false
//     });
//     console.debug(resp);
//     return true;
// }