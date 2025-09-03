import { useAtomicProductField } from "../../hooks/useAtomicProductField";
import { useFieldValidation } from "../../hooks/useEventValidation";
import clsx from "clsx";

interface AtomicProductInputProps {
  eventId: string;
  productId: string;
  fieldName: "name" | "sku" | "quantity" | "unitValue";
  initialValue: string | number;
  label: string;
  placeholder?: string;
  type?: "text" | "number";
  required?: boolean;
  className?: string;
}

export function AtomicProductInput({
  eventId,
  productId,
  fieldName,
  initialValue,
  label,
  placeholder,
  type = "text",
  required = false,
  className
}: AtomicProductInputProps) {
  const { value, updateValue, isUpdating, error } = useAtomicProductField({
    eventId,
    productId,
    fieldName,
    initialValue:
      type === "number" ? initialValue : initialValue?.toString() || ""
  });

  // For validation, we'll use a simplified field path
  const fieldPath = `products.${productId}.${fieldName}`;
  const { data: fieldValidation } = useFieldValidation(
    eventId,
    fieldPath,
    value
  );
  const validationError = fieldValidation?.error;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue =
      type === "number"
        ? e.target.value
          ? parseFloat(e.target.value)
          : 0
        : e.target.value;
    updateValue(newValue);
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
        type={type}
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
