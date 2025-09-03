import { useAtomicField } from "../../hooks/useAtomicField";
import clsx from "clsx";

interface AtomicSelectProps {
  eventId: string;
  fieldPath: string;
  initialValue: string;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
}

export function AtomicSelect({
  eventId,
  fieldPath,
  initialValue,
  label,
  options,
  required = false,
  className
}: AtomicSelectProps) {
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
      <select
        value={value || ""}
        onChange={(e) => updateValue(e.target.value)}
        className={clsx(
          "input",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          isUpdating && "bg-gray-50"
        )}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
