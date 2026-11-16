const { test, expect } = require('@playwright/test');

test('customer: search, hours persist, login, reserve, request collection and logout', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Tu próxima lavadora').fill('18');
  await page.getByRole('button', { name: 'Encontrar lavadora' }).click();
  await expect(page.getByRole('heading', { name: 'Lavadora de prueba 18 kg' })).toBeVisible();
  await page.getByRole('button', { name: 'Elegir lavadora' }).click();
  await page.getByRole('link', { name: 'Revisar reserva' }).click();
  await page.getByLabel('Horas de alquiler').fill('6');
  await page.reload();
  await expect(page.getByLabel('Horas de alquiler')).toHaveValue('6');
  await page.getByLabel('Dirección de entrega en Itagüí').fill('Calle 12 #34-56, Itagüí');
  await page.getByRole('button', { name: 'Iniciar sesión para reservar' }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill('cliente@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-segura-2026');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();
  await expect(page.getByText('El pago en efectivo está pendiente', { exact: false })).toBeVisible();
  await expect(page.getByText('Pago: Pendiente')).toBeVisible();
  await page.getByRole('button', { name: 'Solicitar recolección' }).click();
  await expect(page.getByText('Recoleccion solicitada', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await page.goto('/usuarios');
  await expect(page).toHaveURL(/login/);
});

test('theme persists, mobile menu works and pages do not overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(236, 242, 255)');
  await expect(page.getByRole('button', { name: 'Encontrar lavadora' })).toHaveCSS('border-radius', '12px');
  await page.getByRole('button', { name: 'Activar modo claro' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(24, 38, 64)');
  await page.getByRole('button', { name: 'Menú', exact: true }).click();
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Lavadoras', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Encuentra tu lavadora.' })).toBeVisible();
  for (const path of ['/', '/productos', '/compras', '/login']) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('API failure is visible; invented catalog is never shown', async ({ page }) => {
  await page.route('**/api/lavadoras', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ mensaje: 'Catálogo temporalmente no disponible.' }) }));
  await page.goto('/productos');
  await expect(page.getByRole('alert')).toContainText('Catálogo temporalmente no disponible.');
  await expect(page.getByRole('button', { name: 'Volver a intentar' })).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(0);
});
