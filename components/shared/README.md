# Shared Components

This directory contains UI components that are used across both the dashboard (coach/admin) and athlete interfaces.

## Organization

- `layout/` - Layout components (headers, sidebars, navigation)
- `forms/` - Form components and inputs
- `data/` - Data display components (tables, cards, lists)
- `feedback/` - User feedback components (toasts, modals, alerts)

## Usage

Components in this directory should be:
- Fully responsive (mobile and desktop)
- Theme-aware (support our black/white design system)
- Accessible (ARIA labels, keyboard navigation)
- Well-documented with TypeScript types

## Example
```tsx
import { Button } from '@/components/shared/Button';

export function MyComponent() {
  return <Button variant="primary">Click me</Button>;
}
```