import { useAtomicVehicleField } from "../../hooks/useAtomicVehicleField";
import { useFieldValidation } from "../../hooks/useEventValidation";
import clsx from "clsx";

interface AtomicVehicleInputProps {
  eventId: string;
  vehicleId: string;
  fieldName: "make" | "model" | "licensePlate";
  initialValue: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function AtomicVehicleInput({
  eventId,
  vehicleId,
  fieldName,
  initialValue,
  label,
  placeholder,
  required = false,
  className
}: AtomicVehicleInputProps) {
  const { value, updateValue, isUpdating, error } = useAtomicVehicleField({
    eventId,
    vehicleId,
    fieldName,
    initialValue: initialValue?.toString() || ""
  });

  // For validation, we'll use a simplified field path
  const fieldPath = `vehicles.${vehicleId}.${fieldName}`;
  const { data: fieldValidation } = useFieldValidation(
    eventId,
    fieldPath,
    value
  );
  const validationError = fieldValidation?.error;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      <input
        type="text"
        value={value || ""}
        onChange={handleChange}
        placeholder={placeholder}
        className={clsx(
          "input",
          (error || validationError) &&
            "border-red-500 focus:border-red-500 focus:ring-red-500",
          fieldValidation?.isValid === true &&
            value &&
            "border-green-500 focus:border-green-500 focus:ring-green-500",
          isUpdating && "bg-gray-50"
        )}
      />
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
