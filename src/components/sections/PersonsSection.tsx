import { useState } from "react";
import { Card } from "@aurornz/lumos/Card";
import { Button } from "@aurornz/lumos/Button";
import { AtomicPersonInput } from "../ui/AtomicPersonInput";
import { AtomicPersonSelect } from "../ui/AtomicPersonSelect";
import {
  useGetEventsEventIdPersons,
  useDeleteEventsEventIdPersonsPersonId,
  getGetEventsEventIdQueryKey,
  getGetEventsEventIdPersonsQueryKey
} from "../../generated/events/eventFormsAPI";
import type {
  EventResponse,
  PersonInvolved
} from "../../generated/events/eventFormsAPI.schemas";
import { useSectionValidationDynamic } from "../../hooks/useEventValidation-dynamic";
import { AddPersonModal } from "./AddPersonModal";
import { useQueryClient } from "@tanstack/react-query";

interface PersonsSectionProps {
  eventId: string;
}

const roleOptions = [
  { value: "suspect", label: "Suspect" },
  { value: "victim", label: "Victim" },
  { value: "witness", label: "Witness" },
  { value: "employee", label: "Employee" }
];

export function PersonsSection({ eventId }: PersonsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch persons data directly from section endpoint
  const { data: persons = [] } = useGetEventsEventIdPersons(eventId);

  // Section validation using dynamic SectionConfig rules from API
  const { errors, sectionConfig, isRequired, minimumEntries, displayName } =
    useSectionValidationDynamic(eventId, "persons");

  // Debug logging for dynamic validation
  console.log("Dynamic PersonsSection Debug:", {
    personsCount: persons.length,
    sectionConfig,
    isRequired,
    minimumEntries,
    displayName,
    errors
  });

  // Mutation for deleting persons
  const deletePersonMutation = useDeleteEventsEventIdPersonsPersonId({
    mutation: {
      onSuccess: (_, variables) => {
        // Update the main event cache to remove the deleted person
        const eventQueryKey = getGetEventsEventIdQueryKey(eventId);
        const personsQueryKey = getGetEventsEventIdPersonsQueryKey(eventId);
        queryClient.setQueryData(
          eventQueryKey,
          (oldEvent: EventResponse | undefined) => {
            if (!oldEvent) return oldEvent;

            const updatedEvent = {
              ...oldEvent,
              sections: {
                ...oldEvent.sections,
                persons: (oldEvent.sections?.persons || []).filter(
                  (p: PersonInvolved) => p.id !== variables.personId
                )
              }
            } as EventResponse;

            console.log("Updated main event cache after delete:", updatedEvent);
            return updatedEvent;
          }
        );

        queryClient.invalidateQueries({
          queryKey: personsQueryKey,
          refetchType: "active"
        });

      }
    }
  });

  const removePerson = (personId: string) => {
    deletePersonMutation.mutate({
      eventId,
      personId
    });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {displayName || "Persons Involved"}
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
        <Button onClick={() => setIsModalOpen(true)}>+ Add Person</Button>
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
                  onClick={() => removePerson(person.id!)}
                  disabled={deletePersonMutation.isPending}
                  className="text-red-600 hover:text-red-700 text-sm px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AtomicPersonInput
                  eventId={eventId}
                  personId={person.id!}
                  fieldName="name"
                  initialValue={person.name || ""}
                  label="Full Name"
                  placeholder="Enter full name"
                  required
                />

                <AtomicPersonSelect
                  eventId={eventId}
                  personId={person.id!}
                  initialValue={person.role || ""}
                  label="Role"
                  options={roleOptions}
                  required
                />

                <AtomicPersonInput
                  eventId={eventId}
                  personId={person.id!}
                  fieldName="age"
                  initialValue={person.age || 0}
                  label="Age"
                  placeholder="Enter age"
                  type="number"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <AddPersonModal
        eventId={eventId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          console.log("Person added successfully, validation should update");
        }}
      />
    </Card>
  );
}
