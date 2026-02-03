import { useCallback } from 'react';

const useEventDispatcher = (
    eventName: string, 
    target: EventTarget | null = typeof window !== 'undefined' ? window : null
) => {

    const dispatchEvent = useCallback(
        (detail?: any) => {
            if (!target || typeof target.dispatchEvent !== 'function') {
                console.warn('Target does not support dispatchEvent:', target);
                return;
            }
            const event = new CustomEvent(eventName, { detail });
            target.dispatchEvent(event);
        },
        [eventName, target]
    );

    return dispatchEvent;
};

export default useEventDispatcher;