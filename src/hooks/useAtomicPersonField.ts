import { useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { usePutEventsEventIdPersonsPersonId } from '../generated/events/eventFormsAPI';

interface UseAtomicPersonFieldOptions {
  eventId: string;
  personId: string;
  fieldName: keyof PersonUpdateData;
  initialValue: any;
  debounceMs?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface PersonUpdateData {
  name?: string;
  role?: string;
  age?: number;
}

export function useAtomicPersonField({
  eventId,
  personId,
  fieldName,
  initialValue,
  debounceMs = 500,
  onSuccess,
  onError,
}: UseAtomicPersonFieldOptions) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePersonMutation = usePutEventsEventIdPersonsPersonId({
    mutation: {
      onSuccess: (data) => {
        // React Query will automatically update the cache
        onSuccess?.(data);
      },
      onError: (err: any) => {
        // Revert to initial value on error
        setLocalValue(initialValue);
        const errorMessage = err?.message || 'Failed to update field';
        setError(errorMessage);
        onError?.(err);
      },
      onSettled: () => {
        setIsUpdating(false);
      }
    }
  });

  const debouncedSave = useDebouncedCallback(
    async (value: any) => {
      if (value === initialValue) return;
      
      setIsUpdating(true);
      setError(null);
      
      // Create update data with only the changed field
      const updateData: PersonUpdateData = {
        [fieldName]: value
      };

      updatePersonMutation.mutate({
        eventId,
        personId,
        data: updateData
      });
    },
    debounceMs
  );

  const updateValue = useCallback((newValue: any) => {
    setLocalValue(newValue);
    debouncedSave(newValue);
  }, [debouncedSave]);

  return {
    value: localValue,
    updateValue,
    isUpdating,
    error,
    clearError: () => setError(null)
  };
}
