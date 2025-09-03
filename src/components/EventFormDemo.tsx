import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useGetEventTypesEventTypeConfig, usePostEvents } from "../generated/events/eventFormsAPI";
import { Badge } from "@aurornz/lumos/Badge";
import EventForm from "./EventForm";
import { EventMetadataSection } from "./sections/EventMetadataSection";
import { ConditionalSection } from "./ConditionalSection";
import { PersonsSection } from "./sections/PersonsSection";
import { ProductsSection } from "./sections/ProductsSection";
import { VehiclesSection } from "./sections/VehiclesSection";
import { ValidationStatus } from "./ValidationStatus";

const eventTypes = [
  {
    value: "shoplifting",
    label: "Shoplifting Incident"
  },
  {
    value: "accident",
    label: "Accident Report"
  },
  {
    value: "vandalism",
    label: "Vandalism Report"
  }
];

export default function EventFormDemo() {
  const [selectedEventType, setSelectedEventType] = useState("");
  const [draftEventId, setDraftEventId] = useState<string | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  // Fetch event type configuration when an event type is selected
  const { data: eventTypeConfig, isLoading: isLoadingConfig } = useGetEventTypesEventTypeConfig(
    selectedEventType,
    {
      enabled: !!selectedEventType,
    }
  );

  const createDraftEventMutation = usePostEvents({
    mutation: {
      onSuccess: (data) => {
        setDraftEventId(data.id!);
        setIsCreatingDraft(false);
      },
      onError: () => {
        setIsCreatingDraft(false);
      }
    }
  });

  // Create draft event when event type is selected
  useEffect(() => {
    if (selectedEventType && eventTypeConfig && !draftEventId && !isCreatingDraft) {
      setIsCreatingDraft(true);
      createDraftEventMutation.mutate({
        data: {
          eventType: selectedEventType,
          organizationId: "org-123",
          siteId: "site-456"
        }
      });
    }
  }, [selectedEventType, eventTypeConfig, draftEventId, isCreatingDraft, createDraftEventMutation]);

  const handleEventTypeChange = (eventType: string) => {
    // Reset state when changing event type
    if (eventType !== selectedEventType) {
      setDraftEventId(null);
      setIsCreatingDraft(false);
    }
    setSelectedEventType(eventType);
  };

  const handleStartOver = () => {
    setDraftEventId(null);
    setSelectedEventType("");
    setIsCreatingDraft(false);
  };

  // Show form sections when we have a draft event
  const showFormSections = selectedEventType && eventTypeConfig && (draftEventId || isCreatingDraft);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Create New Event
          </h2>
          <p className="text-gray-600">
            Select an event type to see dynamic form sections and atomic field
            updates in action.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <label className="label">Select Event Type</label>
          <div className="space-y-3">
            {eventTypes.map((type) => (
              <label
                key={type.value}
                className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="radio"
                  name="eventType"
                  value={type.value}
                  checked={selectedEventType === type.value}
                  onChange={(e) => handleEventTypeChange(e.target.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="ml-3 flex-1">
                  <div className="font-medium text-gray-900">{type.label}</div>
                  {selectedEventType === type.value && eventTypeConfig && (
                    <div className="mt-2">
                      <div className="text-sm text-gray-600 mb-2">
                        {eventTypeConfig.displayName}
                      </div>
                      {eventTypeConfig.sections && eventTypeConfig.sections.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Form Sections:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {eventTypeConfig.sections.map((section, index) => (
                              <Badge
                                key={index}
                                variant={section.required ? "default" : "secondary"}
                                size="sm"
                              >
                                {section.displayName}
                                {section.required && " *"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedEventType === type.value && isLoadingConfig && (
                    <div className="mt-2 text-sm text-gray-500">
                      Loading configuration...
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {isCreatingDraft && (
          <div className="text-center py-4">
            <div className="text-sm text-gray-500">
              Creating draft event...
            </div>
          </div>
        )}

        {createDraftEventMutation.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">
              Failed to create draft event. Please try again.
            </p>
          </div>
        )}
      </div>

      {/* Form Sections - Rendered when event type is selected */}
      {showFormSections && draftEventId && (
        <div className="mt-8 space-y-6">
          {/* Header with Start Over button */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {eventTypeConfig?.displayName} - Draft
              </h2>
              <p className="text-sm text-gray-600">
                Fill out the form sections below. Changes are saved automatically.
              </p>
            </div>
            <button onClick={handleStartOver} className="btn btn-secondary">
              ← Start Over
            </button>
          </div>

          {/* Event Metadata Section - Always shown */}
          <EventMetadataSection eventId={draftEventId} />

          {/* Dynamic Sections based on configuration */}
          {eventTypeConfig?.sections?.map((sectionConfig) => (
            <ConditionalSection
              key={sectionConfig.sectionId}
              sectionId={sectionConfig.sectionId!}
              config={sectionConfig}
            >
              {sectionConfig.sectionId === 'persons' && (
                <PersonsSection eventId={draftEventId} />
              )}
              {sectionConfig.sectionId === 'products' && (
                <ProductsSection eventId={draftEventId} />
              )}
              {sectionConfig.sectionId === 'vehicles' && (
                <VehiclesSection eventId={draftEventId} />
              )}
              {sectionConfig.sectionId === 'evidence' && (
                <div className="section">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Evidence
                  </h3>
                  <p className="text-gray-600">
                    Evidence section coming soon...
                  </p>
                </div>
              )}
            </ConditionalSection>
          ))}

          {/* Validation and Publish Section */}
          {console.log('Rendering ValidationStatus with eventId:', draftEventId)}
          <ValidationStatus eventId={draftEventId} />
        </div>
      )}

      {/* Demo Features */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-3">🚀 Demo Features</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Dynamic sections based on event type</li>
            <li>• Atomic field updates with optimistic UI</li>
            <li>• <strong>Polymorphic Zod validation</strong> per event type</li>
            <li>• Real-time field & section validation</li>
            <li>• Add/remove dynamic items</li>
            <li>• Draft/publish workflow with validation gates</li>
          </ul>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-3">🛠 Tech Stack</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• React 18 + TypeScript</li>
            <li>• Vite for fast development</li>
            <li>• TanStack Query for state management</li>
            <li>• <strong>Zod for runtime validation</strong></li>
            <li>• Native fetch API</li>
            <li>• MSW + Orval for API mocking</li>
            <li>• Auror Lumos components</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
