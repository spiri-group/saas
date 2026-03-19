'use client';

import * as React from 'react';
import { Input, type InputProps } from './input';

/**
 * Email input that auto-lowercases and trims whitespace.
 * Drop-in replacement for <Input type="email" /> — passes all props through.
 */
const EmailInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
    ({ onChange, onBlur, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            e.target.value = e.target.value.toLowerCase();
            onChange?.(e);
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            e.target.value = e.target.value.trim();
            onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>);
            onBlur?.(e);
        };

        return (
            <Input
                ref={ref}
                type="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={handleChange}
                onBlur={handleBlur}
                {...props}
            />
        );
    }
);

EmailInput.displayName = 'EmailInput';

export { EmailInput };
