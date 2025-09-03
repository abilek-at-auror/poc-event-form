import { useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

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

  const debouncedSave = useDebouncedCallback(
    async (value: any) => {
      if (value === initialValue) return;

      setIsUpdating(true);
      setError(null);

      try {
        // Create nested object for the update
        const updateData = setNestedValue({}, fieldPath, value);
        
        // Optimistic update
        queryClient.setQueryData(['events', eventId], (old: any) => {
          if (!old) return old;
          return setNestedValue({ ...old }, fieldPath, value);
        });

        const responseData = await api.patch(`/events/${eventId}`, updateData);
        
        // Update cache with server response
        queryClient.setQueryData(['events', eventId], responseData);
        
        onSuccess?.(responseData);
      } catch (err: any) {
        // Revert optimistic update on error
        queryClient.setQueryData(['events', eventId], (old: any) => {
          if (!old) return old;
          return setNestedValue({ ...old }, fieldPath, initialValue);
        });
        
        setLocalValue(initialValue);
        const errorMessage = err.message || 'Failed to update field';
        setError(errorMessage);
        onError?.(err);
      } finally {
        setIsUpdating(false);
      }
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
