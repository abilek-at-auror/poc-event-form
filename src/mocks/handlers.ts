import { http, HttpResponse } from 'msw';
import { v4 as uuidv4 } from 'uuid';

// Mock data store
const mockEvents = new Map();
const mockEventTypes = {
  shoplifting: {
    eventType: 'shoplifting',
    displayName: 'Shoplifting Incident',
    sections: [
      { sectionId: 'persons', displayName: 'Persons Involved', required: true, minimumEntries: 1 },
      { sectionId: 'products', displayName: 'Products Involved', required: true, minimumEntries: 1 },
    ],
  },
  accident: {
    eventType: 'accident',
    displayName: 'Accident Report',
    sections: [
      { sectionId: 'persons', displayName: 'Persons Involved', required: true, minimumEntries: 1 },
      { sectionId: 'vehicles', displayName: 'Vehicles Involved', required: false, minimumEntries: 0 },
    ],
  },
  vandalism: {
    eventType: 'vandalism',
    displayName: 'Vandalism Report',
    sections: [
      { sectionId: 'persons', displayName: 'Persons Involved', required: false, minimumEntries: 0 },
      { sectionId: 'evidence', displayName: 'Evidence', required: true, minimumEntries: 1 },
    ],
  },
};

export const handlers = [
  // Get event type configuration
  http.get('http://localhost:3001/api/event-types/:eventType/config', ({ params }) => {
    const { eventType } = params;
    const config = mockEventTypes[eventType as keyof typeof mockEventTypes];
    
    if (!config) {
      return HttpResponse.json({ error: 'Event type not found' }, { status: 404 });
    }
    
    return HttpResponse.json(config);
  }),

  // Create new event
  http.post('http://localhost:3001/api/events', async ({ request }) => {
    const body = await request.json() as any;
    const eventId = uuidv4();
    
    const newEvent = {
      id: eventId,
      eventType: body.eventType,
      organizationId: body.organizationId,
      siteId: body.siteId,
      status: 'draft',
      metadata: {
        title: '',
        description: '',
        priority: 'medium',
        occurredAt: new Date().toISOString(),
      },
      sections: {
        persons: [],
        vehicles: [],
        products: [],
      },
      validation: {
        isValid: false,
        canPublish: false,
        errorCount: 0,
      },
    };
    
    mockEvents.set(eventId, newEvent);
    return HttpResponse.json(newEvent, { status: 201 });
  }),

  // Get event by ID
  http.get('http://localhost:3001/api/events/:eventId', ({ params }) => {
    const { eventId } = params;
    const event = mockEvents.get(eventId);
    
    if (!event) {
      return HttpResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    return HttpResponse.json(event);
  }),

  // Update event atomically
  http.patch('http://localhost:3001/api/events/:eventId', async ({ params, request }) => {
    const { eventId } = params;
    const updates = await request.json() as any;
    const event = mockEvents.get(eventId);
    
    if (!event) {
      return HttpResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Apply updates recursively
    const applyUpdates = (target: any, source: any) => {
      Object.keys(source).forEach(key => {
        if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          applyUpdates(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      });
    };

    applyUpdates(event, updates);
    
    // Update validation status
    event.validation = validateEvent(event);
    
    mockEvents.set(eventId, event);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return HttpResponse.json(event);
  }),

  // Validate event
  http.post('http://localhost:3001/api/events/:eventId/validate', ({ params }) => {
    const { eventId } = params;
    const event = mockEvents.get(eventId);
    
    if (!event) {
      return HttpResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    const validation = validateEvent(event);
    const issues = getValidationIssues(event);
    
    return HttpResponse.json({
      valid: validation.isValid,
      canPublish: validation.canPublish,
      issues,
    });
  }),

  // Publish event
  http.post('http://localhost:3001/api/events/:eventId/publish', ({ params }) => {
    const { eventId } = params;
    const event = mockEvents.get(eventId);
    
    if (!event) {
      return HttpResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    const validation = validateEvent(event);
    if (!validation.canPublish) {
      return HttpResponse.json({ error: 'Event validation failed' }, { status: 400 });
    }
    
    event.status = 'published';
    mockEvents.set(eventId, event);
    
    return HttpResponse.json(event);
  }),
];

// Validation logic
function validateEvent(event: any) {
  const config = mockEventTypes[event.eventType as keyof typeof mockEventTypes];
  if (!config) return { isValid: false, canPublish: false, errorCount: 1 };
  
  let errorCount = 0;
  
  // Check required metadata
  if (!event.metadata?.title?.trim()) errorCount++;
  if (!event.metadata?.description?.trim()) errorCount++;
  
  // Check required sections
  config.sections.forEach((sectionConfig: any) => {
    if (sectionConfig.required) {
      const sectionData = event.sections?.[sectionConfig.sectionId] || [];
      if (sectionData.length < sectionConfig.minimumEntries) {
        errorCount++;
      }
    }
  });
  
  return {
    isValid: errorCount === 0,
    canPublish: errorCount === 0,
    errorCount,
  };
}

function getValidationIssues(event: any) {
  const issues = [];
  const config = mockEventTypes[event.eventType as keyof typeof mockEventTypes];
  
  if (!event.metadata?.title?.trim()) {
    issues.push({
      field: 'metadata.title',
      message: 'Title is required',
      severity: 'error',
    });
  }
  
  if (!event.metadata?.description?.trim()) {
    issues.push({
      field: 'metadata.description',
      message: 'Description is required',
      severity: 'error',
    });
  }
  
  config?.sections.forEach((sectionConfig: any) => {
    if (sectionConfig.required) {
      const sectionData = event.sections?.[sectionConfig.sectionId] || [];
      if (sectionData.length < sectionConfig.minimumEntries) {
        issues.push({
          field: `sections.${sectionConfig.sectionId}`,
          message: `At least ${sectionConfig.minimumEntries} ${sectionConfig.displayName.toLowerCase()} required`,
          severity: 'error',
        });
      }
    }
  });
  
  return issues;
}
