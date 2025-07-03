const { test, expect } = require('@playwright/test');

test.describe('Интеграция с Telegram', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('file://' + process.cwd() + '/index.html');
        await page.waitForLoadState('networkidle');
    });

    test('Проверка отправки формы в Telegram', async ({ page }) => {
        let telegramRequestMade = false;
        let requestData = null;

        // Перехватываем запросы к Telegram API
        await page.route('**/api.telegram.org/**', async route => {
            telegramRequestMade = true;
            const request = route.request();
            requestData = JSON.parse(request.postData() || '{}');
            
            // Симулируем успешный ответ от Telegram
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true, result: { message_id: 123 } })
            });
        });

        // Перехватываем console.log для проверки сообщений
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push(msg.text());
        });

        // Открываем модальное окно
        await page.click('button:has-text("ПЕРЕЗВОНИТЬ МНЕ")');
        
        // Проверяем, что модальное окно открылось
        const modal = page.locator('#callbackModal');
        await expect(modal).toBeVisible();
        
        // Заполняем форму
        await page.fill('#clientName', 'Тест Телеграм');
        await page.fill('#clientPhone', '9001234567');
        
        // Отправляем форму
        await page.click('button[type="submit"]');
        
        // Ждем немного для выполнения асинхронного запроса
        await page.waitForTimeout(1000);
        
        // Проверяем, что запрос к Telegram был отправлен
        expect(telegramRequestMade).toBe(true);
        
        // Проверяем содержимое отправленного сообщения
        expect(requestData).toBeTruthy();
        expect(requestData.chat_id).toBe('352283464');
        expect(requestData.text).toContain('НОВАЯ ЗАЯВКА НА ЭВАКУАТОР');
        expect(requestData.text).toContain('Тест Телеграм');
        expect(requestData.text).toContain('+7 (900) 123-45-67');
        
        // Проверяем сообщение в консоли об успешной отправке
        const successMessage = consoleMessages.find(msg => 
            msg.includes('✅ Заявка успешно отправлена в Telegram')
        );
        expect(successMessage).toBeTruthy();
    });

    test('Проверка обработки ошибки Telegram API', async ({ page }) => {
        let telegramRequestMade = false;

        // Симулируем ошибку от Telegram API
        await page.route('**/api.telegram.org/**', async route => {
            telegramRequestMade = true;
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request' })
            });
        });

        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push(msg.text());
        });

        // Открываем модальное окно и заполняем форму
        await page.click('button:has-text("ПЕРЕЗВОНИТЬ МНЕ")');
        await page.fill('#clientName', 'Тест Ошибка');
        await page.fill('#clientPhone', '9001234567');
        await page.click('button[type="submit"]');
        
        await page.waitForTimeout(1000);
        
        // Проверяем, что запрос был отправлен
        expect(telegramRequestMade).toBe(true);
        
        // Проверяем сообщение об ошибке в консоли
        const errorMessage = consoleMessages.find(msg => 
            msg.includes('❌ Ошибка отправки в Telegram')
        );
        expect(errorMessage).toBeTruthy();
    });

    test('Проверка формата сообщения Telegram', async ({ page }) => {
        let requestData = null;

        await page.route('**/api.telegram.org/**', async route => {
            const request = route.request();
            requestData = JSON.parse(request.postData() || '{}');
            
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true, result: { message_id: 123 } })
            });
        });

        // Заполняем и отправляем форму
        await page.click('button:has-text("ПЕРЕЗВОНИТЬ МНЕ")');
        await page.fill('#clientName', 'Иван Иванов');
        await page.fill('#clientPhone', '9051234567');
        await page.click('button[type="submit"]');
        
        await page.waitForTimeout(1000);
        
        // Проверяем структуру сообщения
        expect(requestData.text).toMatch(/🚛 НОВАЯ ЗАЯВКА НА ЭВАКУАТОР/);
        expect(requestData.text).toMatch(/👤 Имя: Иван Иванов/);
        expect(requestData.text).toMatch(/📱 Телефон: \+7 \(905\) 123-45-67/);
        expect(requestData.text).toMatch(/🕐 Время: \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/);
        expect(requestData.text).toMatch(/⚡ Перезвоните клиенту срочно!/);
        
        // Проверяем правильный Chat ID
        expect(requestData.chat_id).toBe('352283464');
    });

    test('Проверка работы без сети', async ({ page }) => {
        // Симулируем отсутствие сети
        await page.route('**/api.telegram.org/**', async route => {
            await route.abort('connectionfailed');
        });

        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push(msg.text());
        });

        await page.click('button:has-text("ПЕРЕЗВОНИТЬ МНЕ")');
        await page.fill('#clientName', 'Тест Сеть');
        await page.fill('#clientPhone', '9001234567');
        await page.click('button[type="submit"]');
        
        await page.waitForTimeout(1000);
        
        // Проверяем, что ошибка сети обработана
        const errorMessage = consoleMessages.find(msg => 
            msg.includes('❌ Ошибка при отправке в Telegram')
        );
        expect(errorMessage).toBeTruthy();
    });
}); 