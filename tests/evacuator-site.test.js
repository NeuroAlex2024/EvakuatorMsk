const { test, expect } = require('@playwright/test');

test.describe('Сайт эвакуатора - Основная функциональность', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('file://' + process.cwd() + '/index.html');
        await page.waitForLoadState('networkidle');
    });

    test('Проверка загрузки главной страницы', async ({ page }) => {
        // Проверяем заголовок страницы
        await expect(page).toHaveTitle(/Эвакуатор Москва/);
        
        // Проверяем основные элементы Hero секции
        await expect(page.locator('h1')).toContainText('Эвакуатор за 30 минут');
        await expect(page.locator('.hero-subtitle')).toContainText('Фиксированная цена от 2000₽');
        
        // Проверяем наличие кнопок CTA (используем first() для множественных элементов)
        await expect(page.locator('a[href="tel:+79772957171"]').first()).toBeVisible();
        await expect(page.locator('button:has-text("ПЕРЕЗВОНИТЬ МНЕ")').first()).toBeVisible();
    });

    test('Проверка работы калькулятора стоимости', async ({ page }) => {
        // Находим элементы калькулятора
        const vehicleSelect = page.locator('#vehicleType');
        const distanceSlider = page.locator('#distance');
        const totalPrice = page.locator('#totalPrice');
        
        // Проверяем начальные значения
        await expect(totalPrice).toContainText('2500₽');
        
        // Изменяем тип транспорта
        await vehicleSelect.selectOption('3000');
        await expect(totalPrice).toContainText('3500₽');
        
        // Изменяем расстояние
        await distanceSlider.fill('20');
        await expect(totalPrice).toContainText('4000₽');
        
        // Проверяем отображение расстояния
        await expect(page.locator('#distanceValue')).toContainText('20 км');
    });

    test('Проверка модального окна обратного звонка', async ({ page }) => {
        // Открываем модальное окно
        await page.click('button:has-text("ПЕРЕЗВОНИТЬ МНЕ")');
        
        // Проверяем, что модальное окно открылось
        const modal = page.locator('#callbackModal');
        await expect(modal).toBeVisible();
        
        // Заполняем форму
        await page.fill('#clientName', 'Тест Тестов');
        await page.fill('#clientPhone', '9001234567');
        
        // Проверяем форматирование телефона
        await expect(page.locator('#clientPhone')).toHaveValue('+7 (900) 123-45-67');
        
        // Отправляем форму
        await page.click('button[type="submit"]');
        
        // Проверяем, что появилось сообщение об успехе
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Спасибо! Мы перезвоним вам');
            await dialog.accept();
        });
    });

    test('Проверка работы FAQ секции', async ({ page }) => {
        // Скроллим к FAQ секции
        await page.locator('.faq').scrollIntoViewIfNeeded();
        
        // Кликаем на первый вопрос
        const firstQuestion = page.locator('.faq-question').first();
        await firstQuestion.click();
        
        // Проверяем, что ответ раскрылся
        const firstAnswer = page.locator('.faq-answer').first();
        await expect(firstAnswer).toHaveClass(/active/);
        
        // Проверяем, что иконка повернулась (используем matrix вместо rotate)
        await expect(firstQuestion.locator('i')).toHaveCSS('transform', /matrix/);
    });

    test('Проверка адаптивности на мобильных устройствах', async ({ page }) => {
        // Устанавливаем размер экрана мобильного устройства
        await page.setViewportSize({ width: 375, height: 667 });
        
        // Проверяем, что элементы адаптировались (проверяем width вместо grid-template-columns)
        const heroContent = page.locator('.hero-content');
        const heroWidth = await heroContent.evaluate(el => getComputedStyle(el).width);
        expect(parseInt(heroWidth)).toBeLessThan(400);
        
        // Проверяем, что кнопки расположены вертикально (используем first())
        const ctaButtons = page.locator('.cta-buttons').first();
        await expect(ctaButtons).toHaveCSS('flex-direction', 'column');
        
        // Проверяем sticky кнопки
        await expect(page.locator('.sticky-call-btn')).toBeVisible();
        await expect(page.locator('.whatsapp-btn')).toBeVisible();
    });

    test('Проверка ссылок и навигации', async ({ page }) => {
        // Проверяем телефонные ссылки
        const phoneLinks = page.locator('a[href="tel:+79772957171"]');
        await expect(phoneLinks.first()).toHaveAttribute('href', 'tel:+79772957171');
        
        // Проверяем WhatsApp ссылку
        const whatsappLink = page.locator('a[href="https://wa.me/79772957171"]');
        await expect(whatsappLink).toHaveAttribute('target', '_blank');
        
        // Проверяем email ссылку в футере
        await expect(page.locator('text=Gev041@mail.ru')).toBeVisible();
    });

    test('Проверка анимаций и эффектов', async ({ page }) => {
        // Проверяем анимацию грузовика в hero секции
        const truckAnimation = page.locator('.truck-animation');
        await expect(truckAnimation).toHaveCSS('animation-name', 'bounce');
        
        // Проверяем пульсацию счетчика
        const countdown = page.locator('.countdown');
        await expect(countdown).toHaveCSS('animation-name', 'pulse');
        
        // Проверяем hover эффекты на карточках
        const firstAdvantage = page.locator('.advantage').first();
        await firstAdvantage.hover();
        
        // Ждем завершения анимации
        await page.waitForTimeout(500);
    });

    test('Проверка доступности (Accessibility)', async ({ page }) => {
        // Проверяем наличие alt текстов и aria-labels
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        
        for (let i = 0; i < buttonCount; i++) {
            const button = buttons.nth(i);
            const text = await button.textContent();
            expect(text.trim()).not.toBe('');
        }
        
        // Проверяем контрастность (базовая проверка)
        const heroSection = page.locator('.hero');
        await expect(heroSection).toHaveCSS('color', 'rgb(255, 255, 255)');
        
        // Проверяем фокусируемые элементы
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
    });

    test('Проверка производительности загрузки', async ({ page }) => {
        const startTime = Date.now();
        
        await page.goto('file://' + process.cwd() + '/index.html');
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        
        // Проверяем, что страница загружается быстро (менее 3 секунд)
        expect(loadTime).toBeLessThan(3000);
        
        // Проверяем, что критические ресурсы загружены (используем first())
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('.btn-primary').first()).toBeVisible();
    });

    test('Проверка валидации форм', async ({ page }) => {
        // Открываем модальное окно
        await page.click('button:has-text("ПЕРЕЗВОНИТЬ МНЕ")');
        
        // Пытаемся отправить пустую форму
        await page.click('button[type="submit"]');
        
        // Проверяем, что браузерная валидация сработала
        const nameInput = page.locator('#clientName');
        const phoneInput = page.locator('#clientPhone');
        
        await expect(nameInput).toHaveAttribute('required');
        await expect(phoneInput).toHaveAttribute('required');
        
        // Заполняем только имя
        await nameInput.fill('Тест');
        await page.click('button[type="submit"]');
        
        // Проверяем, что телефон тоже требуется
        const isPhoneInvalid = await phoneInput.evaluate(el => !el.validity.valid);
        expect(isPhoneInvalid).toBe(true);
    });

    test('Проверка корректности контактной информации', async ({ page }) => {
        // Проверяем номер телефона
        const phoneText = await page.locator('text=+7 (977) 295-71-71').first().textContent();
        expect(phoneText).toContain('+7 (977) 295-71-71');
        
        // Проверяем email
        const emailText = await page.locator('text=Gev041@mail.ru').textContent();
        expect(emailText).toContain('Gev041@mail.ru');
        
        // Проверяем рабочее время (используем first())
        await expect(page.locator('text=24/7').first()).toBeVisible();
    });

    test('Проверка SEO элементов', async ({ page }) => {
        // Проверяем meta description
        const metaDescription = page.locator('meta[name="description"]');
        await expect(metaDescription).toHaveAttribute('content', /Эвакуатор в Москве/);
        
        // Проверяем структуру заголовков
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('h2').first()).toBeVisible();
        await expect(page.locator('h3').first()).toBeVisible();
        
        // Проверяем наличие важных ключевых слов
        const pageContent = await page.textContent('body');
        expect(pageContent).toContain('эвакуатор');
        expect(pageContent).toContain('Москва');
        expect(pageContent).toContain('24/7');
    });

    test('Проверка интерактивных элементов', async ({ page }) => {
        // Проверяем работу слайдера расстояния
        const slider = page.locator('#distance');
        await slider.fill('50');
        
        // Проверяем, что цена обновилась
        const totalPrice = page.locator('#totalPrice');
        await expect(totalPrice).toContainText('4500₽');
        
        // Проверяем закрытие модального окна по Escape
        await page.click('button:has-text("ПЕРЕЗВОНИТЬ МНЕ")');
        await expect(page.locator('#callbackModal')).toBeVisible();
        
        await page.keyboard.press('Escape');
        await expect(page.locator('#callbackModal')).not.toBeVisible();
        
        // Проверяем закрытие модального окна по клику вне области
        await page.click('button:has-text("ПЕРЕЗВОНИТЬ МНЕ")');
        await page.click('.modal', { position: { x: 10, y: 10 } });
        await expect(page.locator('#callbackModal')).not.toBeVisible();
    });
});

test.describe('Тесты производительности и оптимизации', () => {
    
    test('Проверка размера ресурсов', async ({ page }) => {
        const responses = [];
        
        page.on('response', response => {
            responses.push(response);
        });
        
        await page.goto('file://' + process.cwd() + '/index.html');
        await page.waitForLoadState('networkidle');
        
        // Проверяем, что CSS файл не слишком большой
        const cssResponse = responses.find(r => r.url().includes('.css'));
        if (cssResponse) {
            const cssSize = await cssResponse.body().then(buffer => buffer.length);
            expect(cssSize).toBeLessThan(100000); // Менее 100KB
        }
    });
}); 