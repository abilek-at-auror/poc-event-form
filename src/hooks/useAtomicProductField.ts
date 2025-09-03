import { useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { usePutEventsEventIdProductsProductId } from '../generated/events/eventFormsAPI';

interface UseAtomicProductFieldOptions {
  eventId: string;
  productId: string;
  fieldName: keyof ProductUpdateData;
  initialValue: any;
  debounceMs?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface ProductUpdateData {
  name?: string;
  sku?: string;
  quantity?: number;
  unitValue?: number;
}

export function useAtomicProductField({
  eventId,
  productId,
  fieldName,
  initialValue,
  debounceMs = 500,
  onSuccess,
  onError,
}: UseAtomicProductFieldOptions) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProductMutation = usePutEventsEventIdProductsProductId({
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
      const updateData: ProductUpdateData = {
        [fieldName]: value
      };

      updateProductMutation.mutate({
        eventId,
        productId,
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
