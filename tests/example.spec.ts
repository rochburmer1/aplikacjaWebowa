import { test, expect } from '@playwright/test';

test.describe('ManageMe E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Wstrzykujemy bota przed wejściem na stronę
    await page.addInitScript(() => {
      const testUser = {
        id: 'tester-e2e-123',
        email: 'test@manageme.pl',
        imie: 'Automat',
        nazwisko: 'Testowy',
        rola: 'devops', // ZMIANA 1: Zmieniamy rolę na devops, by mógł być przypisany do zadania!
        isBlocked: false
      };
      
      // Logujemy bota
      window.localStorage.setItem('manageme_logged_user', JSON.stringify(testUser));
      // ZMIANA 2: Dodajemy go do bazy wszystkich użytkowników, żeby pojawił się na liście
      window.localStorage.setItem('manageme_users', JSON.stringify([testUser]));
    });
    
    await page.goto('http://localhost:5173'); 
  });

  test('Pełny proces: Tworzenie projektu, historyjki, zadania oraz usuwanie', async ({ page }) => {
    // ----------------------------------------------------
    // 1. TWORZENIE PROJEKTU
    // ----------------------------------------------------
    await page.fill('input[placeholder="Nazwa projektu"]', 'Projekt E2E');
    await page.fill('input[placeholder="Krótki opis"]', 'Opis projektu z testów automatycznych');
    await page.click('button:has-text("Utwórz w Cloud")');
    
    await expect(page.locator('text=Projekt E2E')).toBeVisible();
    await page.click('button:has-text("Otwórz Projekt ➡")');

    // ----------------------------------------------------
    // 2. TWORZENIE HISTORYJKI
    // ----------------------------------------------------
    await page.fill('input[placeholder="Nazwa historyjki (np. Logowanie)"]', 'Historyjka E2E');
    await page.fill('input[placeholder="Szczegółowy opis"]', 'Opis historyjki testowej');
    await page.click('button:has-text("Dodaj Historyjkę")');

    await expect(page.locator('text=Historyjka E2E')).toBeVisible();
    await page.click('button:has-text("Zarządzaj Zadaniami ➡")');

    // ----------------------------------------------------
    // 3. TWORZENIE ZADANIA
    // ----------------------------------------------------
    await page.fill('input[placeholder="Nowe zadanie"]', 'Moje super zadanie');
    await page.fill('input[placeholder="Opis zadania"]', 'Opis zadania do testów');
    await page.fill('input[type="number"]', '5'); // Czas
    await page.click('button:has-text("Dodaj Zadanie")');

    await expect(page.locator('text=Moje super zadanie')).toBeVisible();

    // ----------------------------------------------------
    // 4. SZCZEGÓŁY ZADANIA (PRZYPISANIE / ZMIANA STATUSU)
    // ----------------------------------------------------
    await page.click('button:has-text("Szczegóły ➡")');
    
    // ZMIANA 3: Wybieramy zmienioną nazwę z listy
    await page.locator('select').selectOption({ label: 'Automat Testowy (devops)' });
    
    // Sprawdzenie czy pojawił się przycisk "Zakończ"
    await expect(page.locator('button:has-text("Oznacz jako Done")')).toBeVisible();
    await page.click('button:has-text("Oznacz jako Done")');
    
    // await page.click('button:has-text("⬅ Wróć do tablicy zadań")');

    // ----------------------------------------------------
    // 5. USUWANIE ZADANIA
    // ----------------------------------------------------
    await page.click('button:has-text("Usuń")');
    
    await expect(page.locator('text=Moje super zadanie')).not.toBeVisible();
  });
});