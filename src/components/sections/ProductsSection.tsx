import { Card } from "@aurornz/lumos/Card";
import { Button } from "@aurornz/lumos/Button";
import { v4 as uuidv4 } from "uuid";
import { AtomicInput } from "../ui/AtomicInput";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetEventsEventId, usePatchEventsEventId } from "../../generated/events/eventFormsAPI";
import { useSectionValidation } from "../../hooks/useEventValidation";

interface ProductsSectionProps {
  eventId: string;
}

export function ProductsSection({ eventId }: ProductsSectionProps) {
  const queryClient = useQueryClient();
  
  // Fetch event data to get current products
  const { data: event } = useGetEventsEventId(eventId);
  const products = event?.sections?.products || [];

  // Section validation
  const { isValid, errors } = useSectionValidation(eventId, 'products');

  const updateEventMutation = usePatchEventsEventId({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(["events", eventId], data);
      }
    }
  });

  const addProduct = () => {
    const newProduct = {
      id: uuidv4(),
      name: "",
      sku: "",
      quantity: 1,
      unitValue: 0
    };

    updateEventMutation.mutate({
      eventId,
      data: {
        sections: {
          products: [...products, newProduct]
        }
      }
    });
  };

  const removeProduct = (productId: string) => {
    updateEventMutation.mutate({
      eventId,
      data: {
        sections: {
          products: products.filter((p) => p.id !== productId)
        }
      }
    });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Products Involved
          </h3>
          {errors.length > 0 && (
            <div className="mt-1">
              {errors.map((error, index) => (
                <p key={index} className="text-sm text-red-600">
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>
        <Button
          onClick={addProduct}
          disabled={updateEventMutation.isPending}
        >
          + Add Product
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No products added yet.</p>
          <p className="text-sm">Click "Add Product" to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-medium text-gray-900">
                  Product {index + 1}
                </h4>
                <button
                  onClick={() => removeProduct(product.id)}
                  disabled={updateEventMutation.isPending}
                  className="text-red-600 hover:text-red-700 text-sm px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AtomicInput
                  eventId={eventId}
                  fieldPath={`sections.products.${index}.name`}
                  initialValue={product.name || ""}
                  label="Product Name"
                  placeholder="Enter product name"
                  required
                />

                <AtomicInput
                  eventId={eventId}
                  fieldPath={`sections.products.${index}.sku`}
                  initialValue={product.sku || ""}
                  label="SKU"
                  placeholder="Enter SKU"
                />

                <AtomicInput
                  eventId={eventId}
                  fieldPath={`sections.products.${index}.quantity`}
                  initialValue={product.quantity || 1}
                  label="Quantity"
                  placeholder="Enter quantity"
                  type="number"
                  required
                />

                <AtomicInput
                  eventId={eventId}
                  fieldPath={`sections.products.${index}.unitValue`}
                  initialValue={product.unitValue || 0}
                  label="Unit Value ($)"
                  placeholder="0.00"
                  type="number"
                />
              </div>

              {product.quantity && product.unitValue && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Total Value:{" "}
                    <span className="font-semibold">
                      ${(product.quantity * product.unitValue).toFixed(2)}
                    </span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
