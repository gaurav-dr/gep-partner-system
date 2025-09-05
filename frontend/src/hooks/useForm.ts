import { useState, useCallback } from 'react';

export type ValidationRule<T> = {
  required?: boolean | string;
  minLength?: number | [number, string];
  maxLength?: number | [number, string];
  pattern?: RegExp | [RegExp, string];
  custom?: (value: T) => string | undefined;
};

export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

export interface UseFormOptions<T> {
  initialValues: T;
  validationRules?: ValidationRules<T>;
  onSubmit?: (values: T) => void | Promise<void>;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setError: <K extends keyof T>(field: K, error: string) => void;
  clearError: <K extends keyof T>(field: K) => void;
  setTouched: <K extends keyof T>(field: K, touched?: boolean) => void;
  validateField: <K extends keyof T>(field: K) => string | undefined;
  validateForm: () => boolean;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: (newValues?: Partial<T>) => void;
  getFieldProps: <K extends keyof T>(
    field: K
  ) => {
    value: T[K];
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => void;
    onBlur: () => void;
    error?: string;
    name: string;
  };
}

export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const { initialValues, validationRules = {}, onSubmit } = options;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form is dirty (has changes from initial values)
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  // Check if form is valid (no errors)
  const isValid = Object.keys(errors).length === 0;

  // Set individual field value
  const setValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValues(prev => ({ ...prev, [field]: value }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  // Set field error
  const setError = useCallback(<K extends keyof T>(field: K, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  // Clear field error
  const clearError = useCallback(<K extends keyof T>(field: K) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Set field touched state
  const setTouched = useCallback(<K extends keyof T>(field: K, touched = true) => {
    setTouchedState(prev => ({ ...prev, [field]: touched }));
  }, []);

  // Validate a single field
  const validateField = useCallback(
    <K extends keyof T>(field: K): string | undefined => {
      const value = values[field];
      const rules = (validationRules as any)[field] as ValidationRule<T[K]> | undefined;

      if (!rules) return undefined;

      // Required validation
      if (rules.required) {
        const isEmpty = value === undefined || value === null || value === '';
        if (isEmpty) {
          return typeof rules.required === 'string'
            ? rules.required
            : `${String(field)} is required`;
        }
      }

      // Only validate other rules if value exists
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      // String validations
      if (typeof value === 'string') {
        // Min length validation
        if (rules.minLength) {
          const [minLength, message] = Array.isArray(rules.minLength)
            ? rules.minLength
            : [rules.minLength, `${String(field)} must be at least ${rules.minLength} characters`];

          if (value.length < minLength) {
            return message;
          }
        }

        // Max length validation
        if (rules.maxLength) {
          const [maxLength, message] = Array.isArray(rules.maxLength)
            ? rules.maxLength
            : [rules.maxLength, `${String(field)} must not exceed ${rules.maxLength} characters`];

          if (value.length > maxLength) {
            return message;
          }
        }

        // Pattern validation
        if (rules.pattern) {
          const [pattern, message] = Array.isArray(rules.pattern)
            ? rules.pattern
            : [rules.pattern, `${String(field)} format is invalid`];

          if (!pattern.test(value)) {
            return message;
          }
        }
      }

      // Custom validation
      if (rules.custom) {
        const customError = rules.custom(value);
        if (customError) {
          return customError;
        }
      }

      return undefined;
    },
    [values, validationRules]
  );

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};

    Object.keys(validationRules).forEach(field => {
      const error = validateField(field as keyof T);
      if (error) {
        newErrors[field as keyof T] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [validateField, validationRules]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      setIsSubmitting(true);

      try {
        const isFormValid = validateForm();

        if (isFormValid && onSubmit) {
          await onSubmit(values);
        }
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateForm, onSubmit, values]
  );

  // Reset form
  const reset = useCallback(
    (newValues?: Partial<T>) => {
      const resetValues = newValues ? { ...initialValues, ...newValues } : initialValues;
      setValues(resetValues);
      setErrors({});
      setTouchedState({});
      setIsSubmitting(false);
    },
    [initialValues]
  );

  // Get field props for easy integration with form inputs
  const getFieldProps = useCallback(
    <K extends keyof T>(field: K) => {
      return {
        value: values[field] as T[K],
        name: String(field),
        onChange: (
          e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
        ) => {
          setValue(field, e.target.value as T[K]);
        },
        onBlur: () => {
          setTouched(field);
          const error = validateField(field);
          if (error) {
            setError(field, error);
          }
        },
        error: touched[field] ? errors[field] : undefined,
      };
    },
    [values, errors, touched, setValue, setTouched, validateField, setError]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    isValid,
    setValue,
    setError,
    clearError,
    setTouched,
    validateField,
    validateForm,
    handleSubmit,
    reset,
    getFieldProps,
  };
}
