import { z } from 'zod';
import { 
  generatedEventSchema,
  hybridSectionSchemas
} from './validation-with-orval';
import type { 
  EventResponse, 
  EventTypeConfig, 
  PersonInvolved, 
  ProductInvolved, 
  SectionConfig, 
  VehicleInvolved 
} from '../generated/events/eventFormsAPI.schemas';

// Validation result type
export type ValidationResult = {
  isValid: boolean;
  canPublish: boolean;
  errors: Record<string, string[]>;
  fieldErrors: Record<string, string>;
  sectionErrors: Record<string, string[]>;
};

/**
 * Dynamic validation that uses SectionConfig from the API
 * instead of hardcoded validation rules
 */
export class DynamicValidator {
  private eventTypeConfig: EventTypeConfig | null = null;

  constructor(eventTypeConfig?: EventTypeConfig) {
    this.eventTypeConfig = eventTypeConfig || null;
  }

  /**
   * Update the event type configuration
   */
  updateConfig(config: EventTypeConfig) {
    this.eventTypeConfig = config;
  }

  /**
   * Get validation rules for a section based on SectionConfig
   */
  private getSectionValidationRules(sectionId: string): {
    required: boolean;
    minimumEntries: number;
    displayName: string;
  } {
    if (!this.eventTypeConfig?.sections) {
      // Fallback to default rules if no config
      return {
        required: false,
        minimumEntries: 0,
        displayName: sectionId
      };
    }

    const sectionConfig = this.eventTypeConfig.sections.find(
      (section: SectionConfig) => section.sectionId === sectionId
    );

    return {
      required: sectionConfig?.required ?? false,
      minimumEntries: sectionConfig?.minimumEntries ?? 0,
      displayName: sectionConfig?.displayName ?? sectionId
    };
  }

  /**
   * Validate entire event using dynamic rules from SectionConfig
   */
  validateEvent(event: EventResponse): ValidationResult {
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
      // Validate using the hybrid discriminated union (structure validation)
      generatedEventSchema.parse(event);
      
      // Additional validation using dynamic SectionConfig rules
      if (this.eventTypeConfig?.sections && event.sections) {
        let hasValidationErrors = false;

        for (const sectionConfig of this.eventTypeConfig.sections) {
          const sectionId = sectionConfig.sectionId;
          if (!sectionId) continue;

          const sections = event.sections as Record<string, unknown[]>;
          const sectionData = sections[sectionId] || [];
          const rules = this.getSectionValidationRules(sectionId);

          // Check if required section has minimum entries
          if (rules.required && sectionData.length < rules.minimumEntries) {
            const errorMessage = rules.minimumEntries === 1 
              ? `At least 1 ${rules.displayName?.toLowerCase() || sectionId.slice(0, -1)} is required`
              : `At least ${rules.minimumEntries} ${rules.displayName?.toLowerCase() || sectionId} are required`;
            
            result.sectionErrors[sectionId] = [errorMessage];
            result.errors[`sections.${sectionId}`] = [errorMessage];
            hasValidationErrors = true;
          }
        }

        result.isValid = !hasValidationErrors;
        result.canPublish = !hasValidationErrors;
      } else {
        // If no config available, just check structure validation
        result.isValid = true;
        result.canPublish = true;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Process validation errors
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

  /**
   * Validate specific section using dynamic rules
   */
  validateSection(sectionName: string, sectionData: unknown[]): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      canPublish: false,
      errors: {},
      fieldErrors: {},
      sectionErrors: {}
    };

    const rules = this.getSectionValidationRules(sectionName);

    try {
      // Validate section data structure using generated schemas
      if (hybridSectionSchemas[sectionName as keyof typeof hybridSectionSchemas]) {
        hybridSectionSchemas[sectionName as keyof typeof hybridSectionSchemas].parse(sectionData);
      }

      // Check minimum entries requirement using dynamic rules
      if (rules.required && sectionData.length < rules.minimumEntries) {
        const errorMessage = rules.minimumEntries === 1 
          ? `At least 1 ${rules.displayName?.toLowerCase() || sectionName.slice(0, -1)} is required`
          : `At least ${rules.minimumEntries} ${rules.displayName?.toLowerCase() || sectionName} are required`;
        
        result.sectionErrors[sectionName] = [errorMessage];
      } else {
        result.isValid = true;
        result.canPublish = sectionData.length >= rules.minimumEntries;
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

  /**
   * Get validation summary for UI using dynamic rules
   */
  getValidationSummary(event: EventResponse): {
    overallValid: boolean;
    canPublish: boolean;
    totalErrors: number;
    sectionSummaries: Record<string, { valid: boolean; errorCount: number; errors: string[] }>;
  } {
    // Early return if event is invalid
    if (!event || !event.id || !event.eventType) {
      return {
        overallValid: false,
        canPublish: false,
        totalErrors: 1,
        sectionSummaries: {}
      };
    }

    const validation = this.validateEvent(event);
    
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
    if (event.sections) {
      Object.keys(event.sections).forEach(section => {
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
}

/**
 * Create a validator instance with event type configuration
 */
export function createDynamicValidator(eventTypeConfig?: EventTypeConfig): DynamicValidator {
  return new DynamicValidator(eventTypeConfig);
}

/**
 * Hook-friendly functions that work with React Query
 */
export function validateEventDynamic(event: EventResponse, eventTypeConfig?: EventTypeConfig): ValidationResult {
  const validator = createDynamicValidator(eventTypeConfig);
  return validator.validateEvent(event);
}

export function validateSectionDynamic(
  sectionName: string, 
  sectionData: PersonInvolved[] | VehicleInvolved[] | ProductInvolved[] | unknown[], 
  eventTypeConfig?: EventTypeConfig
): ValidationResult {
  const validator = createDynamicValidator(eventTypeConfig);
  return validator.validateSection(sectionName, sectionData);
}

export function getValidationSummaryDynamic(
  event: EventResponse, 
  eventTypeConfig?: EventTypeConfig
): {
  overallValid: boolean;
  canPublish: boolean;
  totalErrors: number;
  sectionSummaries: Record<string, { valid: boolean; errorCount: number; errors: string[] }>;
} {
  const validator = createDynamicValidator(eventTypeConfig);
  return validator.getValidationSummary(event);
}
