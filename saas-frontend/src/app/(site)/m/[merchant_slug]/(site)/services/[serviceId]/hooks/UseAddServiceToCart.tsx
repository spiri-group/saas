'use client';

import { useUnifiedCart } from "@/app/(site)/components/Catalogue/components/ShoppingCart/useUnifiedCart";

type QuestionResponse = {
    questionId: string;
    question: string;
    answer: string | string[];
};

type AddServiceToCartInput = {
    serviceId: string;
    questionnaireResponses?: QuestionResponse[];
    selectedAddOns?: string[];
};

const UseAddServiceToCart = () => {
    const { addService, isAddingService } = useUnifiedCart();

    return {
        mutate: (input: AddServiceToCartInput) => {
            // Convert answer arrays to strings for the mutation
            const formattedResponses = input.questionnaireResponses?.map(r => ({
                questionId: r.questionId,
                question: r.question,
                answer: Array.isArray(r.answer) ? r.answer.join(', ') : r.answer
            }));

            addService({
                serviceId: input.serviceId,
                questionnaireResponses: formattedResponses,
                selectedAddOns: input.selectedAddOns
            });
        },
        isPending: isAddingService
    };
};

export default UseAddServiceToCart;
