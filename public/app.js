/**
 * Game Adventure - Simple SPA Game Engine
 */

// Аудио переменные
let menuBgm, gameBgm;
let audioUnlocked = false;

// Разблокировка аудио для мобильных устройств
function unlockAudioOnce() {
    if (audioUnlocked) {
        console.log('Audio already unlocked');
        return;
    }

    console.log('Unlocking audio for mobile devices...');

    const tryPlay = async(audio) => {
        if (!audio) {
            console.log('Audio object is null');
            return;
        }

        try {
            console.log('Trying to unlock audio:', audio.src);
            audio.volume = 0.01; // Очень тихо для разблокировки
            await audio.play();
            audio.pause();
            audio.currentTime = 0;
            console.log('Audio unlocked successfully:', audio.src);
        } catch (e) {
            console.log('Audio unlock failed:', e.message, 'for', audio.src);
        }
    };

    tryPlay(menuBgm);
    tryPlay(gameBgm);
    audioUnlocked = true;
    console.log('Audio unlock process completed');
}

// Инициализация аудио
function initAudio() {
    console.log('Initializing audio...');

    try {
        menuBgm = new Audio('assets/media/menu-campfire.mp3');
        gameBgm = new Audio('assets/media/game-ambient.mp3');

        // Настройка аудио
        menuBgm.loop = true;
        gameBgm.loop = true;
        menuBgm.volume = 0.3;
        gameBgm.volume = 0.2;

        // Предзагрузка
        menuBgm.preload = 'auto';
        gameBgm.preload = 'auto';

        console.log('Audio initialized successfully');
        console.log('Menu BGM:', menuBgm.src);
        console.log('Game BGM:', gameBgm.src);

    } catch (error) {
        console.error('Audio initialization failed:', error);
    }
}

// Управление музыкой
function startMenuBgm() {
    console.log('startMenuBgm called');

    if (!menuBgm) {
        console.log('Menu BGM not initialized');
        return;
    }

    try {
        console.log('Starting menu BGM...');
        gameBgm ? .pause();
        menuBgm.volume = 0.3;

        const playPromise = menuBgm.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('Menu BGM started successfully');
            }).catch((e) => {
                console.log('Menu BGM play failed:', e.message);
            });
        }
    } catch (error) {
        console.error('Error starting menu BGM:', error);
    }
}

function startGameBgm() {
    console.log('startGameBgm called');

    if (!gameBgm) {
        console.log('Game BGM not initialized');
        return;
    }

    try {
        console.log('Starting game BGM...');
        menuBgm ? .pause();
        gameBgm.volume = 0.2;

        const playPromise = gameBgm.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('Game BGM started successfully');
            }).catch((e) => {
                console.log('Game BGM play failed:', e.message);
            });
        }
    } catch (error) {
        console.error('Error starting game BGM:', error);
    }
}

function stopAllBgm() {
    console.log('Stopping all BGM...');
    try {
        menuBgm ? .pause();
        gameBgm ? .pause();
        console.log('All BGM stopped');
    } catch (error) {
        console.error('Error stopping BGM:', error);
    }
}

class GameEngine {
    constructor() {
        this.apiBase = 'api/';
        this.state = this.loadState();
        this.currentEvent = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateUI();
        this.showMenu(); // Показываем меню вместо запуска игры
        this.initMobileOptimizations();
    }

    // === Управление состоянием ===

    getDefaultState() {
        return {
            location: "main",
            turn: 0,
            seenIds: [],
            cooldowns: {},
            stats: {
                hp: 20,
                damage: 3,
                fame: 0,
                gold: 10,
                debt: 0,
                items: []
            }
        };
    }

    loadState() {
        try {
            const saved = localStorage.getItem('gameState');
            return saved ? {...this.getDefaultState(), ...JSON.parse(saved) } : this.getDefaultState();
        } catch (e) {
            console.warn('Failed to load state, using default:', e);
            return this.getDefaultState();
        }
    }

    saveState() {
        try {
            localStorage.setItem('gameState', JSON.stringify(this.state));
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    }

    resetState() {
        this.state = this.getDefaultState();
        this.saveState();
        this.updateUI();
        this.startGame();
    }

    // === Эффекты и валидация ===

    normalizeEffect(value) {
        if (typeof value === 'number') {
            return value;
        }

        if (typeof value === 'string') {
            // Обработка строковых значений "+8", "-5"
            if (/^[+-]?\d+$/.test(value)) {
                return parseInt(value, 10);
            }

            // Обработка случайных значений "random:-5,+15"
            const randomMatch = value.match(/^random:(-?\d+),(-?\d+)$/);
            if (randomMatch) {
                const min = parseInt(randomMatch[1], 10);
                const max = parseInt(randomMatch[2], 10);
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }

            // Обработка вероятностных значений "chance:0.5,+6,-3"
            const chanceMatch = value.match(/^chance:([0-9.]+),(-?\d+),(-?\d+)$/);
            if (chanceMatch) {
                const chance = parseFloat(chanceMatch[1]);
                const success = parseInt(chanceMatch[2], 10);
                const failure = parseInt(chanceMatch[3], 10);
                return Math.random() <= chance ? success : failure;
            }
        }

        return 0;
    }

    applyEffects(effects) {
        if (!effects) return;

        const changes = {};

        Object.keys(effects).forEach(key => {
            if (key === 'items_add' && Array.isArray(effects[key])) {
                effects[key].forEach(item => {
                    if (!this.state.stats.items.includes(item)) {
                        this.state.stats.items.push(item);
                        changes[key] = changes[key] || [];
                        changes[key].push(item);
                    }
                });
            } else if (key === 'items_remove' && Array.isArray(effects[key])) {
                effects[key].forEach(item => {
                    const index = this.state.stats.items.indexOf(item);
                    if (index > -1) {
                        this.state.stats.items.splice(index, 1);
                        changes[key] = changes[key] || [];
                        changes[key].push(item);
                    }
                });
            } else if (['hp', 'damage', 'fame', 'gold', 'debt'].includes(key)) {
                const change = this.normalizeEffect(effects[key]);
                if (change !== 0) {
                    if (key === 'hp') {
                        // HP не может быть отрицательным
                        this.state.stats[key] = Math.max(0, this.state.stats[key] + change);
                    } else {
                        this.state.stats[key] = Math.max(0, this.state.stats[key] + change);
                    }
                    changes[key] = change;
                }
            }
        });

        // Ограничения
        this.state.stats.hp = Math.max(0, this.state.stats.hp);
        this.state.stats.gold = Math.max(0, this.state.stats.gold);

        return changes;
    }

    applyCostBenefit(cost, benefit) {
        let applied = false;
        let usedDebt = false;

        // Проверяем, можем ли применить cost
        if (cost) {
            if (cost.gold && this.state.stats.gold < cost.gold) {
                // Проверяем возможность взять в долг
                if (cost.gold <= 5 && this.state.stats.gold < cost.gold) {
                    const debtAmount = cost.gold - this.state.stats.gold;
                    this.state.stats.debt = (this.state.stats.debt || 0) + debtAmount;
                    this.state.stats.gold = 0;
                    usedDebt = true;
                    applied = true;

                    // Показываем предупреждение о долге
                    this.showDebtWarning(debtAmount);
                } else {
                    return false; // Недостаточно золота и нельзя в долг
                }
            } else if (cost.gold) {
                this.state.stats.gold -= cost.gold;
                applied = true;
            }

            if (cost.items && Array.isArray(cost.items)) {
                for (const item of cost.items) {
                    if (!this.state.stats.items.includes(item)) {
                        return false; // Нет нужного предмета
                    }
                }
            }
        }

        // Применяем cost
        if (cost) {
            if (cost.gold) {
                this.state.stats.gold -= cost.gold;
                applied = true;
            }
            if (cost.items && Array.isArray(cost.items)) {
                cost.items.forEach(item => {
                    const index = this.state.stats.items.indexOf(item);
                    if (index > -1) {
                        this.state.stats.items.splice(index, 1);
                        applied = true;
                    }
                });
            }
        }

        // Применяем benefit
        if (benefit) {
            if (benefit.hp) {
                this.state.stats.hp += this.normalizeEffect(benefit.hp);
                applied = true;
            }
            if (benefit.gold) {
                this.state.stats.gold += this.normalizeEffect(benefit.gold);
                applied = true;
            }
            if (benefit.fame) {
                this.state.stats.fame += this.normalizeEffect(benefit.fame);
                applied = true;
            }
            if (benefit.items && Array.isArray(benefit.items)) {
                benefit.items.forEach(item => {
                    if (!this.state.stats.items.includes(item)) {
                        this.state.stats.items.push(item);
                        applied = true;
                    }
                });
            }
        }

        return applied;
    }

    // === API взаимодействие ===

    async loadNextEvent() {
        try {
            console.log('Loading next event...');
            this.showLoading(true);

            const response = await fetch(`${this.apiBase}next.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    state: this.state
                })
            });

            console.log('API response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('API response data:', result);

            if (result.success) {
                this.currentEvent = result.data.event;
                console.log('Current event loaded:', this.currentEvent);
                // Не обновляем state автоматически, это делается при выборе
                this.renderEvent();
            } else {
                throw new Error(result.error || 'Unknown API error');
            }
        } catch (error) {
            console.error('Error loading next event:', error);

            // Проверяем тип ошибки для более точного сообщения
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showError('Нет сети, попробуйте ещё раз');
            } else if (error.message.includes('HTTP')) {
                this.showError('Ошибка сервера, попробуйте позже');
            } else {
                this.showError('Ошибка загрузки события. Попробуйте обновить страницу.');
            }
        } finally {
            this.showLoading(false);
        }
    }

    // === Игровая логика ===

    async startGame() {
        console.log('Starting game...');
        console.log('Current state:', this.state);

        if (this.state.stats.hp <= 0) {
            console.log('Player is dead, showing death screen');
            this.showDeathScreen();
            return;
        }

        console.log('Loading next event...');
        await this.loadNextEvent();
    }

    async makeChoice(choice, choiceIndex) {
        try {
            // Отключаем кнопки
            this.setChoicesEnabled(false);

            // Применяем cost/benefit выбора
            if (choice.cost || choice.benefit) {
                const applied = this.applyCostBenefit(choice.cost, choice.benefit);
                if (!applied && choice.cost) {
                    this.showError('Недостаточно ресурсов для этого действия!');
                    this.setChoicesEnabled(true);
                    return;
                }
            }

            // Применяем эффекты события
            if (this.currentEvent.effects) {
                this.applyEffects(this.currentEvent.effects);
            }

            // Проверяем на goto_location для особой обработки
            const isLocationChange = choice.next && choice.next.startsWith('goto_location:');
            let shouldIncrementTurn = !isLocationChange;

            if (isLocationChange) {
                const newLocation = choice.next.substring('goto_location:'.length);
                const oldLocation = this.state.location;

                // Обновляем локацию
                this.state.location = newLocation;

                // Специальная обработка перехода в деревню после пролога
                if (oldLocation === 'main' && newLocation === 'village') {
                    // Сбрасываем seenIds только для типа 'main'
                    this.state.seenIds = this.state.seenIds.filter(id => !id.startsWith('main.'));
                }
            }

            // Завершение хода (только если не goto_location)
            if (shouldIncrementTurn) {
                this.finishTurn();
            } else {
                // При телепортации только добавляем в просмотренные
                if (this.currentEvent && this.currentEvent.id && this.currentEvent.id !== 'default.idle') {
                    if (!this.state.seenIds.includes(this.currentEvent.id)) {
                        this.state.seenIds.push(this.currentEvent.id);
                    }
                }
            }

            // Проверка смерти
            if (this.state.stats.hp <= 0) {
                this.showDeathScreen();
                return;
            }

            // Обновляем UI
            this.updateUI();
            this.saveState();

            // Если следующий ход не "end", загружаем следующее событие
            if (choice.next !== 'end') {
                await this.loadNextEvent();
            } else {
                this.showGameEnd();
            }

        } catch (error) {
            console.error('Error making choice:', error);
            this.showError('Ошибка при выполнении действия.');
            this.setChoicesEnabled(true);
        }
    }

    finishTurn() {
        // Увеличиваем номер хода
        this.state.turn++;

        // Добавляем ID события в просмотренные
        if (this.currentEvent && this.currentEvent.id && this.currentEvent.id !== 'default.idle') {
            if (!this.state.seenIds.includes(this.currentEvent.id)) {
                this.state.seenIds.push(this.currentEvent.id);
            }
        }

        // Обновляем кулдауны
        Object.keys(this.state.cooldowns).forEach(id => {
            if (this.state.cooldowns[id] > 0) {
                this.state.cooldowns[id]--;
                if (this.state.cooldowns[id] <= 0) {
                    delete this.state.cooldowns[id];
                }
            }
        });

        // Устанавливаем кулдаун для текущего события если нужно
        if (this.currentEvent && this.currentEvent.rules && this.currentEvent.rules.cooldown > 0) {
            this.state.cooldowns[this.currentEvent.id] = this.currentEvent.rules.cooldown;
        }
    }

    // === UI управление ===

    bindEvents() {
        console.log('Binding events...');

        // Кнопка перезапуска (может не существовать при инициализации)
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.resetState();
                this.showDeathScreen(false);
            });
        }

        // Кнопки главного меню
        const btnStart = document.getElementById('btnStart');
        const btnContinue = document.getElementById('btnContinue');
        const btnMute = document.getElementById('btnMute');
        const btnToMenu = document.getElementById('btnToMenu');

        console.log('Buttons found:', {
            btnStart: !!btnStart,
            btnContinue: !!btnContinue,
            btnMute: !!btnMute,
            btnToMenu: !!btnToMenu
        });

        if (btnStart) {
            console.log('Adding click listener to Start button');
            btnStart.addEventListener('click', () => {
                console.log('Start button clicked');
                unlockAudioOnce();
                if (gameBgm) {
                    gameBgm.load(); // предварительно открываем поток
                }
                this.showGame(); // Убираем startMenuBgm() - музыка будет запущена в showGame()
            });
        } else {
            console.error('Start button not found!');
        }

        if (btnContinue) {
            btnContinue.addEventListener('click', () => {
                console.log('Continue button clicked');
                unlockAudioOnce();
                if (gameBgm) {
                    gameBgm.load(); // предварительно открываем поток
                }
                startGameBgm();
                this.showGame();
            });
        }

        if (btnMute) {
            btnMute.addEventListener('click', () => {
                console.log('Mute button clicked');
                if ((menuBgm ? .paused ? ? true) && (gameBgm ? .paused ? ? true)) {
                    startMenuBgm();
                    btnMute.textContent = 'Звук: вкл';
                } else {
                    stopAllBgm();
                    btnMute.textContent = 'Звук: выкл';
                }
            });
        }

        if (btnToMenu) {
            btnToMenu.addEventListener('click', () => {
                this.showMenu();
            });
        }

        console.log('Events bound successfully');
    }

    initMobileOptimizations() {
        console.log('Initializing mobile optimizations...');

        // Пауза видео при неактивной вкладке
        const menuVideo = document.getElementById('menuVideo');
        document.addEventListener('visibilitychange', () => {
            if (!menuVideo) return;
            if (document.hidden) {
                menuVideo.pause();
            } else {
                menuVideo.play().catch(() => {});
            }
        });

        // Разблокировка аудио по тачу/клику
        const unlockEvents = ['touchstart', 'click', 'touchend'];
        unlockEvents.forEach(eventType => {
            document.addEventListener(eventType, unlockAudioOnce, { once: true, passive: true });
        });

        // Обработка клавиатуры для доступности
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.mode === 'game') {
                const cardEl = document.getElementById('card');
                if (cardEl) {
                    const first = cardEl.querySelector('.choices .choice');
                    if (first) {
                        e.preventDefault();
                        first.click();
                    }
                }
            }
        });

        console.log('Mobile optimizations initialized');
    }

    showMenu() {
        this.mode = 'menu';
        const menuRoot = document.getElementById('menu-root');
        const appRoot = document.getElementById('app-root');
        const loadingScreen = document.getElementById('loading-screen');
        const deathScreen = document.getElementById('death-screen');

        if (menuRoot) menuRoot.style.display = 'grid';
        if (appRoot) appRoot.style.display = 'none';
        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (deathScreen) deathScreen.classList.add('hidden');

        startMenuBgm();
    }

    showGame() {
        this.mode = 'game';
        const menuRoot = document.getElementById('menu-root');
        const appRoot = document.getElementById('app-root');
        const loadingScreen = document.getElementById('loading-screen');
        const deathScreen = document.getElementById('death-screen');

        if (menuRoot) menuRoot.style.display = 'none';
        if (appRoot) appRoot.style.display = 'grid';
        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (deathScreen) deathScreen.classList.add('hidden');

        startGameBgm(); // Исправлено: должно быть startGameBgm(), а не startMenuBgm()

        // Запускаем игру после переключения интерфейса
        this.startGame();
    }

    updateUI() {
        // Обновляем статистики в HUD
        document.getElementById('stat-hp').textContent = this.state.stats.hp;
        document.getElementById('stat-damage').textContent = this.state.stats.damage;
        document.getElementById('stat-fame').textContent = this.state.stats.fame;
        document.getElementById('stat-gold').textContent = this.state.stats.gold;

        // Обновляем долг если есть
        const debtElement = document.getElementById('stat-debt');
        if (debtElement) {
            debtElement.textContent = this.state.stats.debt || 0;
        }

        document.getElementById('current-location').textContent = this.state.location;
        document.getElementById('turn-number').textContent = this.state.turn;

        // Обновляем инвентарь
        this.updateInventory();

        // Цветовая индикация HP
        const hpElement = document.getElementById('stat-hp');
        if (this.state.stats.hp <= 5) {
            hpElement.style.color = '#d32f2f';
        } else if (this.state.stats.hp <= 10) {
            hpElement.style.color = '#ff9800';
        } else {
            hpElement.style.color = '#4caf50';
        }

        // Цветовая индикация долга
        if (debtElement) {
            const debt = this.state.stats.debt || 0;
            if (debt > 0) {
                debtElement.style.color = '#d32f2f';
            } else {
                debtElement.style.color = '#4caf50';
            }
        }
    }

    updateInventory() {
        const container = document.getElementById('invList');

        if (!this.state.stats.items || this.state.stats.items.length === 0) {
            container.textContent = 'Пусто';
        } else {
            container.textContent = this.state.stats.items.join(', ');
        }
    }

    renderEvent() {
        if (!this.currentEvent) return;

        const event = this.currentEvent;

        // Обновляем изображение с ленивой загрузкой
        const imageEl = document.getElementById('event-image');
        if (event.image) {
            imageEl.style.setProperty('--image-url', `url(${event.image})`);
            imageEl.classList.add('has-image');
            imageEl.innerHTML = `<img src="${event.image}" alt="${event.title || 'Событие'}" loading="lazy" decoding="async" />`;
        } else {
            imageEl.classList.remove('has-image');
            imageEl.innerHTML = '🎭';
        }

        // Обновляем заголовок и текст
        document.getElementById('event-title').textContent = `Событие: ${event.title}`;
        document.getElementById('event-text').textContent = event.text;

        // Рендерим выборы
        this.renderChoices(event.choices || []);
    }

    renderChoices(choices) {
        const container = document.getElementById('choices-container');

        if (choices.length === 0) {
            container.innerHTML = '<button class="choice-btn" tabindex="0" onclick="game.resetState()">🔄 Начать заново</button>';
            return;
        }

        container.innerHTML = choices.map((choice, index) => {
            let choiceHtml = `<button class="choice-btn" tabindex="0" onclick="game.makeChoice(${JSON.stringify(choice).replace(/"/g, '&quot;')}, ${index})">
                ${choice.label}`;

            // Добавляем информацию о стоимости
            if (choice.cost) {
                const costParts = [];
                if (choice.cost.gold) costParts.push(`💰 -${choice.cost.gold}`);
                if (choice.cost.items) costParts.push(...choice.cost.items.map(item => `📦 -${item}`));
                if (costParts.length > 0) {
                    choiceHtml += `<div class="choice-cost">Стоимость: ${costParts.join(', ')}</div>`;
                }
            }

            // Добавляем информацию о выгоде
            if (choice.benefit) {
                const benefitParts = [];
                if (choice.benefit.hp) benefitParts.push(`❤️ +${choice.benefit.hp}`);
                if (choice.benefit.gold) benefitParts.push(`💰 +${choice.benefit.gold}`);
                if (choice.benefit.fame) benefitParts.push(`⭐ +${choice.benefit.fame}`);
                if (choice.benefit.items) benefitParts.push(...choice.benefit.items.map(item => `📦 +${item}`));
                if (benefitParts.length > 0) {
                    choiceHtml += `<div class="choice-benefit">Получите: ${benefitParts.join(', ')}</div>`;
                }
            }

            choiceHtml += '</button>';
            return choiceHtml;
        }).join('');
    }

    setChoicesEnabled(enabled) {
        const buttons = document.querySelectorAll('.choice-btn');
        buttons.forEach(btn => {
            btn.disabled = !enabled;
        });
    }

    showLoading(show) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            if (show) {
                loadingScreen.classList.remove('hidden');
            } else {
                loadingScreen.classList.add('hidden');
            }
        }
    }

    showDeathScreen(show = true) {
        const deathScreen = document.getElementById('death-screen');
        if (deathScreen) {
            if (show) {
                deathScreen.classList.remove('hidden');
            } else {
                deathScreen.classList.add('hidden');
            }
        }
    }

    showGameEnd() {
        document.getElementById('event-title').textContent = 'Игра завершена!';
        document.getElementById('event-text').textContent = 'Спасибо за игру! Ваше приключение подошло к концу.';
        document.getElementById('choices-container').innerHTML =
            '<button class="choice-btn" onclick="game.resetState()">🔄 Начать заново</button>';
    }

    showError(message) {
        // Простое отображение ошибки через alert
        // В реальном проекте можно сделать красивое модальное окно
        alert(message);
    }

    showDebtWarning(debtAmount) {
        // Показываем предупреждение о долге
        const warningHtml = `
            <div class="debt-warning" style="
                position: fixed; 
                top: 20px; 
                right: 20px; 
                background: #ff9800; 
                color: white; 
                padding: 15px; 
                border-radius: 8px; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 1000;
                max-width: 300px;
            ">
                <strong>⚠️ Взят долг!</strong><br>
                Долг: +${debtAmount} золота<br>
                <small>Общий долг: ${this.state.stats.debt || 0}</small>
            </div>
        `;

        // Добавляем предупреждение
        document.body.insertAdjacentHTML('beforeend', warningHtml);

        // Убираем через 3 секунды
        setTimeout(() => {
            const warning = document.querySelector('.debt-warning');
            if (warning) {
                warning.remove();
            }
        }, 3000);
    }

    async handleLocationTransition(newLocation) {
        try {
            const oldLocation = this.state.location;

            // Обновляем локацию
            this.state.location = newLocation;

            // Специальная обработка перехода в деревню после пролога
            if (oldLocation === 'main' && newLocation === 'village') {
                // Сбрасываем seenIds только для типа 'main'
                this.state.seenIds = this.state.seenIds.filter(id => !id.startsWith('main.'));
            }

            // Добавляем текущее событие в просмотренные (без увеличения хода)
            if (this.currentEvent && this.currentEvent.id && this.currentEvent.id !== 'default.idle') {
                if (!this.state.seenIds.includes(this.currentEvent.id)) {
                    this.state.seenIds.push(this.currentEvent.id);
                }
            }

            // Обновляем UI и сохраняем
            this.updateUI();
            this.saveState();

            // Немедленно запрашиваем следующее событие в новой локации
            await this.loadNextEvent();

        } catch (error) {
            console.error('Error during location transition:', error);

            // Проверяем тип ошибки для более точного сообщения
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showError('Нет сети, попробуйте ещё раз');
            } else {
                this.showError('Ошибка при перемещении.');
            }
            this.setChoicesEnabled(true);
        }
    }
}

// Глобальная переменная для доступа из HTML
let game;

// Анти-залипание 100vh на iOS
function setVhVar() {
    document.documentElement.style.setProperty('--vh', window.visualViewport ? `${window.visualViewport.height}px` : `${window.innerHeight}px`);
}
window.addEventListener('resize', setVhVar);
if (window.visualViewport) window.visualViewport.addEventListener('resize', setVhVar);
setVhVar();

// Инициализация игры
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    try {
        initAudio();
        game = new GameEngine();
        console.log('Game initialized successfully');
    } catch (error) {
        console.error('Game initialization failed:', error);
        // Показываем ошибку пользователю
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                <h2>Ошибка загрузки игры</h2>
                <p>Не удалось инициализировать игру. Проверьте консоль браузера для подробностей.</p>
                <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 10px;">Перезагрузить</button>
            </div>
        `;
    }
});