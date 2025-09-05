/* eslint-disable @typescript-eslint/no-explicit-any */
import { setupWorker } from 'msw/browser';
import {
  getGetEventTypesEventTypeConfigMockHandler,
  getPostEventsMockHandler,
  getGetEventsEventIdMockHandler,
  getPatchEventsEventIdMockHandler,
  getPostEventsEventIdPublishMockHandler,
  getPostEventsEventIdValidateMockHandler,
  // Section-specific handlers
  getGetEventsEventIdPersonsMockHandler,
  getPostEventsEventIdPersonsMockHandler,
  getPutEventsEventIdPersonsPersonIdMockHandler,
  getDeleteEventsEventIdPersonsPersonIdMockHandler,
  getGetEventsEventIdVehiclesMockHandler,
  getPostEventsEventIdVehiclesMockHandler,
  getPutEventsEventIdVehiclesVehicleIdMockHandler,
  getDeleteEventsEventIdVehiclesVehicleIdMockHandler,
  getGetEventsEventIdProductsMockHandler,
  getPostEventsEventIdProductsMockHandler,
  getPutEventsEventIdProductsProductIdMockHandler,
  getDeleteEventsEventIdProductsProductIdMockHandler,
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
  getPostEventsMockHandler(async (info) => {
    const body = await info.request.json() as any;
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
    const updateDataObj = updateData as any;
    const mergedData = {
      ...currentEvent,
      ...updateDataObj,
      sections: {
        ...currentEvent.sections,
        ...(updateDataObj.sections || {})
      }
    };
    
    // Update the store
    mockEventStore[eventId] = mergedData;
    
    console.log('🔄 PATCH Event Mock - Returning merged data:', mergedData);
    return mergedData;
  }),
  getPostEventsEventIdPublishMockHandler(),
  getPostEventsEventIdValidateMockHandler(),

  // Section-specific handlers with persistence
  // Persons endpoints
  getGetEventsEventIdPersonsMockHandler((info) => {
    const eventId = info.params.eventId as string;
    const persons = mockSectionStore.persons[eventId] || [];
    console.log('🔍 GET Persons Mock - Returning:', persons);
    return persons;
  }),

  getPostEventsEventIdPersonsMockHandler(async (info) => {
    const eventId = info.params.eventId as string;
    const personData = await info.request.json() as any;
    const newPerson = {
      id: `person-${Date.now()}`,
      ...personData
    };
    
    if (!mockSectionStore.persons[eventId]) {
      mockSectionStore.persons[eventId] = [];
    }
    mockSectionStore.persons[eventId].push(newPerson);
    
    console.log('✅ POST Person Mock - Added:', newPerson);
    return newPerson;
  }),

  getPutEventsEventIdPersonsPersonIdMockHandler(async (info) => {
    const eventId = info.params.eventId as string;
    const personId = info.params.personId as string;
    const updateData = await info.request.json() as any;
    
    if (!mockSectionStore.persons[eventId]) {
      mockSectionStore.persons[eventId] = [];
    }
    
    const personIndex = mockSectionStore.persons[eventId].findIndex(p => p.id === personId);
    if (personIndex >= 0) {
      mockSectionStore.persons[eventId][personIndex] = {
        ...mockSectionStore.persons[eventId][personIndex],
        ...updateData
      };
      console.log('🔄 PUT Person Mock - Updated:', mockSectionStore.persons[eventId][personIndex]);
      return mockSectionStore.persons[eventId][personIndex];
    }
    
    return null;
  }),

  getDeleteEventsEventIdPersonsPersonIdMockHandler((info) => {
    const eventId = info.params.eventId as string;
    const personId = info.params.personId as string;
    
    if (mockSectionStore.persons[eventId]) {
      mockSectionStore.persons[eventId] = mockSectionStore.persons[eventId].filter(p => p.id !== personId);
      console.log('🗑️ DELETE Person Mock - Removed person:', personId);
    }
    
    return null;
  }),

  // Vehicles endpoints
  getGetEventsEventIdVehiclesMockHandler((info) => {
    const eventId = info.params.eventId as string;
    const vehicles = mockSectionStore.vehicles[eventId] || [];
    console.log('🔍 GET Vehicles Mock - Returning:', vehicles);
    return vehicles;
  }),

  getPostEventsEventIdVehiclesMockHandler(async (info) => {
    const eventId = info.params.eventId as string;
    const vehicleData = await info.request.json() as any;
    const newVehicle = {
      id: `vehicle-${Date.now()}`,
      ...vehicleData
    };
    
    if (!mockSectionStore.vehicles[eventId]) {
      mockSectionStore.vehicles[eventId] = [];
    }
    mockSectionStore.vehicles[eventId].push(newVehicle);
    
    console.log('✅ POST Vehicle Mock - Added:', newVehicle);
    return newVehicle;
  }),

  getPutEventsEventIdVehiclesVehicleIdMockHandler(async (info) => {
    const eventId = info.params.eventId as string;
    const vehicleId = info.params.vehicleId as string;
    const updateData = await info.request.json() as any;
    
    if (!mockSectionStore.vehicles[eventId]) {
      mockSectionStore.vehicles[eventId] = [];
    }
    
    const vehicleIndex = mockSectionStore.vehicles[eventId].findIndex(v => v.id === vehicleId);
    if (vehicleIndex >= 0) {
      mockSectionStore.vehicles[eventId][vehicleIndex] = {
        ...mockSectionStore.vehicles[eventId][vehicleIndex],
        ...updateData
      };
      console.log('🔄 PUT Vehicle Mock - Updated:', mockSectionStore.vehicles[eventId][vehicleIndex]);
      return mockSectionStore.vehicles[eventId][vehicleIndex];
    }
    
    return null;
  }),

  getDeleteEventsEventIdVehiclesVehicleIdMockHandler((info) => {
    const eventId = info.params.eventId as string;
    const vehicleId = info.params.vehicleId as string;
    
    if (mockSectionStore.vehicles[eventId]) {
      mockSectionStore.vehicles[eventId] = mockSectionStore.vehicles[eventId].filter(v => v.id !== vehicleId);
      console.log('🗑️ DELETE Vehicle Mock - Removed vehicle:', vehicleId);
    }
    
    return null;
  }),

  // Products endpoints
  getGetEventsEventIdProductsMockHandler((info) => {
    const eventId = info.params.eventId as string;
    const products = mockSectionStore.products[eventId] || [];
    console.log('🔍 GET Products Mock - Returning:', products);
    return products;
  }),

  getPostEventsEventIdProductsMockHandler(async (info) => {
    const eventId = info.params.eventId as string;
    const productData = await info.request.json() as any;
    const newProduct = {
      id: `product-${Date.now()}`,
      ...productData
    };
    
    if (!mockSectionStore.products[eventId]) {
      mockSectionStore.products[eventId] = [];
    }
    mockSectionStore.products[eventId].push(newProduct);
    
    console.log('✅ POST Product Mock - Added:', newProduct);
    return newProduct;
  }),

  getPutEventsEventIdProductsProductIdMockHandler(async (info) => {
    const eventId = info.params.eventId as string;
    const productId = info.params.productId as string;
    const updateData = await info.request.json() as any;
    
    if (!mockSectionStore.products[eventId]) {
      mockSectionStore.products[eventId] = [];
    }
    
    const productIndex = mockSectionStore.products[eventId].findIndex(p => p.id === productId);
    if (productIndex >= 0) {
      mockSectionStore.products[eventId][productIndex] = {
        ...mockSectionStore.products[eventId][productIndex],
        ...updateData
      };
      console.log('🔄 PUT Product Mock - Updated:', mockSectionStore.products[eventId][productIndex]);
      return mockSectionStore.products[eventId][productIndex];
    }
    
    return null;
  }),

  getDeleteEventsEventIdProductsProductIdMockHandler((info) => {
    const eventId = info.params.eventId as string;
    const productId = info.params.productId as string;
    
    if (mockSectionStore.products[eventId]) {
      mockSectionStore.products[eventId] = mockSectionStore.products[eventId].filter(p => p.id !== productId);
      console.log('🗑️ DELETE Product Mock - Removed product:', productId);
    }
    
    return null;
  }),
];

// Simple in-memory store for mock data persistence
const mockEventStore: Record<string, any> = {};

// Section-specific stores for REST endpoints
const mockSectionStore = {
  persons: {} as Record<string, any[]>,
  vehicles: {} as Record<string, any[]>,
  products: {} as Record<string, any[]>,
};

console.log('🔧 Setting up MSW worker with', handlers.length, 'generated handlers');

export const worker = setupWorker(...handlers);
