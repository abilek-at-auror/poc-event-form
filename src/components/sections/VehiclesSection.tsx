import { useState } from "react";
import { Card } from "@aurornz/lumos/Card";
import { Button } from "@aurornz/lumos/Button";
import { AtomicVehicleInput } from "../ui/AtomicVehicleInput";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetEventsEventIdVehicles,
  useDeleteEventsEventIdVehiclesVehicleId,
  getGetEventsEventIdQueryKey
} from "../../generated/events/eventFormsAPI";
import type {
  EventResponse,
  VehicleInvolved
} from "../../generated/events/eventFormsAPI.schemas";
import { useSectionValidationOptimized } from "../../hooks/useEventValidation-optimized";
import { AddVehicleModal } from "./AddVehicleModal";

interface VehiclesSectionProps {
  eventId: string;
}

export function VehiclesSection({ eventId }: VehiclesSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch vehicles data directly from section endpoint
  const { data: vehicles = [] } = useGetEventsEventIdVehicles(eventId);

  // Section validation using optimized approach with direct API calls
  const { errors, sectionConfig, isRequired, minimumEntries, displayName } =
    useSectionValidationOptimized(eventId, "vehicles");

  // Debug logging for optimized validation
  console.log("VehiclesSection Debug:", {
    vehiclesCount: vehicles.length,
    vehicles: vehicles.map((v) => ({ id: v.id, make: v.make, model: v.model })),
    sectionConfig,
    isRequired,
    minimumEntries,
    displayName,
    errors
  });

  // Mutation for deleting vehicles
  const deleteVehicleMutation = useDeleteEventsEventIdVehiclesVehicleId({
    mutation: {
      onSuccess: (_, variables) => {
        // Update the main event cache to remove the deleted vehicle (if needed for validation)
        const eventQueryKey = getGetEventsEventIdQueryKey(eventId);
        queryClient.setQueryData(
          eventQueryKey,
          (oldEvent: EventResponse | undefined) => {
            if (!oldEvent) return oldEvent;

            const updatedEvent = {
              ...oldEvent,
              sections: {
                ...oldEvent.sections,
                vehicles: (oldEvent.sections?.vehicles || []).filter(
                  (v: VehicleInvolved) => v.id !== variables.vehicleId
                )
              }
            } as EventResponse;

            console.log(
              "Updated main event cache after vehicle delete:",
              updatedEvent
            );
            return updatedEvent;
          }
        );

        // React Query will automatically invalidate and refetch the vehicles list
      }
    }
  });

  const removeVehicle = (vehicleId: string) => {
    deleteVehicleMutation.mutate({
      eventId,
      vehicleId
    });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {displayName || "Vehicles Involved"}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </h3>
          {errors.length > 0 && (
            <div className="mt-1">
              {errors.map((error, index) => (
                <p key={index} className="text-sm text-red-600">
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>
        <Button onClick={() => setIsModalOpen(true)}>+ Add Vehicle</Button>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No vehicles added yet.</p>
          <p className="text-sm">Click "Add Vehicle" to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {vehicles.map((vehicle, index) => (
            <div
              key={vehicle.id}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-medium text-gray-900">
                  Vehicle {index + 1}
                </h4>
                <button
                  onClick={() => removeVehicle(vehicle.id)}
                  disabled={deleteVehicleMutation.isPending}
                  className="text-red-600 hover:text-red-700 text-sm px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AtomicVehicleInput
                  eventId={eventId}
                  vehicleId={vehicle.id}
                  fieldName="make"
                  initialValue={vehicle.make || ""}
                  label="Make"
                  placeholder="e.g., Toyota"
                  required
                />

                <AtomicVehicleInput
                  eventId={eventId}
                  vehicleId={vehicle.id}
                  fieldName="model"
                  initialValue={vehicle.model || ""}
                  label="Model"
                  placeholder="e.g., Camry"
                  required
                />

                <AtomicVehicleInput
                  eventId={eventId}
                  vehicleId={vehicle.id}
                  fieldName="licensePlate"
                  initialValue={vehicle.licensePlate || ""}
                  label="License Plate"
                  placeholder="e.g., ABC-123"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <AddVehicleModal
        eventId={eventId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
        }}
      />
    </Card>
  );
}
