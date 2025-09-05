import { useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useQueryClient } from '@tanstack/react-query';
import { 
  usePatchEventsEventId,
  getGetEventsEventIdQueryKey
} from '../generated/events/eventFormsAPI';
import type { EventResponse } from '../generated/events/eventFormsAPI.schemas';

interface UseAtomicFieldOptions<T = unknown> {
  eventId: string;
  fieldPath: string;
  initialValue: T;
  debounceMs?: number;
  onSuccess?: (data: EventResponse) => void;
  onError?: (error: Error) => void;
}

export function useAtomicField<T = unknown>({
  eventId,
  fieldPath,
  initialValue,
  debounceMs = 500,
  onSuccess,
  onError,
}: UseAtomicFieldOptions<T>) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const patchEventMutation = usePatchEventsEventId({
    mutation: {
      // React Query's built-in optimistic updates
      onMutate: async (variables) => {
        // Cancel outgoing refetches
        const eventQueryKey = getGetEventsEventIdQueryKey(eventId);
        await queryClient.cancelQueries({ queryKey: eventQueryKey });
        
        // Snapshot previous value for rollback
        const previousEvent = queryClient.getQueryData<EventResponse>(eventQueryKey);
        
        // Optimistically update cache
        queryClient.setQueryData<EventResponse>(eventQueryKey, (old) => {
          if (!old) return old;
          return { ...old, ...variables.data };
        });
        
        return { previousEvent };
      },
      
      onSuccess: (data) => {
        // Server response updates cache automatically
        const eventQueryKey = getGetEventsEventIdQueryKey(eventId);
        queryClient.setQueryData(eventQueryKey, data);
        onSuccess?.(data);
      },
      
      onError: (err, _variables, context) => {
        // React Query's automatic rollback
        const eventQueryKey = getGetEventsEventIdQueryKey(eventId);
        if (context?.previousEvent) {
          queryClient.setQueryData(eventQueryKey, context.previousEvent);
        }
        
        setLocalValue(initialValue);
        const errorMessage = err instanceof Error ? err.message : 'Failed to update field';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error('Unknown error'));
      },
      
      onSettled: () => {
        setIsUpdating(false);
        // Refetch to ensure consistency
        const eventQueryKey = getGetEventsEventIdQueryKey(eventId);
        queryClient.invalidateQueries({ queryKey: eventQueryKey });
      }
    }
  });

  const debouncedSave = useDebouncedCallback(
    async (value: T) => {
      if (value === initialValue) return;

      setIsUpdating(true);
      setError(null);

      // Create nested object for the update
      const updateData = setNestedValue({}, fieldPath, value);
      
      // Optimistic update
      const eventQueryKey = getGetEventsEventIdQueryKey(eventId);
      queryClient.setQueryData<EventResponse>(eventQueryKey, (old) => {
        if (!old) return old;
        return setNestedValue({ ...old } as Record<string, unknown>, fieldPath, value) as unknown as EventResponse;
      });

      // Use the Orval-generated mutation
      patchEventMutation.mutate({
        eventId,
        data: updateData
      });
    },
    debounceMs
  );

  const updateValue = useCallback((newValue: T) => {
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
function setNestedValue<T>(obj: Record<string, unknown>, path: string, value: T): Record<string, unknown> {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  
  current[keys[keys.length - 1]] = value;
  return obj;
}
