import { z } from 'zod';
import { 
  getEventsEventIdResponse,
  getEventsEventIdPersonsResponseItem,
  getEventsEventIdVehiclesResponseItem,
  getEventsEventIdProductsResponseItem
} from '../generated/zod-schemas';
import type { EventResponse } from '../generated/events/eventFormsAPI.schemas';

// Re-export the generated Zod schemas with cleaner names
export const generatedEventSchema = getEventsEventIdResponse;
export const generatedPersonSchema = getEventsEventIdPersonsResponseItem;
export const generatedVehicleSchema = getEventsEventIdVehiclesResponseItem;
export const generatedProductSchema = getEventsEventIdProductsResponseItem;

// Create a more specific discriminated union using the generated schemas as a base
// Extract the base event structure from the generated schema
const baseEventFromGenerated = z.object({
  id: z.string(),
  eventType: z.string(),
  organizationId: z.string(),
  siteId: z.string(),
  status: z.enum(['draft', 'published']),
  metadata: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    occurredAt: z.string().datetime()
  })
});

// Create discriminated union schemas using generated base schemas
const shopliftingEventSchema = baseEventFromGenerated.extend({
  eventType: z.literal('shoplifting'),
  sections: z.object({
    persons: z.array(generatedPersonSchema).min(1, 'At least one person is required for shoplifting incidents'),
    products: z.array(generatedProductSchema).min(1, 'At least one product is required for shoplifting incidents'),
    vehicles: z.array(generatedVehicleSchema).optional()
  })
});

const accidentEventSchema = baseEventFromGenerated.extend({
  eventType: z.literal('accident'),
  sections: z.object({
    persons: z.array(generatedPersonSchema).min(1, 'At least one person is required for accident reports'),
    vehicles: z.array(generatedVehicleSchema).optional(),
    products: z.array(generatedProductSchema).optional()
  })
});

const vandalismEventSchema = baseEventFromGenerated.extend({
  eventType: z.literal('vandalism'),
  sections: z.object({
    persons: z.array(generatedPersonSchema).optional(),
    vehicles: z.array(generatedVehicleSchema).optional(),
    products: z.array(generatedProductSchema).optional(),
    evidence: z.array(z.any()).min(1, 'At least one piece of evidence is required for vandalism reports').optional()
  })
});

// Create the discriminated union using orval-generated base schemas
export const hybridEventSchema = z.discriminatedUnion('eventType', [
  shopliftingEventSchema,
  accidentEventSchema,
  vandalismEventSchema
]);

// Individual section schemas using generated schemas
export const hybridSectionSchemas = {
  persons: z.array(generatedPersonSchema),
  vehicles: z.array(generatedVehicleSchema),
  products: z.array(generatedProductSchema),
  evidence: z.array(z.any())
};

// Validation result type (same as before)
export type ValidationResult = {
  isValid: boolean;
  canPublish: boolean;
  errors: Record<string, string[]>;
  fieldErrors: Record<string, string>;
  sectionErrors: Record<string, string[]>;
};

// Event type configurations using the hybrid approach
export const hybridEventTypeValidationConfig = {
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

// Validate entire event using hybrid approach
export function validateEventWithOrval(event: EventResponse): ValidationResult {
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
    // Validate using the hybrid discriminated union
    hybridEventSchema.parse(event);
    result.isValid = true;
    result.canPublish = true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Process validation errors (same logic as before)
      error.issues.forEach((err) => {
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

// Validate specific section using generated schemas
export function validateSectionWithOrval(sectionName: string, sectionData: unknown[], eventType: string): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    canPublish: false,
    errors: {},
    fieldErrors: {},
    sectionErrors: {}
  };

  const config = hybridEventTypeValidationConfig[eventType as keyof typeof hybridEventTypeValidationConfig];
  if (!config) {
    result.errors['eventType'] = ['Unknown event type'];
    return result;
  }

  try {
    // Validate section data structure using generated schemas
    if (hybridSectionSchemas[sectionName as keyof typeof hybridSectionSchemas]) {
      hybridSectionSchemas[sectionName as keyof typeof hybridSectionSchemas].parse(sectionData);
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
      error.issues.forEach((err) => {
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

// Export types derived from generated schemas
export type HybridEventSchema = z.infer<typeof hybridEventSchema>;
export type GeneratedPersonSchema = z.infer<typeof generatedPersonSchema>;
export type GeneratedVehicleSchema = z.infer<typeof generatedVehicleSchema>;
export type GeneratedProductSchema = z.infer<typeof generatedProductSchema>;

// Example usage:
/*
import { validateEventWithOrval, hybridEventSchema } from './validation-with-orval';

// Use the hybrid validation function
const validationResult = validateEventWithOrval(eventData);

// Or use the schema directly for parsing
try {
  const validEvent = hybridEventSchema.parse(eventData);
  console.log('Event is valid:', validEvent);
} catch (error) {
  console.error('Validation failed:', error);
}
*/
