import { Card } from "@aurornz/lumos/Card";
import { Badge } from "@aurornz/lumos/Badge";
import {
  useGetEventsEventId,
  useGetEventTypesEventTypeConfig
} from "../generated/events/eventFormsAPI";
import type { SectionConfig } from "../generated/events/eventFormsAPI.schemas";
import { EventMetadataSection } from "./sections/EventMetadataSection";
import { PersonsSection } from "./sections/PersonsSection";
import { ProductsSection } from "./sections/ProductsSection";
import { VehiclesSection } from "./sections/VehiclesSection";
import { ConditionalSection } from "./ConditionalSection";

interface EventFormProps {
  eventId: string;
}

export default function EventForm({ eventId }: EventFormProps) {
  // Get event data using Orval-generated hook
  const { data: event, isLoading, error } = useGetEventsEventId(eventId);

  // Get event type configuration using Orval-generated hook
  const { data: config } = useGetEventTypesEventTypeConfig(
    event?.eventType || "",
    {
      query: {
        enabled: !!event?.eventType
      }
    }
  );

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
      <Card className="p-6 border-red-200 bg-red-50">
        <h3 className="text-lg font-medium text-red-800 mb-2">
          Error Loading Event
        </h3>
        <p className="text-red-700">
          Failed to load event data. Please try refreshing the page.
        </p>
      </Card>
    );
  }

  if (!event) {
    return (
      <Card className="p-6">
        <p className="text-gray-600">Event not found.</p>
      </Card>
    );
  }

  const getSectionConfig = (sectionId: string): SectionConfig | undefined => {
    return config?.sections?.find(
      (s: SectionConfig) => s.sectionId === sectionId
    );
  };

  return (
    <div className="space-y-6">
      {/* Event Type Header */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-blue-900">
              {config?.displayName || event.eventType}
            </h2>
            <p className="text-sm text-blue-700">Event ID: {event.id}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-700">Status</p>
            <Badge
              label={event.status === "published" ? "Published" : "Draft"}
              className={
                event.status === "published"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }
            />
          </div>
        </div>
      </Card>

      {/* Event Metadata */}
      <EventMetadataSection eventId={eventId} metadata={event.metadata} />

      {/* Dynamic Sections */}
      <ConditionalSection
        sectionId="persons"
        config={getSectionConfig("persons")}
      >
        <PersonsSection eventId={eventId} />
      </ConditionalSection>

      <ConditionalSection
        sectionId="products"
        config={getSectionConfig("products")}
      >
        <ProductsSection eventId={eventId} />
      </ConditionalSection>

      <ConditionalSection
        sectionId="vehicles"
        config={getSectionConfig("vehicles")}
      >
        <VehiclesSection eventId={eventId} />
      </ConditionalSection>

      {/* Configuration Display for Reference */}
      {config && (
        <Card className="p-6 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Active Sections for {config.displayName}
          </h3>
          <div className="space-y-2">
            {config.sections?.map((section: SectionConfig) => (
              <div
                key={section.sectionId}
                className="flex items-center justify-between p-3 bg-white rounded border"
              >
                <div>
                  <span className="font-medium">{section.displayName}</span>
                  {section.required && (
                    <Badge
                      label="Required"
                      className="ml-2 text-xs bg-red-100 text-red-800"
                    />
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  Min: {section.minimumEntries}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
