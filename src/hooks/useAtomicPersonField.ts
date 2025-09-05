import { useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { usePutEventsEventIdPersonsPersonId } from '../generated/events/eventFormsAPI';
import type { 
  PersonInvolved, 
  UpdatePersonRequest
} from '../generated/events/eventFormsAPI.schemas';

type PersonFieldName = keyof UpdatePersonRequest;
type PersonFieldValue<K extends PersonFieldName> = UpdatePersonRequest[K];

interface UseAtomicPersonFieldOptions<K extends PersonFieldName> {
  eventId: string;
  personId: string;
  fieldName: K;
  initialValue: PersonFieldValue<K>;
  debounceMs?: number;
  onSuccess?: (data: PersonInvolved) => void;
  onError?: (error: Error) => void;
}

export function useAtomicPersonField<K extends PersonFieldName>({
  eventId,
  personId,
  fieldName,
  initialValue,
  debounceMs = 500,
  onSuccess,
  onError,
}: UseAtomicPersonFieldOptions<K>) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePersonMutation = usePutEventsEventIdPersonsPersonId({
    mutation: {
      onSuccess: (data) => {
        // React Query will automatically update the cache
        onSuccess?.(data);
      },
      onError: (err) => {
        // Revert to initial value on error
        setLocalValue(initialValue);
        const errorMessage = err instanceof Error ? err.message : 'Failed to update field';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error('Unknown error'));
      },
      onSettled: () => {
        setIsUpdating(false);
      }
    }
  });

  const debouncedSave = useDebouncedCallback(
    async (value: PersonFieldValue<K>) => {
      if (value === initialValue) return;
      
      setIsUpdating(true);
      setError(null);
      
      // Create update data with only the changed field
      const updateData: UpdatePersonRequest = {
        [fieldName]: value
      } as UpdatePersonRequest;

      updatePersonMutation.mutate({
        eventId,
        personId,
        data: updateData
      });
    },
    debounceMs
  );

  const updateValue = useCallback((newValue: PersonFieldValue<K>) => {
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
