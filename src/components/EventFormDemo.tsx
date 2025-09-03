import { useState } from "react";
import { api } from "../lib/api-client";
import { useMutation } from "@tanstack/react-query";
import EventForm from "./EventForm";

const eventTypes = [
  {
    value: "shoplifting",
    label: "Shoplifting Incident",
    description: "Requires persons and products"
  },
  {
    value: "accident",
    label: "Accident Report",
    description: "Requires persons, optional vehicles"
  },
  {
    value: "vandalism",
    label: "Vandalism Report",
    description: "Optional persons, requires evidence"
  }
];

export default function EventFormDemo() {
  const [selectedEventType, setSelectedEventType] = useState("");
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);

  const createEventMutation = useMutation({
    mutationFn: async (data: {
      eventType: string;
      organizationId: string;
      siteId: string;
    }) => {
      return await api.post("/events", data);
    },
    onSuccess: (data: any) => {
      setCurrentEventId(data.id);
    }
  });

  const handleCreateEvent = async () => {
    if (!selectedEventType) return;

    createEventMutation.mutate({
      eventType: selectedEventType,
      organizationId: "org-123",
      siteId: "site-456"
    });
  };

  const handleStartOver = () => {
    setCurrentEventId(null);
    setSelectedEventType("");
  };

  if (currentEventId) {
    return (
      <div>
        <div className="mb-6">
          <button onClick={handleStartOver} className="btn-secondary">
            ← Start New Event
          </button>
        </div>
        <EventForm eventId={currentEventId} />
      </div>
    );
  }

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
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-sm text-gray-500">
                    {type.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleCreateEvent}
            disabled={!selectedEventType || createEventMutation.isPending}
            className="btn-primary px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createEventMutation.isPending
              ? "Creating Event..."
              : "Create Event"}
          </button>
        </div>

        {createEventMutation.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">
              Failed to create event. Please try again.
            </p>
          </div>
        )}
      </div>

      {/* Demo Features */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-3">🚀 Demo Features</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Dynamic sections based on event type</li>
            <li>• Atomic field updates with optimistic UI</li>
            <li>• Real-time validation feedback</li>
            <li>• Add/remove dynamic items</li>
            <li>• Draft/publish workflow</li>
          </ul>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-3">🛠 Tech Stack</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• React 18 + TypeScript</li>
            <li>• Vite for fast development</li>
            <li>• TanStack Query for state management</li>
            <li>• Native fetch API</li>
            <li>• MSW for API mocking</li>
            <li>• Orval for code generation</li>
            <li>• Auror Lumos components</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
