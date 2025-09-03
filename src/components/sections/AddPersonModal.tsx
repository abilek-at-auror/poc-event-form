import { useState } from "react";
import { Card } from "@aurornz/lumos/Card";
import { Button } from "@aurornz/lumos/Button";
import { v4 as uuidv4 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import { usePostEventsEventIdPersons } from "../../generated/events/eventFormsAPI";
import type {
  PersonInvolved,
  PersonInvolvedRole
} from "../../generated/events/eventFormsAPI.schemas";

interface AddPersonModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Optional callback after successful save
}

const roleOptions = [
  { value: "suspect", label: "Suspect" },
  { value: "victim", label: "Victim" },
  { value: "witness", label: "Witness" },
  { value: "employee", label: "Employee" }
];

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

  // Mutation for adding person
  const addPersonMutation = usePostEventsEventIdPersons({
    mutation: {
      onSuccess: (data) => {
        // React Query will automatically invalidate and refetch the persons list

        // Reset form
        setFormData({ name: "", role: "suspect", age: "" });

        // Close modal
        onClose();

        // Optional success callback
        onSuccess?.();
      },
      onError: (error) => {
        console.error("Failed to add person:", error);
        // Could add error handling UI here
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Use mutation to add person - the backend will assign the ID
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
            Add New Person
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
