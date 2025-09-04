# Orval + Zod Integration Summary

## What We Accomplished

✅ **Enhanced OpenAPI Specification** (`specs/events-api.yaml`)
- Added proper validation constraints (required fields, min/max values, minLength)
- Fixed missing `PersonInvolvedRole` reference
- Created discriminated union schemas for different event types:
  - `ShopliftingEvent` - requires persons + products
  - `AccidentEvent` - requires persons only  
  - `VandalismEvent` - requires evidence only
- Added `BaseEvent` schema with proper validation rules
- Enhanced all entity schemas with validation constraints

✅ **Updated Orval Configuration** (`orval.config.ts`)
- Added dual generation: TypeScript interfaces + Zod schemas
- `events-api`: Generates TypeScript interfaces and React Query hooks (existing)
- `events-api-zod`: Generates Zod validation schemas (new)

✅ **Generated Zod Schemas** (`src/generated/zod-schemas.ts`)
- Auto-generated from OpenAPI spec using `orval`
- Includes all validation constraints from the spec
- Provides type-safe validation schemas for all entities

✅ **Hybrid Validation Approach** (`src/lib/validation-with-orval.ts`)
- Combines orval-generated Zod schemas with custom validation logic
- Creates proper discriminated union using `z.discriminatedUnion`
- Maintains existing validation functions and business logic
- Provides seamless migration path from manual schemas

## Key Benefits

### 1. **Single Source of Truth**
Your OpenAPI spec now defines both API contracts AND validation rules. Changes to the spec automatically update validation schemas.

### 2. **Reduced Maintenance**
No need to manually sync validation schemas with API changes. Orval handles the generation automatically.

### 3. **Type Safety**
Generated Zod schemas provide runtime validation that matches your TypeScript types exactly.

### 4. **Backward Compatibility**
The hybrid approach allows gradual migration from your existing validation logic.

## Generated Schemas Overview

```typescript
// Base schemas (auto-generated)
export const generatedPersonSchema = getEventsEventIdPersonsResponseItem;
export const generatedVehicleSchema = getEventsEventIdVehiclesResponseItem;
export const generatedProductSchema = getEventsEventIdProductsResponseItem;

// Discriminated union (hybrid approach)
export const hybridEventSchema = z.discriminatedUnion('eventType', [
  shopliftingEventSchema,  // requires persons + products (min 1 each)
  accidentEventSchema,     // requires persons (min 1)
  vandalismEventSchema     // requires evidence (min 1)
]);
```

## Usage Examples

### Basic Validation
```typescript
import { hybridEventSchema } from './lib/validation-with-orval';

try {
  const validEvent = hybridEventSchema.parse(eventData);
  console.log('Event is valid:', validEvent);
} catch (error) {
  console.error('Validation failed:', error);
}
```

### Using Validation Functions
```typescript
import { validateEventWithOrval } from './lib/validation-with-orval';

const result = validateEventWithOrval(eventData);
if (result.isValid) {
  console.log('Event is valid and can be processed');
} else {
  console.log('Validation errors:', result.errors);
}
```

## Migration Strategy

### Phase 1: Parallel Validation (Current)
- Keep existing `validation.ts` for production
- Use `validation-with-orval.ts` for testing and validation
- Compare results to ensure consistency

### Phase 2: Gradual Migration
- Replace validation calls one component at a time
- Start with new features, then migrate existing ones
- Monitor for any behavioral differences

### Phase 3: Full Migration
- Replace `validation.ts` with `validation-with-orval.ts`
- Remove manual schema definitions
- Rely entirely on orval-generated schemas

## Commands

```bash
# Generate both TypeScript interfaces and Zod schemas
npm run generate

# The command now generates:
# - src/generated/events/ (TypeScript + React Query)
# - src/generated/zod-schemas.ts (Zod validation schemas)
```

## File Structure

```
src/
├── generated/
│   ├── events/                    # TypeScript interfaces & React Query hooks
│   │   ├── eventFormsAPI.schemas.ts
│   │   ├── eventFormsAPI.ts
│   │   └── eventFormsAPI.msw.ts
│   └── zod-schemas.ts            # Auto-generated Zod schemas
├── lib/
│   ├── validation.ts             # Original manual validation (keep for now)
│   └── validation-with-orval.ts  # New hybrid approach using orval
└── specs/
    └── events-api.yaml           # Enhanced OpenAPI spec with validation
```

## Next Steps

1. **Test the hybrid validation** in your components
2. **Compare validation results** between old and new approaches
3. **Update components** to use the new validation functions
4. **Add more validation constraints** to the OpenAPI spec as needed
5. **Consider adding custom error messages** to the generated schemas

## Benefits Realized

- ✅ **Automated schema generation** from OpenAPI spec
- ✅ **Proper discriminated union support** for polymorphic events
- ✅ **Type-safe validation** with runtime checks
- ✅ **Reduced code duplication** between API and validation
- ✅ **Consistent validation rules** across frontend and backend
- ✅ **Easy maintenance** - update spec, regenerate schemas

The validation schemas can now be generated by orval, providing a robust, maintainable, and type-safe validation system that stays in sync with your API specification!
