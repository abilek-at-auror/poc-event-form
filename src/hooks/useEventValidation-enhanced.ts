import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGetEventsEventId } from '../generated/events/eventFormsAPI';
import { 
  validateEventWithOrval, 
  validateSectionWithOrval, 
  hybridEventSchema,
  type ValidationResult 
} from '../lib/validation-with-orval';

interface UseEventValidationEnhancedOptions {
  eventId: string;
  enabled?: boolean;
}

/**
 * Enhanced event validation hook that uses orval-generated schemas
 * and the hybrid validation approach.
 * 
 * This demonstrates how to build validation hooks on top of orval-generated
 * base hooks while leveraging the generated Zod schemas.
 */
export function useEventValidationEnhanced({ 
  eventId, 
  enabled = true 
}: UseEventValidationEnhancedOptions) {
  // Use the orval-generated query hook
  const { data: event, isLoading, error: fetchError } = useGetEventsEventId(eventId, {
    query: {
      enabled: enabled && !!eventId
    }
  });

  // Memoized validation using orval-generated schemas
  const validationResult = useMemo(() => {
    if (!event || !event.id || !event.eventType) return null;
    return validateEventWithOrval(event);
  }, [event]);

  // Memoized validation summary for UI
  const validationSummary = useMemo(() => {
    if (!event || !event.id || !event.eventType) {
      return {
        overallValid: false,
        canPublish: false,
        totalErrors: 1,
        sectionSummaries: {}
      };
    }
    
    try {
      // Use the hybrid validation approach with orval schemas
      const result = validateEventWithOrval(event);
      
      const sectionSummaries: Record<string, { valid: boolean; errorCount: number; errors: string[] }> = {};
      
      // Process section errors
      Object.entries(result.sectionErrors).forEach(([section, errors]) => {
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
        overallValid: result.isValid,
        canPublish: result.canPublish,
        totalErrors: Object.values(result.errors).flat().length,
        sectionSummaries
      };
    } catch (error) {
      console.error('Error generating validation summary:', error, event);
      return {
        overallValid: false,
        canPublish: false,
        totalErrors: 1,
        sectionSummaries: {}
      };
    }
  }, [event]);

  // Section-specific validation using orval schemas
  const validateEventSection = useMemo(() => {
    return (sectionName: string) => {
      if (!event || !event.sections || !event.eventType) return null;
      const sectionData = (event.sections as any)[sectionName] || [];
      return validateSectionWithOrval(sectionName, sectionData, event.eventType);
    };
  }, [event]);

  // Check if specific section is valid
  const isSectionValid = useMemo(() => {
    return (sectionName: string) => {
      const sectionValidation = validateEventSection(sectionName);
      return sectionValidation?.isValid ?? false;
    };
  }, [validateEventSection]);

  // Get errors for a specific section
  const getSectionErrors = useMemo(() => {
    return (sectionName: string) => {
      const sectionValidation = validateEventSection(sectionName);
      return sectionValidation?.sectionErrors[sectionName] || [];
    };
  }, [validateEventSection]);

  // Check if event can be published
  const canPublish = useMemo(() => {
    return validationResult?.canPublish ?? false;
  }, [validationResult]);

  // Get all validation errors as a flat array for display
  const allErrors = useMemo(() => {
    if (!validationResult) return [];
    return Object.values(validationResult.errors).flat();
  }, [validationResult]);

  // Get field-specific errors
  const getFieldError = useMemo(() => {
    return (fieldPath: string) => {
      return validationResult?.fieldErrors[fieldPath] || null;
    };
  }, [validationResult]);

  // Real-time validation using orval schemas
  const validateWithSchema = useMemo(() => {
    return (data: any) => {
      try {
        hybridEventSchema.parse(data);
        return { isValid: true, errors: [] };
      } catch (error: any) {
        return { 
          isValid: false, 
          errors: error.errors || [{ message: 'Validation failed' }] 
        };
      }
    };
  }, []);

  return {
    // Data
    event,
    isLoading,
    fetchError,
    
    // Validation results using orval schemas
    validationResult,
    validationSummary,
    
    // Status checks
    isValid: validationResult?.isValid ?? false,
    canPublish,
    
    // Error information
    allErrors,
    totalErrors: allErrors.length,
    
    // Section-specific utilities using orval schemas
    validateEventSection,
    isSectionValid,
    getSectionErrors,
    
    // Field-specific utilities
    getFieldError,
    
    // Schema-based validation
    validateWithSchema,
    
    // Validation utilities
    revalidate: () => {
      // This will be handled automatically by the query refetch
      // when the event data changes
    }
  };
}

/**
 * Enhanced field validation hook using orval-generated schemas
 */
export function useFieldValidationEnhanced(eventId: string, fieldPath: string, value: any) {
  const { event } = useEventValidationEnhanced({ eventId });
  
  return useQuery({
    queryKey: ['field-validation-enhanced', eventId, fieldPath, value],
    queryFn: async () => {
      if (!event || !event.id || !event.eventType) {
        return { isValid: true, error: null };
      }
      
      try {
        // Create test data with the field value
        const testData = { ...event };
        const pathParts = fieldPath.split('.');
        
        // Set the field value in the test data
        let current = testData;
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (!current[pathParts[i]]) {
            current[pathParts[i]] = {};
          }
          current = current[pathParts[i]];
        }
        current[pathParts[pathParts.length - 1]] = value;

        // Validate using orval-generated schemas
        hybridEventSchema.parse(testData);
        return { isValid: true, error: null };
      } catch (error: any) {
        const fieldError = error.errors?.find((err: any) => 
          err.path?.join('.') === fieldPath
        );
        return {
          isValid: false,
          error: fieldError?.message || 'Validation error'
        };
      }
    },
    enabled: !!event && !!event.id && !!event.eventType && value !== undefined,
    staleTime: 100, // Very short stale time for real-time validation
  });
}

/**
 * Enhanced section validation hook using orval-generated schemas
 */
export function useSectionValidationEnhanced(eventId: string, sectionName: string) {
  const { 
    event, 
    validateEventSection, 
    isSectionValid, 
    getSectionErrors 
  } = useEventValidationEnhanced({ eventId });
  
  const sectionValidation = useMemo(() => {
    return validateEventSection(sectionName);
  }, [validateEventSection, sectionName]);

  return {
    isValid: isSectionValid(sectionName),
    errors: getSectionErrors(sectionName),
    validation: sectionValidation,
    sectionData: (event?.sections as any)?.[sectionName] || []
  };
}
