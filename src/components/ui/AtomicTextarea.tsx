import { useAtomicField } from "../../hooks/useAtomicField";
import clsx from "clsx";

interface AtomicTextareaProps {
  eventId: string;
  fieldPath: string;
  initialValue: string;
  label: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  className?: string;
}

export function AtomicTextarea({
  eventId,
  fieldPath,
  initialValue,
  label,
  placeholder,
  rows = 3,
  required = false,
  className
}: AtomicTextareaProps) {
  const { value, updateValue, isUpdating, error } = useAtomicField({
    eventId,
    fieldPath,
    initialValue
  });

  return (
    <div className={clsx("field-group", className)}>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {isUpdating && (
          <span className="ml-2 text-xs text-gray-500">
            <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></span>
            Saving...
          </span>
        )}
      </label>
      <textarea
        value={value || ""}
        onChange={(e) => updateValue(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={clsx(
          "input resize-none",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          isUpdating && "bg-gray-50"
        )}
      />
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
