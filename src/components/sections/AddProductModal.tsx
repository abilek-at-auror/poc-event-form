import { useState } from "react";
import { Card } from "@aurornz/lumos/Card";
import { Button } from "@aurornz/lumos/Button";
import { useQueryClient } from "@tanstack/react-query";
import { usePostEventsEventIdProducts } from "../../generated/events/eventFormsAPI";
import type { ProductInvolved } from "../../generated/events/eventFormsAPI.schemas";

interface AddProductModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Optional callback after successful save
}

export function AddProductModal({
  eventId,
  isOpen,
  onClose,
  onSuccess
}: AddProductModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    quantity: "1",
    unitValue: ""
  });

  // Mutation for adding product
  const addProductMutation = usePostEventsEventIdProducts({
    mutation: {
      onSuccess: (data) => {
        // React Query will automatically invalidate and refetch the products list

        // Reset form
        setFormData({ name: "", sku: "", quantity: "1", unitValue: "" });

        // Close modal
        onClose();

        // Optional success callback
        onSuccess?.();
      },
      onError: (error) => {
        console.error("Failed to add product:", error);
        // Could add error handling UI here
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Use mutation to add product - the backend will assign the ID
    addProductMutation.mutate({
      eventId,
      data: {
        name: formData.name,
        sku: formData.sku,
        quantity: formData.quantity ? parseInt(formData.quantity) : 1,
        unitValue: formData.unitValue ? parseFloat(formData.unitValue) : 0
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Add New Product
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter product name"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU *
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) =>
                setFormData({ ...formData, sku: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter product SKU"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Value ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.unitValue}
                onChange={(e) =>
                  setFormData({ ...formData, unitValue: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                min="0"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !formData.name.trim() ||
                !formData.sku.trim() ||
                addProductMutation.isPending
              }
            >
              {addProductMutation.isPending ? "Adding..." : "Add Product"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
