import { useState } from "react";
import { Card } from "@aurornz/lumos/Card";
import { Button } from "@aurornz/lumos/Button";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePostEventsEventIdVehicles,
  getGetEventsEventIdVehiclesQueryKey,
  getGetEventsEventIdQueryKey
} from "../../generated/events/eventFormsAPI";
import type {
  VehicleInvolved,
  EventResponse
} from "../../generated/events/eventFormsAPI.schemas";

interface AddVehicleModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Optional callback after successful save
}

export function AddVehicleModal({
  eventId,
  isOpen,
  onClose,
  onSuccess
}: AddVehicleModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    licensePlate: ""
  });

  // Mutation for adding vehicle
  const addVehicleMutation = usePostEventsEventIdVehicles({
    mutation: {
      onSuccess: (data: VehicleInvolved) => {
        console.log("Vehicle added successfully:", data);

        // Invalidate queries using orval-generated query keys
        const vehiclesQueryKey = getGetEventsEventIdVehiclesQueryKey(eventId);
        const eventQueryKey = getGetEventsEventIdQueryKey(eventId);

        console.log("Invalidating queries:", {
          vehiclesQueryKey,
          eventQueryKey
        });

        // Check current cache state before updating
        const currentEvent = queryClient.getQueryData(eventQueryKey);
        console.log("Current event cache before update:", currentEvent);

        // Update the main event cache to include the new vehicle
        queryClient.setQueryData(
          eventQueryKey,
          (oldEvent: EventResponse | undefined) => {
            if (!oldEvent) return oldEvent;

            const updatedEvent = {
              ...oldEvent,
              sections: {
                ...oldEvent.sections,
                vehicles: [...(oldEvent.sections?.vehicles || []), data]
              }
            } as EventResponse;

            console.log("Updated main event cache:", updatedEvent);
            return updatedEvent;
          }
        );

        // Explicit cache invalidation with aggressive options
        queryClient.invalidateQueries({
          queryKey: vehiclesQueryKey,
          refetchType: "active"
        });

        // Also invalidate the main event query
        queryClient.invalidateQueries({
          queryKey: eventQueryKey,
          refetchType: "active"
        });

        // Invalidate all event-related queries as a fallback
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey.some(
              (key) => typeof key === "string" && key.includes(eventId)
            );
          },
          refetchType: "active"
        });

        // Reset form
        setFormData({ make: "", model: "", licensePlate: "" });

        // Close modal
        onClose();

        // Optional success callback
        onSuccess?.();
      },
      onError: (error) => {
        console.error("Failed to add vehicle:", error);
        // Could add error handling UI here
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Use mutation to add vehicle - the backend will assign the ID
    addVehicleMutation.mutate({
      eventId,
      data: {
        make: formData.make,
        model: formData.model,
        licensePlate: formData.licensePlate
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Add New Vehicle
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Make *
            </label>
            <input
              type="text"
              value={formData.make}
              onChange={(e) =>
                setFormData({ ...formData, make: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter vehicle make"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model *
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) =>
                setFormData({ ...formData, model: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter vehicle model"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Plate
            </label>
            <input
              type="text"
              value={formData.licensePlate}
              onChange={(e) =>
                setFormData({ ...formData, licensePlate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter license plate"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !formData.make.trim() ||
                !formData.model.trim() ||
                addVehicleMutation.isPending
              }
            >
              {addVehicleMutation.isPending ? "Adding..." : "Add Vehicle"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
