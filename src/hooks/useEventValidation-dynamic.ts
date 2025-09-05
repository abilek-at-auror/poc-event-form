import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  useGetEventsEventId,
  useGetEventTypesEventTypeConfig
} from '../generated/events/eventFormsAPI';
import { 
  validateEventDynamic, 
  validateSectionDynamic, 
  getValidationSummaryDynamic,
  type ValidationResult 
} from '../lib/validation-dynamic';

interface UseEventValidationDynamicOptions {
  eventId: string;
  enabled?: boolean;
}

/**
 * Enhanced event validation hook that uses dynamic SectionConfig rules from the API
 * instead of hardcoded validation rules
 */
export function useEventValidationDynamic({ 
  eventId, 
  enabled = true 
}: UseEventValidationDynamicOptions) {
  // Get the current event data
  const { data: event, isLoading, error: fetchError } = useGetEventsEventId(eventId, {
    query: {
      enabled: enabled && !!eventId
    }
  });

  // Get the event type configuration with SectionConfig rules
  const { data: eventTypeConfig, isLoading: configLoading } = useGetEventTypesEventTypeConfig(
    event?.eventType || '', 
    {
      query: {
        enabled: !!event?.eventType
      }
    }
  );

  // Memoized validation using dynamic rules from SectionConfig
  const validationResult = useMemo(() => {
    if (!event || !event.id || !event.eventType) return null;
    return validateEventDynamic(event, eventTypeConfig);
  }, [event, eventTypeConfig]);

  // Memoized validation summary for UI using dynamic rules
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
      return getValidationSummaryDynamic(event, eventTypeConfig);
    } catch (error) {
      console.error('Error generating validation summary:', error, event);
      return {
        overallValid: false,
        canPublish: false,
        totalErrors: 1,
        sectionSummaries: {}
      };
    }
  }, [event, eventTypeConfig]);

  // Section-specific validation using dynamic rules
  const validateEventSection = useMemo(() => {
    return (sectionName: string) => {
      if (!event || !event.sections || !event.eventType) return null;
      const sectionData = (event.sections as any)[sectionName] || [];
      return validateSectionDynamic(sectionName, sectionData, eventTypeConfig);
    };
  }, [event, eventTypeConfig]);

  // Check if specific section is valid using dynamic rules
  const isSectionValid = useMemo(() => {
    return (sectionName: string) => {
      const sectionValidation = validateEventSection(sectionName);
      return sectionValidation?.isValid ?? false;
    };
  }, [validateEventSection]);

  // Get errors for a specific section using dynamic rules
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

  // Debug logging
  console.log('Dynamic Validation Debug:', {
    event: !!event,
    eventType: event?.eventType,
    eventTypeConfig: !!eventTypeConfig,
    configSections: eventTypeConfig?.sections?.length || 0,
    sectionConfigs: eventTypeConfig?.sections?.map(s => ({
      sectionId: s.sectionId,
      required: s.required,
      minimumEntries: s.minimumEntries,
      displayName: s.displayName
    })) || [],
    validationResult: validationResult ? {
      isValid: validationResult.isValid,
      canPublish: validationResult.canPublish,
      errorCount: Object.keys(validationResult.errors).length,
      sectionErrors: validationResult.sectionErrors
    } : null
  });

  return {
    // Data
    event,
    eventTypeConfig,
    isLoading: isLoading || configLoading,
    fetchError,
    
    // Validation results using dynamic SectionConfig rules
    validationResult,
    validationSummary,
    
    // Status checks
    isValid: validationResult?.isValid ?? false,
    canPublish,
    
    // Error information
    allErrors,
    totalErrors: allErrors.length,
    
    // Section-specific utilities using dynamic rules
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

/**
 * Enhanced section validation hook using dynamic SectionConfig rules
 */
export function useSectionValidationDynamic(eventId: string, sectionName: string) {
  const { 
    event, 
    eventTypeConfig,
    validateEventSection, 
    isSectionValid, 
    getSectionErrors 
  } = useEventValidationDynamic({ eventId });
  
  const sectionValidation = useMemo(() => {
    return validateEventSection(sectionName);
  }, [validateEventSection, sectionName]);

  // Get section config for this specific section
  const sectionConfig = useMemo(() => {
    return eventTypeConfig?.sections?.find(
      section => section.sectionId === sectionName
    );
  }, [eventTypeConfig, sectionName]);

  return {
    isValid: isSectionValid(sectionName),
    errors: getSectionErrors(sectionName),
    validation: sectionValidation,
    sectionData: (event?.sections as any)?.[sectionName] || [],
    sectionConfig, // Expose the section config for UI customization
    isRequired: sectionConfig?.required ?? false,
    minimumEntries: sectionConfig?.minimumEntries ?? 0,
    displayName: sectionConfig?.displayName ?? sectionName
  };
}
