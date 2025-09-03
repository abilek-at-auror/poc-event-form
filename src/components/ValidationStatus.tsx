import { Badge } from "@aurornz/lumos/Badge";
import { Button } from "@aurornz/lumos/Button";
import { Card } from "@aurornz/lumos/Card";
import { useEventValidation } from "../hooks/useEventValidation";
import { usePostEventsEventIdPublish } from "../generated/events/eventFormsAPI";
import { useQueryClient } from "@tanstack/react-query";

interface ValidationStatusProps {
  eventId: string;
}

export function ValidationStatus({ eventId }: ValidationStatusProps) {
  console.log("ValidationStatus rendering with eventId:", eventId);

  const queryClient = useQueryClient();
  const {
    event,
    isValid,
    canPublish,
    validationSummary,
    allErrors,
    totalErrors
  } = useEventValidation({ eventId });

  console.log("ValidationStatus data:", {
    event,
    isValid,
    canPublish,
    validationSummary,
    totalErrors
  });

  const publishMutation = usePostEventsEventIdPublish({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(["events", eventId], data);
      }
    }
  });

  const handlePublish = () => {
    if (canPublish) {
      publishMutation.mutate({ eventId });
    }
  };

  if (!event || !validationSummary) {
    return (
      <Card className="p-6 bg-gray-50">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">
            Loading validation status...
            {event
              ? " (event loaded, processing validation)"
              : " (loading event data)"}
          </span>
        </div>
      </Card>
    );
  }

  const isPublished = event.status === "published";

  return (
    <Card className="p-6 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-medium text-gray-900">Event Status</h3>
            <Badge
              variant={
                isPublished
                  ? "default"
                  : canPublish
                  ? "secondary"
                  : "destructive"
              }
              size="sm"
            >
              {isPublished
                ? "Published"
                : canPublish
                ? "Ready to Publish"
                : "Draft"}
            </Badge>
          </div>

          {/* Validation Summary */}
          <div className="space-y-3">
            {/* Overall Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Overall Validation:
              </span>
              <Badge variant={isValid ? "default" : "destructive"} size="sm">
                {isValid
                  ? "✓ Valid"
                  : `✗ ${totalErrors} Error${totalErrors !== 1 ? "s" : ""}`}
              </Badge>
            </div>

            {/* Section Status */}
            {Object.entries(validationSummary.sectionSummaries).length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-700 block mb-2">
                  Section Status:
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(validationSummary.sectionSummaries).map(
                    ([section, summary]) => (
                      <div key={section} className="flex items-center gap-1">
                        <Badge
                          variant={summary.valid ? "secondary" : "destructive"}
                          size="sm"
                        >
                          {section.charAt(0).toUpperCase() + section.slice(1)}
                          {summary.valid ? " ✓" : ` ✗ ${summary.errorCount}`}
                        </Badge>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Error Details */}
            {totalErrors > 0 && (
              <div className="mt-4">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-red-700 hover:text-red-800">
                    View {totalErrors} Validation Error
                    {totalErrors !== 1 ? "s" : ""} ▼
                  </summary>
                  <div className="mt-2 space-y-1">
                    {allErrors.map((error, index) => (
                      <div
                        key={index}
                        className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded"
                      >
                        • {error}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Publish Instructions */}
            {!isPublished && !canPublish && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>To publish this event:</strong> Complete all required
                  sections and fix validation errors above.
                </p>
              </div>
            )}

            {!isPublished && canPublish && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>Ready to publish!</strong> All validation requirements
                  have been met.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Publish Button */}
        <div className="ml-6">
          {!isPublished && (
            <Button
              onClick={handlePublish}
              disabled={!canPublish || publishMutation.isPending}
              variant={canPublish ? "default" : "secondary"}
              size="sm"
            >
              {publishMutation.isPending
                ? "Publishing..."
                : canPublish
                ? "Publish Event"
                : "Complete Required Fields"}
            </Button>
          )}

          {isPublished && (
            <Badge variant="default" size="lg">
              ✓ Published
            </Badge>
          )}
        </div>
      </div>

      {/* Publishing Error */}
      {publishMutation.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">
            Failed to publish event. Please try again.
          </p>
        </div>
      )}
    </Card>
  );
}
