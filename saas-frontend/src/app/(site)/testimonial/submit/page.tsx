import { Suspense } from "react";
import UI from "./ui";

export default function TestimonialSubmitPage() {
    return (
        <Suspense fallback={null}>
            <UI />
        </Suspense>
    );
}
