'use client';

import { useState } from 'react';
import { Input } from '../ui/input';
import parsePhoneNumber, { CountryCode, NumberType } from 'libphonenumber-js';
import { z } from 'zod';
import { isNullOrWhitespace } from '@/lib/functions';

export type PhoneSchema = z.infer<typeof PhoneSchema>;

export const PhoneSchema = z.object({
  raw: z.string().min(1, 'Required'),
  displayAs: z.string().min(1),
  value: z
    .string()
    .min(1)
    .refine((value) => !!parsePhoneNumber(value), { message: 'Invalid phone number' }),
});

type Props = {
  defaultCountry: CountryCode;
  onChange: (phone: PhoneSchema) => void;
  onError?: (error: string) => void;
  clearErrors?: () => void;
  value: PhoneSchema | undefined;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  disabled?: boolean;
  expectedType?: NumberType;
  placeHolder?: string;
  name?: string;
};

const PhoneInput: React.FC<Props> = ({
  defaultCountry,
  ariaLabel,
  ariaLabelledBy,
  disabled,
  placeHolder,
  expectedType,
  value,
  onChange,
  onError,
  clearErrors,
  name,
}) => {
  const [isInvalid, setIsInvalid] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    if (isNullOrWhitespace(input)) {
      setIsInvalid(false);
      onChange({ raw: '', displayAs: '', value: '' });
      return;
    }

    const phoneNumber = parsePhoneNumber(input, defaultCountry);
    const isTypeMismatch =
      expectedType && phoneNumber?.getType() !== undefined && phoneNumber?.getType() !== expectedType;

    if (!phoneNumber || isTypeMismatch) {
      onChange({
        raw: input,
        displayAs: phoneNumber?.formatNational() ?? input,
        value: '',
      });
      setIsInvalid(true);
      if (onError) {
        clearErrors?.();
        onError(
          isTypeMismatch
            ? `${input} is not a valid ${expectedType?.toLowerCase()} number`
            : 'Invalid phone number'
        );
      }
    } else {
      setIsInvalid(false);
      onChange({
        raw: input,
        displayAs: phoneNumber.formatNational(),
        value: phoneNumber.number,
      });
      clearErrors?.();
    }
  };

  return (
    <Input
      name={name}
      placeholder={placeHolder}
      value={value?.displayAs ?? ''}
      onChange={handleChange}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-invalid={isInvalid}
      disabled={disabled}
    />
  );
};

export default PhoneInput;
