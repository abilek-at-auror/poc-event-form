import { Card } from "@aurornz/lumos/Card";
import { Button } from "@aurornz/lumos/Button";
import { v4 as uuidv4 } from "uuid";
import { AtomicInput } from "../ui/AtomicInput";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetEventsEventId, usePatchEventsEventId } from "../../generated/events/eventFormsAPI";

interface VehiclesSectionProps {
  eventId: string;
}

export function VehiclesSection({ eventId }: VehiclesSectionProps) {
  const queryClient = useQueryClient();
  
  // Fetch event data to get current vehicles
  const { data: event } = useGetEventsEventId(eventId);
  const vehicles = event?.sections?.vehicles || [];

  const updateEventMutation = usePatchEventsEventId({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(["events", eventId], data);
      }
    }
  });

  const addVehicle = () => {
    const newVehicle = {
      id: uuidv4(),
      make: "",
      model: "",
      licensePlate: ""
    };

    updateEventMutation.mutate({
      eventId,
      data: {
        sections: {
          vehicles: [...vehicles, newVehicle]
        }
      }
    });
  };

  const removeVehicle = (vehicleId: string) => {
    updateEventMutation.mutate({
      eventId,
      data: {
        sections: {
          vehicles: vehicles.filter((v) => v.id !== vehicleId)
        }
      }
    });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Vehicles Involved
        </h3>
        <Button
          onClick={addVehicle}
          disabled={updateEventMutation.isPending}
        >
          + Add Vehicle
        </Button>
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
                  disabled={updateEventMutation.isPending}
                  className="text-red-600 hover:text-red-700 text-sm px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AtomicInput
                  eventId={eventId}
                  fieldPath={`sections.vehicles.${index}.make`}
                  initialValue={vehicle.make || ""}
                  label="Make"
                  placeholder="e.g., Toyota"
                  required
                />

                <AtomicInput
                  eventId={eventId}
                  fieldPath={`sections.vehicles.${index}.model`}
                  initialValue={vehicle.model || ""}
                  label="Model"
                  placeholder="e.g., Camry"
                  required
                />

                <AtomicInput
                  eventId={eventId}
                  fieldPath={`sections.vehicles.${index}.licensePlate`}
                  initialValue={vehicle.licensePlate || ""}
                  label="License Plate"
                  placeholder="e.g., ABC-123"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
