import { useAtomicPersonField } from "../../hooks/useAtomicPersonField";
import { useFieldValidation } from "../../hooks/useEventValidation";
import clsx from "clsx";

interface AtomicPersonSelectProps {
  eventId: string;
  personId: string;
  initialValue: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  className?: string;
}

export function AtomicPersonSelect({
  eventId,
  personId,
  initialValue,
  label,
  options,
  required = false,
  className
}: AtomicPersonSelectProps) {
  const { value, updateValue, isUpdating, error } = useAtomicPersonField({
    eventId,
    personId,
    fieldName: "role",
    initialValue
  });

  // For validation, we'll use a simplified field path
  const fieldPath = `persons.${personId}.role`;
  const { data: fieldValidation } = useFieldValidation(
    eventId,
    fieldPath,
    value
  );
  const validationError = fieldValidation?.error;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateValue(e.target.value);
  };

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
        onChange={handleChange}
        className={clsx(
          "select",
          (error || validationError) &&
            "border-red-500 focus:border-red-500 focus:ring-red-500",
          fieldValidation?.isValid === true &&
            value &&
            "border-green-500 focus:border-green-500 focus:ring-green-500",
          isUpdating && "bg-gray-50"
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {(error || validationError) && (
        <p className="text-sm text-red-600 mt-1">{error || validationError}</p>
      )}
      {fieldValidation?.isValid === true &&
        value &&
        !error &&
        !validationError && (
          <p className="text-sm text-green-600 mt-1">✓ Valid</p>
        )}
    </div>
  );
}
