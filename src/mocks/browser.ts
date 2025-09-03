import { setupWorker } from 'msw/browser';
import {
  getGetEventTypesEventTypeConfigMockHandler,
  getPostEventsMockHandler,
  getGetEventsEventIdMockHandler,
  getPatchEventsEventIdMockHandler,
  getPostEventsEventIdPublishMockHandler,
  getPostEventsEventIdValidateMockHandler,
} from '../generated/events/eventFormsAPI.msw';
import { SectionConfigSectionId } from '../generated/events/eventFormsAPI.schemas';

// Create handlers with custom logic
const handlers = [
  // Event type configuration with realistic data
  getGetEventTypesEventTypeConfigMockHandler((info) => {
    const eventType = info.params.eventType as string;
    
    const configs = {
      shoplifting: {
        eventType: 'shoplifting',
        displayName: 'Shoplifting Incident',
        sections: [
          { sectionId: SectionConfigSectionId.persons, displayName: 'Persons Involved', required: true, minimumEntries: 1 },
          { sectionId: SectionConfigSectionId.products, displayName: 'Products Involved', required: true, minimumEntries: 1 },
        ],
      },
      accident: {
        eventType: 'accident',
        displayName: 'Accident Report',
        sections: [
          { sectionId: SectionConfigSectionId.persons, displayName: 'Persons Involved', required: true, minimumEntries: 1 },
          { sectionId: SectionConfigSectionId.vehicles, displayName: 'Vehicles Involved', required: false, minimumEntries: 0 },
        ],
      },
      vandalism: {
        eventType: 'vandalism',
        displayName: 'Vandalism Report',
        sections: [
          { sectionId: SectionConfigSectionId.persons, displayName: 'Persons Involved', required: false, minimumEntries: 0 },
          { sectionId: SectionConfigSectionId.evidence, displayName: 'Evidence', required: true, minimumEntries: 1 },
        ],
      },
    };
    
    return configs[eventType as keyof typeof configs] || configs.shoplifting;
  }),
  
  // Custom handlers with proper data structure
  getPostEventsMockHandler((info) => {
    const body = info.request.body as any;
    return {
      id: `event-${Date.now()}`,
      eventType: body.eventType,
      organizationId: body.organizationId,
      siteId: body.siteId,
      status: 'draft',
      metadata: {
        title: '',
        description: '',
        priority: 'medium',
        occurredAt: new Date().toISOString()
      },
      sections: {
        persons: [],
        vehicles: [],
        products: []
      },
      validation: {
        isValid: false,
        canPublish: false,
        errorCount: 0
      }
    };
  }),
  
  getGetEventsEventIdMockHandler((info) => {
    const eventId = info.params.eventId as string;
    
    // Return from store if exists, otherwise return default
    if (mockEventStore[eventId]) {
      console.log('🔍 GET Event Mock - Returning from store:', mockEventStore[eventId]);
      return mockEventStore[eventId];
    }
    
    const defaultEvent = {
      id: eventId,
      eventType: 'shoplifting', // Default for testing
      organizationId: 'org-123',
      siteId: 'site-456',
      status: 'draft',
      metadata: {
        title: '',
        description: '',
        priority: 'medium',
        occurredAt: new Date().toISOString()
      },
      sections: {
        persons: [],
        vehicles: [],
        products: []
      },
      validation: {
        isValid: false,
        canPublish: false,
        errorCount: 0
      }
    };
    
    // Store it for future requests
    mockEventStore[eventId] = defaultEvent;
    console.log('🔍 GET Event Mock - Returning default:', defaultEvent);
    return defaultEvent;
  }),
  
  // Override PATCH handler to properly merge updates (using generated mock as base)
  getPatchEventsEventIdMockHandler(async (info) => {
    const eventId = info.params.eventId as string;
    const updateData = await info.request.json();
    
    console.log('🔄 PATCH Event Mock - Received update:', updateData);
    
    // Get existing event from store or create default
    if (!mockEventStore[eventId]) {
      mockEventStore[eventId] = {
        id: eventId,
        eventType: 'shoplifting', // Default for testing
        organizationId: 'org-123',
        siteId: 'site-456',
        status: 'draft',
        metadata: {
          title: '',
          description: '',
          priority: 'medium',
          occurredAt: new Date().toISOString()
        },
        sections: {
          persons: [],
          vehicles: [],
          products: []
        },
        validation: {
          isValid: false,
          canPublish: false,
          errorCount: 0
        }
      };
    }
    
    // Merge the update data with existing data
    const currentEvent = mockEventStore[eventId];
    const mergedData = {
      ...currentEvent,
      ...updateData,
      sections: {
        ...currentEvent.sections,
        ...updateData.sections
      }
    };
    
    // Update the store
    mockEventStore[eventId] = mergedData;
    
    console.log('🔄 PATCH Event Mock - Returning merged data:', mergedData);
    return mergedData;
  }),
  getPostEventsEventIdPublishMockHandler(),
  getPostEventsEventIdValidateMockHandler(),
];

// Simple in-memory store for mock data persistence
const mockEventStore: Record<string, any> = {};

console.log('🔧 Setting up MSW worker with', handlers.length, 'generated handlers');

export const worker = setupWorker(...handlers);
