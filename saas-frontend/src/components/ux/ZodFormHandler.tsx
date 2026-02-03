import { DefaultValues, SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { z, ZodType, ZodTypeDef } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useFormStatus from "../utils/UseFormStatus";

export function useZodFormHandler<T extends ZodType<any, ZodTypeDef, any>>({
    schema,
    defaultValues,
    onSubmit,
    onError,
    onSuccess,
}: {
    schema: T;
    defaultValues?: Partial<z.infer<T>>;
    onSubmit: SubmitHandler<z.infer<T>>;
    onSuccess: (values: z.infer<T>) => void;
    onError?: SubmitErrorHandler<z.infer<T>>;
}) {
    const form = useForm<z.infer<T>>({
        resolver: zodResolver(schema as any),
        defaultValues: defaultValues as DefaultValues<z.infer<T>>,
    });

    const status = useFormStatus();

    const finish: SubmitHandler<z.infer<T>> = async (values: z.infer<T>) => {
        await status.submit(onSubmit, values, onSuccess);
    }

    const handleSubmit = form.handleSubmit(finish, onError || console.error);

    return { form, control: form.control, status, handleSubmit };
}
