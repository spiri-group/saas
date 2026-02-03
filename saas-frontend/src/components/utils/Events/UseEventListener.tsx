import { useEffect, useRef } from 'react';

const UseEventListener = (
    eventName: string,
    callback: (event: Event) => void,
    target: EventTarget | null = typeof window !== 'undefined' ? window : null
) => {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!target || typeof target.addEventListener !== 'function') {
            console.warn('Target does not support addEventListener:', target);
            return;
        }

        const eventListener = (event: Event) => callbackRef.current(event);

        target.addEventListener(eventName, eventListener);

        return () => {
            target.removeEventListener(eventName, eventListener);
        };
    }, [eventName, target]);
};

export default UseEventListener;
