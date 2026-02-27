# AI Agent Debug Guide

This document describes how to debug and test the UI as an AI agent.

## Available Commands

### Development
```bash
npm run dev          # Start development server
npm run dev:debug    # Start with debug mode
npm run dev:inspect  # Start with inspect mode
```

### Testing
```bash
npm run test         # Run unit tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage

npm run test:e2e        # Run e2e tests
npm run test:e2e:ui    # Run e2e tests with UI
```

### Linting & Type Checking
```bash
npm run typecheck      # Check types
npm run lint           # Run linting
npm run lint:fix       # Fix linting issues
```

## Debug Workflow

### 1. Unit Testing
```bash
# Run specific test file
npm run test -- src/ui/components/Button/Button.test.tsx

# Run tests in watch mode
npm run test

# Run tests with coverage
npm run test:coverage
```

### 2. E2E Testing
```bash
# Start dev server and run tests
npm run test:e2e

# Open Playwright UI for interactive testing
npm run test:e2e:ui
```

### 3. Component Development
Use `npm run dev:debug` to get better error messages and hot module replacement.

## Common Issues

### Test fails with "element not found"
- Check if the component is rendering correctly
- Use `screen.debug()` to print HTML
- Use `await page.waitForSelector()` in e2e

### Type errors
- Run `npm run typecheck` to see all errors
- Check import paths
- Verify prop types match

### CSS not applying
- Check if Tailwind is configured
- Verify class names are correct
- Check if CSS is imported

## Testing Best Practices

1. **Use semantic queries**: `getByRole`, `getByLabel`, `getByText`
2. **Avoid testid**: Only use when necessary
3. **Test user behavior**: Not implementation details
4. **Isolate tests**: Each test should be independent
5. **Mock external dependencies**: API calls, WebSocket, etc.

## Example Test

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

test('Button handles click', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  await userEvent.click(screen.getByRole('button'));
  
  expect(handleClick).toHaveBeenCalled();
});
```

## Playwright for E2E

```typescript
import { test, expect } from '@playwright/test';

test('User can login', async ({ page }) => {
  await page.goto('/');
  
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign In' }).click();
  
  await expect(page.getByText('Welcome')).toBeVisible();
});
```
