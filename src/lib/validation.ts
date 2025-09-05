import { z } from 'zod';
import type { EventResponse } from '../generated/events/eventFormsAPI.schemas';

// Base schemas for common field types
const personSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['suspect', 'victim', 'witness', 'employee']),
  age: z.number().int().min(0).max(150).optional().or(z.literal(''))
});

const vehicleSchema = z.object({
  id: z.string(),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  licensePlate: z.string().optional()
});

const productSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitValue: z.number().min(0, 'Unit value must be non-negative')
});

// Base event metadata schema
const baseEventMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  occurredAt: z.string().min(1, 'Occurrence date/time is required')
});

// Base event schema
const baseEventSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  organizationId: z.string(),
  siteId: z.string(),
  status: z.enum(['draft', 'published']),
  metadata: baseEventMetadataSchema
});

// Shoplifting event schema
const shopliftingEventSchema = baseEventSchema.extend({
  eventType: z.literal('shoplifting'),
  sections: z.object({
    persons: z.array(personSchema).min(1, 'At least one person is required for shoplifting incidents'),
    products: z.array(productSchema).min(1, 'At least one product is required for shoplifting incidents'),
    vehicles: z.array(vehicleSchema).optional()
  })
});

// Accident event schema
const accidentEventSchema = baseEventSchema.extend({
  eventType: z.literal('accident'),
  sections: z.object({
    persons: z.array(personSchema).min(1, 'At least one person is required for accident reports'),
    vehicles: z.array(vehicleSchema).optional(),
    products: z.array(productSchema).optional()
  })
});

// Vandalism event schema
const vandalismEventSchema = baseEventSchema.extend({
  eventType: z.literal('vandalism'),
  sections: z.object({
    persons: z.array(personSchema).optional(),
    vehicles: z.array(vehicleSchema).optional(),
    products: z.array(productSchema).optional(),
    // Evidence section would be added here when implemented
    evidence: z.array(z.unknown()).min(1, 'At least one piece of evidence is required for vandalism reports').optional()
  })
});

// Discriminated union for polymorphic validation
export const eventSchema = z.discriminatedUnion('eventType', [
  shopliftingEventSchema,
  accidentEventSchema,
  vandalismEventSchema
]);

// Individual section schemas for partial validation
export const sectionSchemas = {
  persons: z.array(personSchema),
  vehicles: z.array(vehicleSchema),
  products: z.array(productSchema),
  evidence: z.array(z.unknown())
};

// Validation result type
export type ValidationResult = {
  isValid: boolean;
  canPublish: boolean;
  errors: Record<string, string[]>;
  fieldErrors: Record<string, string>;
  sectionErrors: Record<string, string[]>;
};

// Event type configurations with validation rules
export const eventTypeValidationConfig = {
  shoplifting: {
    requiredSections: ['persons', 'products'] as string[],
    minimumEntries: {
      persons: 1,
      products: 1
    } as Record<string, number>,
    schema: shopliftingEventSchema
  },
  accident: {
    requiredSections: ['persons'] as string[],
    minimumEntries: {
      persons: 1
    } as Record<string, number>,
    schema: accidentEventSchema
  },
  vandalism: {
    requiredSections: ['evidence'] as string[],
    minimumEntries: {
      evidence: 1
    } as Record<string, number>,
    schema: vandalismEventSchema
  }
};

// Validate entire event
export function validateEvent(event: EventResponse | unknown): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    canPublish: false,
    errors: {},
    fieldErrors: {},
    sectionErrors: {}
  };

  // Early return if event is null/undefined
  if (!event) {
    result.errors.event = ['Event data is required'];
    return result;
  }

  try {
    // Validate using the discriminated union
    eventSchema.parse(event);
    result.isValid = true;
    result.canPublish = true;
  } catch (error) {
    if (error instanceof z.ZodError && error.issues && Array.isArray(error.issues)) {
      // Process validation errors
      error.issues.forEach((err: z.ZodIssue) => {
        const path = err.path.join('.');
        
        if (err.path && err.path.length > 0) {
          // Field-level error
          if (err.path[0] === 'sections') {
            // Section-level error
            const sectionName = err.path[1] as string;
            if (!result.sectionErrors[sectionName]) {
              result.sectionErrors[sectionName] = [];
            }
            result.sectionErrors[sectionName].push(err.message);
          } else {
            // General field error
            result.fieldErrors[path] = err.message;
          }
        }
        
        // Add to general errors array
        if (!result.errors[path]) {
          result.errors[path] = [];
        }
        result.errors[path].push(err.message);
      });
    } else {
      // Handle non-Zod errors
      result.errors.general = ['Validation error occurred'];
      console.error('Validation error:', error);
    }
  }

  return result;
}

// Validate specific section
export function validateSection(sectionName: string, sectionData: unknown[], eventType: string): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    canPublish: false,
    errors: {},
    fieldErrors: {},
    sectionErrors: {}
  };

      const config = eventTypeValidationConfig[eventType as keyof typeof eventTypeValidationConfig];
    if (!config) {
      result.errors['eventType'] = ['Unknown event type'];
      return result;
    }

  try {
    // Validate section data structure
    if (sectionSchemas[sectionName as keyof typeof sectionSchemas]) {
      sectionSchemas[sectionName as keyof typeof sectionSchemas].parse(sectionData);
    }

    // Check minimum entries requirement
    const isRequired = config.requiredSections.includes(sectionName);
    const minimumEntries = config.minimumEntries[sectionName] || 0;
    
    if (isRequired && sectionData.length < minimumEntries) {
      result.sectionErrors[sectionName] = [`At least ${minimumEntries} ${sectionName.slice(0, -1)}(s) required`];
    } else {
      result.isValid = true;
      result.canPublish = sectionData.length >= minimumEntries;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((err: z.ZodIssue) => {
        const path = `${sectionName}.${err.path.join('.')}`;
        result.fieldErrors[path] = err.message;
        
        if (!result.errors[path]) {
          result.errors[path] = [];
        }
        result.errors[path].push(err.message);
      });
    }
  }

  return result;
}

// Validate field value
export function validateField(fieldPath: string, value: unknown, eventData: unknown): { isValid: boolean; error?: string } {
  try {
    // Create a test object with the field value
    const testData = { ...(eventData as Record<string, unknown>) };
    const pathParts = fieldPath.split('.');
    
    // Set the field value in the test data
    let current = testData as Record<string, unknown>;
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]] as Record<string, unknown>;
    }
    current[pathParts[pathParts.length - 1]] = value;

    // Validate the entire event to check this field
    const validation = validateEvent(testData);
    const fieldError = validation.fieldErrors[fieldPath];
    
    return {
      isValid: !fieldError,
      error: fieldError
    };
  } catch {
    return {
      isValid: false,
      error: 'Validation error'
    };
  }
}

// Get validation summary for UI
export function getValidationSummary(event: EventResponse | unknown): {
  overallValid: boolean;
  canPublish: boolean;
  totalErrors: number;
  sectionSummaries: Record<string, { valid: boolean; errorCount: number; errors: string[] }>;
} {
  // Early return if event is invalid
  const eventObj = event as Record<string, unknown>;
  if (!event || !eventObj.id || !eventObj.eventType) {
    return {
      overallValid: false,
      canPublish: false,
      totalErrors: 1,
      sectionSummaries: {}
    };
  }

  const validation = validateEvent(event);
  
  const sectionSummaries: Record<string, { valid: boolean; errorCount: number; errors: string[] }> = {};
  
  // Process section errors
  Object.entries(validation.sectionErrors).forEach(([section, errors]) => {
    sectionSummaries[section] = {
      valid: errors.length === 0,
      errorCount: errors.length,
      errors
    };
  });

  // Add sections that might not have errors but exist in the event
  if (eventObj.sections) {
    Object.keys(eventObj.sections as Record<string, unknown>).forEach(section => {
      if (!sectionSummaries[section]) {
        sectionSummaries[section] = {
          valid: true,
          errorCount: 0,
          errors: []
        };
      }
    });
  }

  return {
    overallValid: validation.isValid,
    canPublish: validation.canPublish,
    totalErrors: Object.values(validation.errors).flat().length,
    sectionSummaries
  };
}

// Export types
export type EventSchema = z.infer<typeof eventSchema>;
export type PersonSchema = z.infer<typeof personSchema>;
export type VehicleSchema = z.infer<typeof vehicleSchema>;
export type ProductSchema = z.infer<typeof productSchema>;
