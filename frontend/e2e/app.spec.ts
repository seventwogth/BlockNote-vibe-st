import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows auth screen when not logged in', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('BlockNote')).toBeVisible();
    await expect(page.getByText('Sign In')).toBeVisible();
    await expect(page.getByText("Don't have an account?")).toBeVisible();
  });

  test('can toggle between sign in and sign up', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('Welcome Back')).toBeVisible();
    
    await page.getByText('Sign Up').click();
    
    await expect(page.getByText('Create Account')).toBeVisible();
    await expect(page.getByText('Already have an account?')).toBeVisible();
  });
});

test.describe('UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Button renders correctly', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Sign In' });
    await expect(button).toBeVisible();
    await expect(button).toHaveClass(/bg-primary/);
  });

  test('Input fields are accessible', async ({ page }) => {
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toBeVisible();
    
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toBeVisible();
  });

  test('Form validation works', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    await expect(page.getByText('Login failed')).toBeVisible();
  });
});

test.describe('Keyboard Shortcuts', () => {
  test('Cmd+K opens search modal', async ({ page, isMobile }) => {
    if (isMobile) return;
    
    await page.keyboard.press('Meta+k');
    
    await expect(page.getByPlaceholder('Type a command or search...')).toBeVisible();
  });
});
