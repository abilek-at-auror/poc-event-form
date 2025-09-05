import { useState, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { usePutEventsEventIdVehiclesVehicleId } from '../generated/events/eventFormsAPI';
import type { 
  VehicleInvolved, 
  UpdateVehicleRequest
} from '../generated/events/eventFormsAPI.schemas';

type VehicleFieldName = keyof UpdateVehicleRequest;
type VehicleFieldValue<K extends VehicleFieldName> = UpdateVehicleRequest[K];

interface UseAtomicVehicleFieldOptions<K extends VehicleFieldName> {
  eventId: string;
  vehicleId: string;
  fieldName: K;
  initialValue: VehicleFieldValue<K>;
  debounceMs?: number;
  onSuccess?: (data: VehicleInvolved) => void;
  onError?: (error: Error) => void;
}

export function useAtomicVehicleField<K extends VehicleFieldName>({
  eventId,
  vehicleId,
  fieldName,
  initialValue,
  debounceMs = 500,
  onSuccess,
  onError,
}: UseAtomicVehicleFieldOptions<K>) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateVehicleMutation = usePutEventsEventIdVehiclesVehicleId({
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
    async (value: VehicleFieldValue<K>) => {
      if (value === initialValue) return;
      
      setIsUpdating(true);
      setError(null);
      
      // Create update data with only the changed field
      const updateData: UpdateVehicleRequest = {
        [fieldName]: value
      } as UpdateVehicleRequest;

      updateVehicleMutation.mutate({
        eventId,
        vehicleId,
        data: updateData
      });
    },
    debounceMs
  );

  const updateValue = useCallback((newValue: VehicleFieldValue<K>) => {
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
