import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGetEventsEventId } from '../generated/events/eventFormsAPI';
import { 
  validateEvent, 
  validateSection, 
  getValidationSummary
} from '../lib/validation';

interface UseEventValidationOptions {
  eventId: string;
  enabled?: boolean;
}

export function useEventValidation({ eventId, enabled = true }: UseEventValidationOptions) {
  // Get the current event data
  const { data: event, isLoading } = useGetEventsEventId(eventId, {
    query: {
      enabled: enabled && !!eventId
    }
  });

  // Memoized validation results
  const validationResult = useMemo(() => {
    if (!event || !event.id || !event.eventType) return null;
    return validateEvent(event);
  }, [event]);

  // Memoized validation summary for UI
  const validationSummary = useMemo(() => {
    if (!event || !event.id || !event.eventType) {
      console.log('Event validation check failed:', { event: !!event, id: event?.id, eventType: event?.eventType });
      return null;
    }
    try {
      console.log('Event structure for validation:', event);
      const summary = getValidationSummary(event);
      console.log('Validation summary generated:', summary);
      return summary;
    } catch (error) {
      console.error('Error generating validation summary:', error, event);
      return null;
    }
  }, [event]);

  // Section-specific validation
  const validateEventSection = useMemo(() => {
    return (sectionName: string) => {
      if (!event || !event.sections) return null;
      const sections = event.sections as Record<string, unknown[]>;
      const sectionData = sections[sectionName] || [];
      return validateSection(sectionName, sectionData, event.eventType);
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

  return {
    // Data
    event,
    isLoading,
    
    // Validation results
    validationResult,
    validationSummary,
    
    // Status checks
    isValid: validationResult?.isValid ?? false,
    canPublish,
    
    // Error information
    allErrors,
    totalErrors: allErrors.length,
    
    // Section-specific utilities
    validateEventSection,
    isSectionValid,
    getSectionErrors,
    
    // Field-specific utilities
    getFieldError,
    
    // Validation utilities
    revalidate: () => {
      // This will be handled automatically by the query refetch
      // when the event data changes
    }
  };
}

// Hook for real-time field validation
export function useFieldValidation(eventId: string, fieldPath: string, value: unknown) {
  const { event } = useEventValidation({ eventId });
  
  return useQuery({
    queryKey: ['field-validation', eventId, fieldPath, value],
    queryFn: async () => {
      if (!event || !event.id || !event.eventType) {
        return { isValid: true, error: null };
      }
      
      // Import validateField dynamically to avoid circular dependencies
      const { validateField } = await import('../lib/validation');
      return validateField(fieldPath, value, event);
    },
    enabled: !!event && !!event.id && !!event.eventType && value !== undefined,
    staleTime: 100, // Very short stale time for real-time validation
  });
}

// Hook for section validation with real-time updates
export function useSectionValidation(eventId: string, sectionName: string) {
  const { event, validateEventSection, isSectionValid, getSectionErrors } = useEventValidation({ eventId });
  
  const sectionValidation = useMemo(() => {
    return validateEventSection(sectionName);
  }, [validateEventSection, sectionName]);

  return {
    isValid: isSectionValid(sectionName),
    errors: getSectionErrors(sectionName),
    validation: sectionValidation,
    sectionData: (event?.sections as Record<string, unknown[]> | undefined)?.[sectionName] || []
  };
}
