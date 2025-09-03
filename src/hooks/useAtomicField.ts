import { useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useQueryClient } from '@tanstack/react-query';
import { usePatchEventsEventId } from '../generated/events/eventFormsAPI';

interface UseAtomicFieldOptions {
  eventId: string;
  fieldPath: string;
  initialValue: any;
  debounceMs?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useAtomicField({
  eventId,
  fieldPath,
  initialValue,
  debounceMs = 500,
  onSuccess,
  onError,
}: UseAtomicFieldOptions) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const patchEventMutation = usePatchEventsEventId({
    mutation: {
      // React Query's built-in optimistic updates
      onMutate: async (variables) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['events', eventId] });
        
        // Snapshot previous value for rollback
        const previousEvent = queryClient.getQueryData(['events', eventId]);
        
        // Optimistically update cache
        queryClient.setQueryData(['events', eventId], (old: any) => {
          if (!old) return old;
          return { ...old, ...variables.data };
        });
        
        return { previousEvent };
      },
      
      onSuccess: (data) => {
        // Server response updates cache automatically
        queryClient.setQueryData(['events', eventId], data);
        onSuccess?.(data);
      },
      
      onError: (err: any, _variables, context) => {
        // React Query's automatic rollback
        if (context?.previousEvent) {
          queryClient.setQueryData(['events', eventId], context.previousEvent);
        }
        
        setLocalValue(initialValue);
        const errorMessage = err?.message || 'Failed to update field';
        setError(errorMessage);
        onError?.(err);
      },
      
      onSettled: () => {
        setIsUpdating(false);
        // Refetch to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      }
    }
  });

  const debouncedSave = useDebouncedCallback(
    async (value: any) => {
      if (value === initialValue) return;

      setIsUpdating(true);
      setError(null);

      // Create nested object for the update
      const updateData = setNestedValue({}, fieldPath, value);
      
      // Optimistic update
      queryClient.setQueryData(['events', eventId], (old: any) => {
        if (!old) return old;
        return setNestedValue({ ...old }, fieldPath, value);
      });

      // Use the Orval-generated mutation
      patchEventMutation.mutate({
        eventId,
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
    clearError: () => setError(null),
  };
}

// Helper function to set nested object values
function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return obj;
}
