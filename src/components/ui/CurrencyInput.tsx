'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forwardRef } from 'react';

interface CurrencyInputProps {
  label?: string;
  value: string | number;
  onChange: (e: any) => void;
  onValueChange?: (numericValue: number) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  step?: string;
  min?: string;
  max?: string;
  className?: string;
  showVisual?: boolean;
  helperText?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      label,
      value,
      onChange,
      onValueChange,
      placeholder = '0',
      required = false,
      disabled = false,
      step = '1',
      className = '',
      showVisual = true,
      helperText,
      ...props
    },
    ref
  ) => {
    // Convert value to number for calculation
    const numericValue = typeof value === 'string' 
      ? parseInt(value.replace(/\D/g, '') || '0', 10)
      : typeof value === 'number'
      ? value
      : 0;

    // Format number to currency display (e.g., 500000 -> "Rp 500.000")
    const formatCurrency = (num: number): string => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow only numbers
      const numericOnly = inputValue.replace(/\D/g, '');
      
      // Update the input with numeric value
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: numericOnly,
        },
      };
      
      onChange(syntheticEvent);
      
      // Callback with numeric value
      if (onValueChange) {
        onValueChange(parseInt(numericOnly || '0', 10));
      }
    };

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={label}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        <div className="relative">
          <Input
            ref={ref}
            type="text"
            inputMode="numeric"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`${className} font-mono`}
            {...props}
          />
          {showVisual && numericValue > 0 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-right pointer-events-none">
              <div className="text-xs text-emerald-600 font-semibold whitespace-nowrap">
                {formatCurrency(numericValue)}
              </div>
            </div>
          )}
        </div>
        {helperText && (
          <p className="text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
