import { useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { usePutEventsEventIdProductsProductId } from '../generated/events/eventFormsAPI';
import type { 
  ProductInvolved, 
  UpdateProductRequest
} from '../generated/events/eventFormsAPI.schemas';

type ProductFieldName = keyof UpdateProductRequest;
type ProductFieldValue<K extends ProductFieldName> = UpdateProductRequest[K];

interface UseAtomicProductFieldOptions<K extends ProductFieldName> {
  eventId: string;
  productId: string;
  fieldName: K;
  initialValue: ProductFieldValue<K>;
  debounceMs?: number;
  onSuccess?: (data: ProductInvolved) => void;
  onError?: (error: Error) => void;
}

export function useAtomicProductField<K extends ProductFieldName>({
  eventId,
  productId,
  fieldName,
  initialValue,
  debounceMs = 500,
  onSuccess,
  onError,
}: UseAtomicProductFieldOptions<K>) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProductMutation = usePutEventsEventIdProductsProductId({
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
    async (value: ProductFieldValue<K>) => {
      if (value === initialValue) return;
      
      setIsUpdating(true);
      setError(null);
      
      // Create update data with only the changed field
      const updateData: UpdateProductRequest = {
        [fieldName]: value
      } as UpdateProductRequest;

      updateProductMutation.mutate({
        eventId,
        productId,
        data: updateData
      });
    },
    debounceMs
  );

  const updateValue = useCallback((newValue: ProductFieldValue<K>) => {
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
