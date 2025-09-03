# Event Forms Demo - Modern React 18 with Vite

A comprehensive React TypeScript demo application showcasing complex event forms with dynamic sections, atomic field updates, and real-time validation.

## 🚀 Features

- **Dynamic Form Sections**: Different event types show different form configurations
- **Atomic Field Updates**: Each field saves automatically with optimistic updates
- **Real-time Validation**: Instant feedback with visual indicators
- **Draft/Publish Workflow**: Save incomplete forms as drafts, validate before publishing
- **Mock Backend**: MSW provides realistic API responses during development

## 🛠 Modern Tech Stack

- **React 18** + TypeScript
- **Vite** for fast development and building
- **TanStack Query v5** for state management and caching
- **Native Fetch API** (no axios dependency)
- **Orval** for OpenAPI code generation
- **MSW v2** for API mocking
- **Tailwind CSS** for styling
- **Auror Lumos** component library

## 🏃‍♂️ Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate API client and start development server**:
   ```bash
   npm run dev:generate
   ```
   Or separately:
   ```bash
   npm run generate  # Generate API client from OpenAPI spec
   npm run dev       # Start Vite dev server
   ```

3. **Open your browser** to `http://localhost:5173`

## 🎯 Demo Workflow

1. Select an event type to see dynamic form configuration
2. Fill out the event details - each field saves automatically
3. Add/remove dynamic items (persons, products, vehicles)
4. Watch real-time validation feedback
5. Publish when all validation passes

## 📋 Event Types

- **Shoplifting**: Requires persons and products sections
- **Accident**: Requires persons, optional vehicles section
- **Vandalism**: Optional persons, requires evidence section

## 🏗 Architecture

### Native Fetch API Client
- Modern fetch-based HTTP client with TypeScript support
- Automatic JSON handling and error management
- AbortSignal support for request cancellation
- Optimistic updates with TanStack Query

### Dynamic Form Sections
Form sections are conditionally rendered based on event type configuration:
- Fetched from `/event-types/{type}/config`
- Sections can be required or optional
- Minimum entry requirements enforced

### State Management
- TanStack Query v5 handles all server state
- Optimistic updates for immediate UI feedback
- Automatic cache invalidation and refetching
- Built-in loading and error states

## 📁 Project Structure

```
src/
├── components/
│   ├── EventForm.tsx           # Main form component
│   └── EventFormDemo.tsx       # Demo wrapper
├── generated/
│   └── events/                 # Orval generated API client
├── hooks/
│   └── useAtomicField.ts       # Atomic field updates
├── lib/
│   └── api-client.ts           # Native fetch client
├── mocks/
│   ├── handlers.ts             # MSW request handlers
│   └── browser.ts              # MSW browser setup
└── specs/
    └── events-api.yaml         # OpenAPI specification
```

## 🔧 API Endpoints

- `GET /event-types/{type}/config` - Get form configuration
- `POST /events` - Create new event (draft)
- `GET /events/{id}` - Fetch event data
- `PATCH /events/{id}` - Atomic field updates
- `POST /events/{id}/validate` - Validate event
- `POST /events/{id}/publish` - Publish event

## 💡 Key Concepts Demonstrated

1. **OpenAPI-First Development**: Schema drives both client and mock generation
2. **Optimistic Updates**: UI responds immediately while syncing with server
3. **Atomic Operations**: Individual field updates without full form submission
4. **Dynamic UI**: Form structure adapts to business rules
5. **Type Safety**: Full TypeScript coverage from API to UI
6. **Modern Tooling**: Vite, TanStack Query v5, native fetch, MSW v2

## 🚧 Current Status

- ✅ Project setup with Vite + React 18
- ✅ TanStack Query v5 integration
- ✅ OpenAPI specification and Orval code generation
- ✅ Native fetch API client
- ✅ MSW v2 mock handlers
- ✅ Basic event creation and display
- 🚧 Dynamic form sections (in progress)
- 🚧 Atomic field updates
- 🚧 Validation workflow