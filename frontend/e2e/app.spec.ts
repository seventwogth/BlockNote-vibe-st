import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows auth screen when not logged in', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('BlockNote')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByText("Don't have an account?")).toBeVisible();
  });

  test('can toggle between sign in and sign up', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('Welcome Back')).toBeVisible();
    
    await page.getByRole('link', { name: 'Sign Up' }).click();
    
    await expect(page.getByText('Create Account')).toBeVisible();
    await expect(page.getByText('Already have an account?')).toBeVisible();
  });

  test('shows validation errors for empty form', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/login failed|invalid|error/i)).toBeVisible();
  });

  test('email input accepts valid email format', async ({ page }) => {
    await page.goto('/');
    
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('test@example.com');
    
    await expect(emailInput).toHaveValue('test@example.com');
  });
});

test.describe('UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Button renders correctly', async ({ page }) => {
    const button = page.getByRole('button', { name: /sign in/i });
    await expect(button).toBeVisible();
  });

  test('Input fields are accessible', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();
  });

  test('password input has correct type', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

test.describe('Keyboard Shortcuts', () => {
  test('Cmd+K opens search modal when logged in', async ({ page, isMobile }) => {
    if (isMobile) return;
    
    await page.goto('/');
    
    await page.keyboard.press('Meta+k');
    
    await expect(page.getByPlaceholder(/type a command or search/i)).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('page is responsive', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    await expect(page.getByText('BlockNote')).toBeVisible();
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.getByText('BlockNote')).toBeVisible();
  });
});
