import { useState } from "react";
import { Card } from "@aurornz/lumos/Card";
import { Button } from "@aurornz/lumos/Button";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePostEventsEventIdPersons,
  getGetEventsEventIdPersonsQueryKey,
  getGetEventsEventIdQueryKey
} from "../../generated/events/eventFormsAPI";
import type {
  PersonInvolvedRole,
  EventResponse
} from "../../generated/events/eventFormsAPI.schemas";

interface AddPersonModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const roleOptions = [
  { value: "suspect", label: "Suspect" },
  { value: "victim", label: "Victim" },
  { value: "witness", label: "Witness" },
  { value: "employee", label: "Employee" }
];

/**
 * Modal for adding new persons to an event
 */
export function AddPersonModal({
  eventId,
  isOpen,
  onClose,
  onSuccess
}: AddPersonModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    role: "suspect" as PersonInvolvedRole,
    age: ""
  });

  // Simple mutation - just invalidate cache after success
  const addPersonMutation = usePostEventsEventIdPersons({
    mutation: {
      onSuccess: (data) => {
        console.log("Person added successfully:", data);

        // Invalidate queries using orval-generated query keys
        const personsQueryKey = getGetEventsEventIdPersonsQueryKey(eventId);
        const eventQueryKey = getGetEventsEventIdQueryKey(eventId);

        console.log("Invalidating queries:", {
          personsQueryKey,
          eventQueryKey
        });

        // Check current cache state before updating
        const currentEvent = queryClient.getQueryData(eventQueryKey);
        console.log("Current event cache before update:", currentEvent);

        // Update the main event cache to include the new person
        queryClient.setQueryData(
          eventQueryKey,
          (oldEvent: EventResponse | undefined) => {
            if (!oldEvent) return oldEvent;

            const updatedEvent = {
              ...oldEvent,
              sections: {
                ...oldEvent.sections,
                persons: [...(oldEvent.sections?.persons || []), data]
              }
            } as EventResponse;

            console.log("Updated main event cache:", updatedEvent);
            return updatedEvent;
          }
        );

        // Force invalidation with more aggressive options
        queryClient.invalidateQueries({
          queryKey: personsQueryKey,
          refetchType: "active"
        });
        queryClient.invalidateQueries({
          queryKey: eventQueryKey,
          refetchType: "active"
        });

        // Also try invalidating all queries related to this event
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0] as string;
            return key.includes(`/events/${eventId}`);
          }
        });

        console.log("Cache invalidation completed");

        // Reset form
        setFormData({ name: "", role: "suspect", age: "" });

        // Close modal
        onClose();

        // Optional success callback
        onSuccess?.();
      },
      onError: (error) => {
        console.error("Failed to add person:", error);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Submitting person:", formData);

    addPersonMutation.mutate({
      eventId,
      data: {
        name: formData.name,
        role: formData.role,
        age: formData.age ? parseInt(formData.age) : 0
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Add New Person (Simple)
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
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as PersonInvolvedRole
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Age
            </label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) =>
                setFormData({ ...formData, age: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter age"
              min="0"
              max="150"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.name.trim() || addPersonMutation.isPending}
            >
              {addPersonMutation.isPending ? "Adding..." : "Add Person"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
