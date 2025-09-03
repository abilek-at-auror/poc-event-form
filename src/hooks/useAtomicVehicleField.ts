import { useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { usePutEventsEventIdVehiclesVehicleId } from '../generated/events/eventFormsAPI';

interface UseAtomicVehicleFieldOptions {
  eventId: string;
  vehicleId: string;
  fieldName: keyof VehicleUpdateData;
  initialValue: any;
  debounceMs?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface VehicleUpdateData {
  make?: string;
  model?: string;
  licensePlate?: string;
}

export function useAtomicVehicleField({
  eventId,
  vehicleId,
  fieldName,
  initialValue,
  debounceMs = 500,
  onSuccess,
  onError,
}: UseAtomicVehicleFieldOptions) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateVehicleMutation = usePutEventsEventIdVehiclesVehicleId({
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
      const updateData: VehicleUpdateData = {
        [fieldName]: value
      };

      updateVehicleMutation.mutate({
        eventId,
        vehicleId,
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
