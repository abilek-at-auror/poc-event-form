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

/**
 * Enhanced atomic field hook that leverages orval-generated mutations
 * while adding custom business logic for debouncing, optimistic updates,
 * and error handling.
 * 
 * This demonstrates how to build sophisticated hooks on top of orval's
 * generated base hooks rather than replacing them entirely.
 */
export function useAtomicFieldEnhanced({
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

  // Use the orval-generated mutation hook
  const patchEventMutation = usePatchEventsEventId({
    mutation: {
      onMutate: async (variables) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['events', eventId] });
        
        // Snapshot previous value for rollback
        const previousEvent = queryClient.getQueryData(['events', eventId]);
        
        // Optimistically update cache
        queryClient.setQueryData(['events', eventId], (old: any) => {
          if (!old) return old;
          return setNestedValue({ ...old }, fieldPath, variables.data);
        });
        
        return { previousEvent };
      },
      
      onSuccess: (data) => {
        // Server response updates cache automatically
        queryClient.setQueryData(['events', eventId], data);
        onSuccess?.(data);
      },
      
      onError: (err: any, _variables, context) => {
        // Rollback on error
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
      
      // Use the orval-generated mutation
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
    // Expose the underlying mutation for advanced use cases
    mutation: patchEventMutation,
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

/**
 * Factory function to create entity-specific atomic field hooks
 * This shows how you could generate the repetitive entity-specific hooks
 * programmatically while still maintaining type safety.
 */
export function createEntityAtomicFieldHook<T extends Record<string, any>>(
  useMutationHook: any, // The orval-generated mutation hook
  entityName: string
) {
  return function useEntityAtomicField({
    eventId,
    entityId,
    fieldName,
    initialValue,
    debounceMs = 500,
    onSuccess,
    onError,
  }: {
    eventId: string;
    entityId: string;
    fieldName: keyof T;
    initialValue: any;
    debounceMs?: number;
    onSuccess?: (data: any) => void;
    onError?: (error: any) => void;
  }) {
    const [localValue, setLocalValue] = useState(initialValue);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateMutation = useMutationHook({
      mutation: {
        onSuccess: (data: any) => {
          onSuccess?.(data);
        },
        onError: (err: any) => {
          setLocalValue(initialValue);
          const errorMessage = err?.message || `Failed to update ${entityName} field`;
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
        
        const updateData = {
          [fieldName]: value
        } as Partial<T>;

        updateMutation.mutate({
          eventId,
          [`${entityName}Id`]: entityId,
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
      mutation: updateMutation,
    };
  };
}

// Example usage of the factory:
// export const useAtomicPersonFieldEnhanced = createEntityAtomicFieldHook(
//   usePutEventsEventIdPersonsPersonId,
//   'person'
// );
