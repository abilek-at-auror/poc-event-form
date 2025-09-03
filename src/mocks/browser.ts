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
  
  // Other handlers with default generated responses
  getPostEventsMockHandler(),
  getGetEventsEventIdMockHandler(),
  getPatchEventsEventIdMockHandler(),
  getPostEventsEventIdPublishMockHandler(),
  getPostEventsEventIdValidateMockHandler(),
];

console.log('🔧 Setting up MSW worker with', handlers.length, 'generated handlers');

export const worker = setupWorker(...handlers);
