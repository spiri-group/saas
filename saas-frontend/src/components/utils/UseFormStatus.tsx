import { useState } from 'react';

// Enum for form states
export enum FormState {
    IDLE = 'idle',
    PROCESSING = 'processing',
    SUCCESS = 'success',
    ERROR = 'error',
}

const resetDelay = 3000

// we need a function that wraps a function and runs the function before the state resets
export const beforeStateReset = (fn: (...args: any[]) => any) => {
  return async (...args: any[]) => {
    setTimeout(async () => {
      await fn(...args);
    }, 1000); // just enough time to show the success message
  };
};

const useFormStatus = () => {
  const [formState, setFormState] = useState<FormState>(FormState.IDLE);
  const [errorMessage, setErrorMessage] = useState(null);
  const [impacted, setImpacted] = useState<any>(null);

  const setProcessing = () => setFormState(FormState.PROCESSING);
  const setSuccess = () => setFormState(FormState.SUCCESS);

  const setError = (message) => {
    setFormState(FormState.ERROR);
    setErrorMessage(message);

    // Reset error state after 3 seconds
    setTimeout(() => {
      setFormState(FormState.IDLE);
      setErrorMessage(null);
      setImpacted(null);
    }, resetDelay);
  };

  const resetFormState = () => {
    setFormState(FormState.IDLE);
    setErrorMessage(null);
    setImpacted(null);
  };

  return { 
    impacted,
    formState, 
    errorMessage, 
    setProcessing, 
    setSuccess, 
    setError,
    submit: async (
      submitFunction: (values: any) => any | void, 
      values : any,
      onSuccess: (result: any) => void
      ) => {
        if (formState !== FormState.IDLE) return;
        setProcessing();
        try {
          const result = await submitFunction(values);
          setSuccess();
          setTimeout(async () => {
            await onSuccess(result);
            setImpacted(result);
            return result;
          }, 2000)
        } catch (e) {
          setError(e.message);
        }
      },
    reset: resetFormState,
    button: {
      variant: (formState === FormState.PROCESSING 
        ? 'default' 
        : formState === FormState.SUCCESS 
        ? 'success' 
        : formState === FormState.ERROR 
            ? 'error' 
            : 'default') as 'default' | 'success' | 'destructive',
      title: (formState === FormState.PROCESSING 
        ? 'Processing' 
        : formState === FormState.SUCCESS 
        ? 'Success' 
        : formState === FormState.ERROR 
            ? 'Error' 
            : 'Submit') as 'Processing' | 'Success' | 'Error' | 'Submit',
    }
  };
};

export default useFormStatus;
