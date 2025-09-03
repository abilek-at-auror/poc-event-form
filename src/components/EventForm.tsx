import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api-client";

interface EventFormProps {
  eventId: string;
}

export default function EventForm({ eventId }: EventFormProps) {
  const {
    data: event,
    isLoading,
    error
  } = useQuery({
    queryKey: ["events", eventId],
    queryFn: () => api.get(`/events/${eventId}`)
  });

  const { data: config } = useQuery({
    queryKey: ["event-types", event?.eventType, "config"],
    queryFn: () => api.get(`/event-types/${event?.eventType}/config`),
    enabled: !!event?.eventType
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading event...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 border-red-200 bg-red-50">
        <h3 className="text-lg font-medium text-red-800 mb-2">
          Error Loading Event
        </h3>
        <p className="text-red-700">
          Failed to load event data. Please try refreshing the page.
        </p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="card p-6">
        <p className="text-gray-600">Event not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Type Header */}
      <div className="card p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-blue-900">
              {config?.displayName || event.eventType}
            </h2>
            <p className="text-sm text-blue-700">Event ID: {event.id}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-700">Status</p>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                event.status === "published"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {event.status === "published" ? "Published" : "Draft"}
            </span>
          </div>
        </div>
      </div>

      {/* Basic Event Info */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Event Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="label">Event Type</label>
            <p className="text-gray-900">{event.eventType}</p>
          </div>
          <div>
            <label className="label">Organization ID</label>
            <p className="text-gray-900">{event.organizationId}</p>
          </div>
          <div>
            <label className="label">Site ID</label>
            <p className="text-gray-900">{event.siteId}</p>
          </div>
        </div>
      </div>

      {/* Configuration Display */}
      {config && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Form Configuration
          </h3>
          <div className="space-y-2">
            {config.sections?.map((section: any) => (
              <div
                key={section.sectionId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div>
                  <span className="font-medium">{section.displayName}</span>
                  {section.required && (
                    <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      Required
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  Min: {section.minimumEntries}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coming Soon */}
      <div className="card p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          🚧 Form Components Coming Soon
        </h3>
        <p className="text-gray-600">
          Dynamic form sections with atomic field updates will be implemented
          next.
        </p>
      </div>
    </div>
  );
}
