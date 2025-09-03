import { Card } from "@aurornz/lumos/Card";
import { AtomicInput } from "../ui/AtomicInput";
import { AtomicTextarea } from "../ui/AtomicTextarea";
import { AtomicSelect } from "../ui/AtomicSelect";

interface EventMetadataSectionProps {
  eventId: string;
  metadata: any;
}

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" }
];

export function EventMetadataSection({
  eventId,
  metadata
}: EventMetadataSectionProps) {
  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Event Details
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AtomicInput
          eventId={eventId}
          fieldPath="metadata.title"
          initialValue={metadata?.title || ""}
          label="Event Title"
          placeholder="Enter event title"
          required
        />

        <AtomicSelect
          eventId={eventId}
          fieldPath="metadata.priority"
          initialValue={metadata?.priority || "medium"}
          label="Priority"
          options={priorityOptions}
          required
        />
      </div>

      <AtomicTextarea
        eventId={eventId}
        fieldPath="metadata.description"
        initialValue={metadata?.description || ""}
        label="Description"
        placeholder="Describe what happened..."
        rows={4}
        required
      />

      <AtomicInput
        eventId={eventId}
        fieldPath="metadata.occurredAt"
        initialValue={
          metadata?.occurredAt
            ? new Date(metadata.occurredAt).toISOString().slice(0, 16)
            : ""
        }
        label="Date & Time Occurred"
        type="datetime-local"
        required
      />
    </Card>
  );
}
