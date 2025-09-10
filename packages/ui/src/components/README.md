# UI Components

This directory contains all the shared UI components used across the Colanode application.

## Directory Structure

Components are organized by feature/domain:

- `accounts/` - Account-related UI components
- `app-loader.tsx` - Application loader component
- `app.tsx` - Main application component
- `avatars/` - Avatar components
- `channels/` - Channel UI components
- `chats/` - Chat UI components
- `collaborators/` - Collaborator components
- `databases/` - Database UI components
- `documents/` - Document components
- `emojis/` - Emoji components
- `files/` - File components
- `folders/` - Folder components
- `font-loader.tsx` - Font loading component
- `icons/` - Icon components
- `layouts/` - Layout components
- `messages/` - Message components
- `pages/` - Page components
- `radar-provider.tsx` - Radar provider component
- `records/` - Database record components
- `root-provider.tsx` - Root provider component
- `servers/` - Server components
- `spaces/` - Space components
- `ui/` - Generic UI components (buttons, inputs, etc.)
- `users/` - User components
- `workspaces/` - Workspace components

## Component Design Principles

### Reusability
Components are designed to be reusable across different parts of the application.

### Composability
Components are built to be composed together to create more complex UIs.

### Accessibility
All components follow accessibility best practices.

### Responsive Design
Components are designed to work on all screen sizes.

## Component Structure

Each component typically includes:

1. **Component File**: The main React component (`.tsx`)
2. **Styles**: Styled-components or CSS modules
3. **Types**: TypeScript interfaces and types
4. **Hooks**: Custom hooks specific to the component
5. **Utils**: Utility functions specific to the component

## Usage Example

```tsx
import { Button } from '@colanode/ui/components/ui/button';

function MyComponent() {
  return (
    <Button variant="primary" onClick={() => console.log('Clicked!')}>
      Click Me
    </Button>
  );
}
```

## Styling

Components use a combination of:

- Tailwind CSS for utility classes
- Styled-components for complex styling
- CSS variables for theme consistency

## State Management

Components use various state management approaches:

- Local state with `useState` and `useReducer`
- Context API for shared state
- Custom hooks for complex state logic