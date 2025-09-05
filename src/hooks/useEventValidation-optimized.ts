import { useMemo } from 'react';
import { 
  useGetEventsEventId,
  useGetEventTypesEventTypeConfig,
  useGetEventsEventIdPersons,
  useGetEventsEventIdProducts,
  useGetEventsEventIdVehicles
} from '../generated/events/eventFormsAPI';
import { 
  validateEventDynamic, 
  validateSectionDynamic, 
  getValidationSummaryDynamic
} from '../lib/validation-dynamic';

interface UseEventValidationOptimizedOptions {
  eventId: string;
  enabled?: boolean;
}

/**
 * Optimized event validation that fetches section data directly from APIs
 * instead of relying on event.sections data
 */
export function useEventValidationOptimized({ 
  eventId, 
  enabled = true 
}: UseEventValidationOptimizedOptions) {
  // Get the current event data (metadata only, no sections)
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

  // Fetch section data directly from APIs
  const { data: persons = [] } = useGetEventsEventIdPersons(eventId, {
    query: { enabled: !!eventId }
  });
  
  const { data: products = [] } = useGetEventsEventIdProducts(eventId, {
    query: { enabled: !!eventId }
  });
  
  const { data: vehicles = [] } = useGetEventsEventIdVehicles(eventId, {
    query: { enabled: !!eventId }
  });

  // Construct virtual event object with sections for validation
  const eventWithSections = useMemo(() => {
    if (!event) return null;
    
    return {
      ...event,
      sections: {
        persons,
        products, 
        vehicles,
        evidence: [] // Evidence API not yet implemented
      }
    };
  }, [event, persons, products, vehicles]);

  // Memoized validation using dynamic rules from SectionConfig
  const validationResult = useMemo(() => {
    if (!eventWithSections || !eventWithSections.id || !eventWithSections.eventType) return null;
    return validateEventDynamic(eventWithSections, eventTypeConfig);
  }, [eventWithSections, eventTypeConfig]);

  // Memoized validation summary for UI using dynamic rules
  const validationSummary = useMemo(() => {
    if (!eventWithSections || !eventWithSections.id || !eventWithSections.eventType) {
      return {
        overallValid: false,
        canPublish: false,
        totalErrors: 1,
        sectionSummaries: {}
      };
    }
    
    try {
      return getValidationSummaryDynamic(eventWithSections, eventTypeConfig);
    } catch (error) {
      console.error('Error generating validation summary:', error, eventWithSections);
      return {
        overallValid: false,
        canPublish: false,
        totalErrors: 1,
        sectionSummaries: {}
      };
    }
  }, [eventWithSections, eventTypeConfig]);

  // Section-specific validation using dynamic rules
  const validateEventSection = useMemo(() => {
    return (sectionName: string) => {
      if (!eventWithSections || !eventWithSections.sections || !eventWithSections.eventType) return null;
      const sectionData = (eventWithSections.sections as any)[sectionName] || [];
      return validateSectionDynamic(sectionName, sectionData, eventTypeConfig);
    };
  }, [eventWithSections, eventTypeConfig]);

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
  console.log('Optimized Validation Debug:', {
    event: !!event,
    eventType: event?.eventType,
    eventTypeConfig: !!eventTypeConfig,
    sectionsData: {
      persons: persons.length,
      products: products.length,
      vehicles: vehicles.length
    },
    configSections: eventTypeConfig?.sections?.map(s => ({
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
    // Data (no sections in main event object)
    event,
    eventTypeConfig,
    isLoading: isLoading || configLoading,
    fetchError,
    
    // Section data (fetched directly)
    sectionsData: {
      persons,
      products,
      vehicles,
      evidence: [] // Evidence API not yet implemented
    },
    
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
      // when the section data changes
    }
  };
}

/**
 * Optimized section validation hook using direct API calls
 */
export function useSectionValidationOptimized(eventId: string, sectionName: string) {
  const { 
    eventTypeConfig,
    sectionsData,
    validateEventSection, 
    isSectionValid, 
    getSectionErrors 
  } = useEventValidationOptimized({ eventId });
  
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
    sectionData: (sectionsData as any)?.[sectionName] || [],
    sectionConfig, // Expose the section config for UI customization
    isRequired: sectionConfig?.required ?? false,
    minimumEntries: sectionConfig?.minimumEntries ?? 0,
    displayName: sectionConfig?.displayName ?? sectionName
  };
}
