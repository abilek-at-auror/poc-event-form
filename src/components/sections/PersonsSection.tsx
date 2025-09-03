import { Card } from "@aurornz/lumos/Card";
import { Button } from "@aurornz/lumos/Button";
import { v4 as uuidv4 } from "uuid";
import { AtomicInput } from "../ui/AtomicInput";
import { AtomicSelect } from "../ui/AtomicSelect";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";

interface PersonsSectionProps {
  eventId: string;
  persons: any[];
}

const roleOptions = [
  { value: "suspect", label: "Suspect" },
  { value: "victim", label: "Victim" },
  { value: "witness", label: "Witness" },
  { value: "employee", label: "Employee" }
];

export function PersonsSection({ eventId, persons = [] }: PersonsSectionProps) {
  const queryClient = useQueryClient();

  const updateEventMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.patch(`/events/${eventId}`, data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["events", eventId], data);
    }
  });

  const addPerson = () => {
    const newPerson = {
      id: uuidv4(),
      name: "",
      role: "",
      age: ""
    };

    updateEventMutation.mutate({
      sections: {
        persons: [...persons, newPerson]
      }
    });
  };

  const removePerson = (personId: string) => {
    updateEventMutation.mutate({
      sections: {
        persons: persons.filter((p) => p.id !== personId)
      }
    });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Persons Involved
        </h3>
        <Button
          onClick={addPerson}
          disabled={updateEventMutation.isPending}
        >
          + Add Person
        </Button>
      </div>

      {persons.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No persons added yet.</p>
          <p className="text-sm">Click "Add Person" to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {persons.map((person, index) => (
            <div
              key={person.id}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-medium text-gray-900">
                  Person {index + 1}
                </h4>
                <button
                  onClick={() => removePerson(person.id)}
                  disabled={updateEventMutation.isPending}
                  className="text-red-600 hover:text-red-700 text-sm px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AtomicInput
                  eventId={eventId}
                  fieldPath={`sections.persons.${index}.name`}
                  initialValue={person.name || ""}
                  label="Full Name"
                  placeholder="Enter full name"
                  required
                />

                <AtomicSelect
                  eventId={eventId}
                  fieldPath={`sections.persons.${index}.role`}
                  initialValue={person.role || ""}
                  label="Role"
                  options={roleOptions}
                  required
                />

                <AtomicInput
                  eventId={eventId}
                  fieldPath={`sections.persons.${index}.age`}
                  initialValue={person.age || ""}
                  label="Age"
                  placeholder="Enter age"
                  type="number"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
