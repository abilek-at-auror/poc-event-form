import { useState } from "react";
import { Card } from "@aurornz/lumos/Card";
import { Button } from "@aurornz/lumos/Button";
import { AtomicProductInput } from "../ui/AtomicProductInput";
import {
  useGetEventsEventIdProducts,
  useDeleteEventsEventIdProductsProductId,
  getGetEventsEventIdQueryKey,
  getGetEventsEventIdProductsQueryKey
} from "../../generated/events/eventFormsAPI";
import { useQueryClient } from "@tanstack/react-query";
import type {
  EventResponse,
  ProductInvolved
} from "../../generated/events/eventFormsAPI.schemas";
import { useSectionValidation } from "../../hooks/useEventValidation";
import { AddProductModal } from "./AddProductModal";

interface ProductsSectionProps {
  eventId: string;
}

export function ProductsSection({ eventId }: ProductsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch products data directly from section endpoint
  const { data: products = [] } = useGetEventsEventIdProducts(eventId);

  // Section validation
  const { errors } = useSectionValidation(eventId, "products");

  // Debug logging
  console.log("ProductsSection Debug:", {
    productsCount: products.length,
    products: products.map((p) => ({ id: p.id, name: p.name })),
    errors
  });

  // Mutation for deleting products
  const deleteProductMutation = useDeleteEventsEventIdProductsProductId({
    mutation: {
      onSuccess: (_, variables) => {
        // Update the main event cache to remove the deleted product
        const eventQueryKey = getGetEventsEventIdQueryKey(eventId);
        const productsQueryKey = getGetEventsEventIdProductsQueryKey(eventId);
        queryClient.setQueryData(
          eventQueryKey,
          (oldEvent: EventResponse | undefined) => {
            if (!oldEvent) return oldEvent;

            const updatedEvent = {
              ...oldEvent,
              sections: {
                ...oldEvent.sections,
                products: (oldEvent.sections?.products || []).filter(
                  (p: ProductInvolved) => p.id !== variables.productId
                )
              }
            } as EventResponse;

            console.log(
              "Updated main event cache after product delete:",
              updatedEvent
            );
            return updatedEvent;
          }
        );

        queryClient.invalidateQueries({
          queryKey: productsQueryKey,
          refetchType: "active"
        });

        // React Query will automatically invalidate and refetch the products list
      }
    }
  });

  const removeProduct = (productId: string) => {
    deleteProductMutation.mutate({
      eventId,
      productId
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
        <Button onClick={() => setIsModalOpen(true)}>+ Add Product</Button>
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
                  onClick={() => removeProduct(product.id!)}
                  disabled={deleteProductMutation.isPending}
                  className="text-red-600 hover:text-red-700 text-sm px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AtomicProductInput
                  eventId={eventId}
                  productId={product.id!}
                  fieldName="name"
                  initialValue={product.name || ""}
                  label="Product Name"
                  placeholder="Enter product name"
                  required
                />

                <AtomicProductInput
                  eventId={eventId}
                  productId={product.id!}
                  fieldName="sku"
                  initialValue={product.sku || ""}
                  label="SKU"
                  placeholder="Enter SKU"
                />

                <AtomicProductInput
                  eventId={eventId}
                  productId={product.id!}
                  fieldName="quantity"
                  initialValue={product.quantity || 1}
                  label="Quantity"
                  placeholder="Enter quantity"
                  type="number"
                  required
                />

                <AtomicProductInput
                  eventId={eventId}
                  productId={product.id!}
                  fieldName="unitValue"
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

      <AddProductModal
        eventId={eventId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </Card>
  );
}
