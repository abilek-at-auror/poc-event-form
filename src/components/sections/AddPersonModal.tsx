import { useState } from "react";
import { Card } from "@aurornz/lumos/Card";
import { Button } from "@aurornz/lumos/Button";
import { v4 as uuidv4 } from "uuid";
import type {
  PersonInvolved,
  PersonInvolvedRole
} from "../../generated/events/eventFormsAPI.schemas";

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (person: PersonInvolved) => void;
}

const roleOptions = [
  { value: "suspect", label: "Suspect" },
  { value: "victim", label: "Victim" },
  { value: "witness", label: "Witness" },
  { value: "employee", label: "Employee" }
];

export function AddPersonModal({
  isOpen,
  onClose,
  onSave
}: AddPersonModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    role: "suspect" as PersonInvolvedRole,
    age: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newPerson: PersonInvolved = {
      id: uuidv4(),
      name: formData.name,
      role: formData.role,
      age: formData.age ? parseInt(formData.age) : 0
    };

    onSave(newPerson);

    // Reset form
    setFormData({ name: "", role: "suspect", age: "" });
    onClose();
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
            <Button type="submit" disabled={!formData.name.trim()}>
              Add Person
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
