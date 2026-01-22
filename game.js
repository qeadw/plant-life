// Plant Life - An Idle Growth Game
const SAVE_KEY = 'plant_life_save';

// ============ GAME DATA ============

const ACTIVITIES = {
    absorbWater: {
        name: 'Absorb Water',
        resource: 'water',
        baseRate: 1,
        unlockReq: null,
    },
    photosynthesize: {
        name: 'Photosynthesize',
        resource: 'sunlight',
        baseRate: 0.8,
        unlockReq: { growth: 'leafSize', level: 1 },
    },
    extendRoots: {
        name: 'Extend Roots',
        resource: 'nutrients',
        baseRate: 0.5,
        unlockReq: { growth: 'rootDepth', level: 1 },
    },
    deepTapRoot: {
        name: 'Deep Tap Root',
        resource: 'nutrients',
        baseRate: 2,
        unlockReq: { growth: 'rootDepth', level: 10 },
    },
    broadCanopy: {
        name: 'Broad Canopy',
        resource: 'sunlight',
        baseRate: 3,
        unlockReq: { growth: 'leafSize', level: 10 },
    },
    nightBloom: {
        name: 'Night Bloom',
        resource: 'moonlight',
        baseRate: 0.3,
        unlockReq: { growth: 'flowerBuds', level: 5 },
    },
    channelEssence: {
        name: 'Channel Essence',
        resource: 'essence',
        baseRate: 0.1,
        unlockReq: { growth: 'essenceAbsorption', level: 5 },
    },
    ancientRoots: {
        name: 'Ancient Roots',
        resource: 'nutrients',
        baseRate: 10,
        unlockReq: { growth: 'rootDepth', level: 25 },
    },
    cosmicPhotosynthesis: {
        name: 'Cosmic Photosynthesis',
        resource: 'sunlight',
        baseRate: 15,
        unlockReq: { growth: 'cosmicAttunement', level: 5 },
    },
};

const GROWTH_STATS = {
    // Physical
    rootDepth: {
        name: 'Root Depth',
        category: 'physical',
        baseXpReq: 10,
        unlockReq: null,
        effect: 'Unlocks nutrient activities',
    },
    stemHeight: {
        name: 'Stem Height',
        category: 'physical',
        baseXpReq: 15,
        unlockReq: null,
        effect: 'Increases sunlight gain',
    },
    leafSize: {
        name: 'Leaf Size',
        category: 'physical',
        baseXpReq: 12,
        unlockReq: null,
        effect: 'Multiplies photosynthesis',
    },
    flowerBuds: {
        name: 'Flower Buds',
        category: 'physical',
        baseXpReq: 20,
        unlockReq: { growth: 'stemHeight', level: 5 },
        effect: 'Unlocks moonlight activities',
    },
    // Magical
    essenceAbsorption: {
        name: 'Essence Absorption',
        category: 'magical',
        baseXpReq: 50,
        unlockReq: { growth: 'flowerBuds', level: 10 },
        effect: 'Unlocks essence activities',
    },
    auraStrength: {
        name: 'Aura Strength',
        category: 'magical',
        baseXpReq: 80,
        unlockReq: { growth: 'essenceAbsorption', level: 5 },
        effect: 'Multiplies all resource gain',
    },
    ancientMemory: {
        name: 'Ancient Memory',
        category: 'magical',
        baseXpReq: 100,
        unlockReq: { growth: 'auraStrength', level: 10 },
        effect: 'Increases rebirth multipliers',
    },
    cosmicAttunement: {
        name: 'Cosmic Attunement',
        category: 'magical',
        baseXpReq: 150,
        unlockReq: { growth: 'ancientMemory', level: 10 },
        effect: 'Unlocks final tier activities',
    },
};

const LIFE_STAGES = [
    { name: 'Seed', minLevels: 0 },
    { name: 'Sprout', minLevels: 5 },
    { name: 'Sapling', minLevels: 20 },
    { name: 'Mature', minLevels: 50 },
    { name: 'Ancient', minLevels: 100 },
    { name: 'Withering', minLevels: 200 },
];

// ============ GAME STATE ============

let gameState = {
    // Time
    day: 1,
    year: 1,
    totalDays: 0,
    lifetimes: 1,

    // Resources
    resources: {
        water: 0,
        sunlight: 0,
        nutrients: 0,
        moonlight: 0,
        essence: 0,
    },

    // Current activity
    currentActivity: 'absorbWater',
    activityXp: {},
    activityLevels: {},

    // Growth
    currentGrowth: 'rootDepth',
    growthXp: {},
    growthLevels: {},

    // Rebirth multipliers (permanent)
    rebirthMultipliers: {},
    maxGrowthLevels: {}, // Track max levels for rebirth calculation
};

// Track last rendered day for progress bar updates
let lastRenderedDay = 0;
let needsFullRender = true;

// ============ GAME FUNCTIONS ============

function initializeState() {
    // Initialize activity XP and levels
    for (const key of Object.keys(ACTIVITIES)) {
        if (gameState.activityXp[key] === undefined) gameState.activityXp[key] = 0;
        if (gameState.activityLevels[key] === undefined) gameState.activityLevels[key] = 0;
    }

    // Initialize growth XP and levels
    for (const key of Object.keys(GROWTH_STATS)) {
        if (gameState.growthXp[key] === undefined) gameState.growthXp[key] = 0;
        if (gameState.growthLevels[key] === undefined) gameState.growthLevels[key] = 0;
        if (gameState.rebirthMultipliers[key] === undefined) gameState.rebirthMultipliers[key] = 1;
        if (gameState.maxGrowthLevels[key] === undefined) gameState.maxGrowthLevels[key] = 0;
    }
}

function getXpRequired(baseXp, level) {
    return Math.floor(baseXp * Math.pow(1.15, level));
}

function getActivityRate(activityKey) {
    const activity = ACTIVITIES[activityKey];
    const level = gameState.activityLevels[activityKey] || 0;
    const baseRate = activity.baseRate;

    // Rate increases with level
    let rate = baseRate * (1 + level * 0.1);

    // Apply growth bonuses
    if (activity.resource === 'sunlight') {
        rate *= 1 + (gameState.growthLevels.stemHeight || 0) * 0.05;
        rate *= 1 + (gameState.growthLevels.leafSize || 0) * 0.1;
    }
    if (activity.resource === 'nutrients') {
        rate *= 1 + (gameState.growthLevels.rootDepth || 0) * 0.1;
    }

    // Aura strength multiplier
    rate *= 1 + (gameState.growthLevels.auraStrength || 0) * 0.05;

    return rate;
}

function isActivityUnlocked(activityKey) {
    const activity = ACTIVITIES[activityKey];
    if (!activity.unlockReq) return true;

    const reqGrowth = activity.unlockReq.growth;
    const reqLevel = activity.unlockReq.level;
    return (gameState.growthLevels[reqGrowth] || 0) >= reqLevel;
}

function isGrowthUnlocked(growthKey) {
    const growth = GROWTH_STATS[growthKey];
    if (!growth.unlockReq) return true;

    const reqGrowth = growth.unlockReq.growth;
    const reqLevel = growth.unlockReq.level;
    return (gameState.growthLevels[reqGrowth] || 0) >= reqLevel;
}

function getTotalLevels() {
    let total = 0;
    for (const key of Object.keys(GROWTH_STATS)) {
        total += gameState.growthLevels[key] || 0;
    }
    return total;
}

function getLifeStage() {
    const totalLevels = getTotalLevels();
    let stage = LIFE_STAGES[0];
    for (const s of LIFE_STAGES) {
        if (totalLevels >= s.minLevels) {
            stage = s;
        }
    }
    return stage;
}

function canRebirth() {
    return getLifeStage().name === 'Ancient' || getLifeStage().name === 'Withering';
}

function doRebirth() {
    if (!canRebirth()) return;

    // Calculate new multipliers based on max levels
    for (const key of Object.keys(GROWTH_STATS)) {
        const currentLevel = gameState.growthLevels[key] || 0;
        const maxLevel = Math.max(gameState.maxGrowthLevels[key] || 0, currentLevel);
        gameState.maxGrowthLevels[key] = maxLevel;

        // Formula: 1 + maxLevel / 10
        const newMultiplier = 1 + maxLevel / 10;
        if (newMultiplier > gameState.rebirthMultipliers[key]) {
            gameState.rebirthMultipliers[key] = newMultiplier;
        }
    }

    // Ancient Memory bonus
    const ancientBonus = 1 + (gameState.growthLevels.ancientMemory || 0) * 0.02;
    for (const key of Object.keys(GROWTH_STATS)) {
        gameState.rebirthMultipliers[key] *= ancientBonus;
    }

    // Reset progress but keep multipliers
    gameState.day = 1;
    gameState.year = 1;
    gameState.lifetimes++;

    gameState.resources = {
        water: 0,
        sunlight: 0,
        nutrients: 0,
        moonlight: 0,
        essence: 0,
    };

    gameState.currentActivity = 'absorbWater';
    gameState.currentGrowth = 'rootDepth';

    for (const key of Object.keys(ACTIVITIES)) {
        gameState.activityXp[key] = 0;
        gameState.activityLevels[key] = 0;
    }

    for (const key of Object.keys(GROWTH_STATS)) {
        gameState.growthXp[key] = 0;
        gameState.growthLevels[key] = 0;
    }

    saveGame();
    needsFullRender = true;
}

// ============ GAME LOOP ============

let lastTick = Date.now();
const TICK_RATE = 100; // ms per tick
const DAYS_PER_SECOND = 1; // 1 real second = 1 in-game day

function gameTick() {
    const now = Date.now();
    const deltaTime = (now - lastTick) / 1000; // seconds
    lastTick = now;

    const previousDay = Math.floor(gameState.day);

    // Progress time
    const dayProgress = deltaTime * DAYS_PER_SECOND;
    gameState.day += dayProgress;
    gameState.totalDays += dayProgress;

    // Year rollover (365 days per year)
    while (gameState.day >= 365) {
        gameState.day -= 365;
        gameState.year++;
    }

    const currentDay = Math.floor(gameState.day);
    const dayChanged = currentDay !== previousDay;

    // Activity progress
    if (gameState.currentActivity && isActivityUnlocked(gameState.currentActivity)) {
        const rate = getActivityRate(gameState.currentActivity);
        const resource = ACTIVITIES[gameState.currentActivity].resource;

        // Add resources
        gameState.resources[resource] += rate * deltaTime;

        // Gain activity XP
        gameState.activityXp[gameState.currentActivity] += deltaTime * 10;

        // Check for level up
        const currentLevel = gameState.activityLevels[gameState.currentActivity];
        const xpReq = getXpRequired(20, currentLevel);
        if (gameState.activityXp[gameState.currentActivity] >= xpReq) {
            gameState.activityXp[gameState.currentActivity] -= xpReq;
            gameState.activityLevels[gameState.currentActivity]++;
            updateActivityLevelUp(gameState.currentActivity);
        }
    }

    // Growth progress
    if (gameState.currentGrowth && isGrowthUnlocked(gameState.currentGrowth)) {
        const growth = GROWTH_STATS[gameState.currentGrowth];
        const currentLevel = gameState.growthLevels[gameState.currentGrowth];
        const multiplier = gameState.rebirthMultipliers[gameState.currentGrowth] || 1;

        // Gain growth XP (multiplied by rebirth bonus)
        gameState.growthXp[gameState.currentGrowth] += deltaTime * 10 * multiplier;

        // Check for level up
        const xpReq = getXpRequired(growth.baseXpReq, currentLevel);
        if (gameState.growthXp[gameState.currentGrowth] >= xpReq) {
            gameState.growthXp[gameState.currentGrowth] -= xpReq;
            gameState.growthLevels[gameState.currentGrowth]++;
            updateGrowthLevelUp(gameState.currentGrowth);
        }
    }

    // Auto-save every tick
    saveGame();

    // Render updates
    if (needsFullRender) {
        renderAll();
        needsFullRender = false;
        lastRenderedDay = currentDay;
    } else if (dayChanged) {
        // Only update progress bars and time once per day
        renderTime();
        renderProgressBars();
        renderResources();
        lastRenderedDay = currentDay;
    }
}

// ============ RENDERING ============

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return Math.floor(num).toString();
}

function renderResources() {
    document.getElementById('water').textContent = formatNumber(gameState.resources.water);
    document.getElementById('sunlight').textContent = formatNumber(gameState.resources.sunlight);
    document.getElementById('nutrients').textContent = formatNumber(gameState.resources.nutrients);
    document.getElementById('moonlight').textContent = formatNumber(gameState.resources.moonlight);
    document.getElementById('essence').textContent = formatNumber(gameState.resources.essence);
}

function renderTime() {
    document.getElementById('day-display').textContent = `Day ${Math.floor(gameState.day)}`;
    document.getElementById('year-display').textContent = `Year ${gameState.year}`;
}

function renderProgressBars() {
    // Activity progress bar
    if (gameState.currentActivity) {
        const level = gameState.activityLevels[gameState.currentActivity];
        const xp = gameState.activityXp[gameState.currentActivity];
        const xpReq = getXpRequired(20, level);
        const percent = (xp / xpReq) * 100;
        document.getElementById('activity-progress').style.width = `${percent}%`;
        document.getElementById('activity-level').textContent = `Lv. ${level}`;
    }

    // Growth progress bar
    if (gameState.currentGrowth) {
        const growth = GROWTH_STATS[gameState.currentGrowth];
        const level = gameState.growthLevels[gameState.currentGrowth];
        const xp = gameState.growthXp[gameState.currentGrowth];
        const xpReq = getXpRequired(growth.baseXpReq, level);
        const percent = (xp / xpReq) * 100;
        document.getElementById('growth-progress').style.width = `${percent}%`;
        document.getElementById('growth-level').textContent = `Lv. ${level} → ${level + 1}`;
        document.getElementById('growth-percent').textContent = `${percent.toFixed(0)}%`;
    }
}

// Targeted update for activity level up - only updates specific elements
function updateActivityLevelUp(activityKey) {
    const activity = ACTIVITIES[activityKey];
    const level = gameState.activityLevels[activityKey];

    // Update the activity item's level display
    const item = document.querySelector(`.activity-item[data-key="${activityKey}"] .item-level`);
    if (item) {
        item.textContent = `Lv. ${level}`;
    }

    // Update current activity rate display
    if (gameState.currentActivity === activityKey) {
        const rate = getActivityRate(activityKey);
        document.getElementById('current-activity-rate').textContent = `+${rate.toFixed(1)} ${activity.resource}/sec`;
    }

    // Check if any new activities unlocked
    checkForNewUnlocks();
}

// Targeted update for growth level up - only updates specific elements
function updateGrowthLevelUp(growthKey) {
    const growth = GROWTH_STATS[growthKey];
    const level = gameState.growthLevels[growthKey];
    const multiplier = gameState.rebirthMultipliers[growthKey] || 1;

    // Update the growth item's level display
    const item = document.querySelector(`.growth-item[data-key="${growthKey}"] .item-level`);
    if (item) {
        item.textContent = `Lv. ${level}`;
    }

    // Update life stage display
    const stage = getLifeStage();
    const totalLevels = getTotalLevels();
    document.getElementById('life-stage').textContent = stage.name;
    document.getElementById('total-levels').textContent = `Total Levels: ${totalLevels}`;

    // Update rebirth button state if needed
    const rebirthBtn = document.getElementById('rebirth-btn');
    const rebirthInfo = document.getElementById('rebirth-info');
    if (canRebirth()) {
        rebirthBtn.disabled = false;
    } else {
        rebirthInfo.textContent = `Reach Ancient stage (100 total levels) to rebirth. Current: ${totalLevels}`;
    }

    // Check if any new activities/growth unlocked
    checkForNewUnlocks();
}

// Check if new activities or growth stats have been unlocked
function checkForNewUnlocks() {
    let hasNewUnlock = false;

    // Check activities
    for (const key of Object.keys(ACTIVITIES)) {
        const item = document.querySelector(`.activity-item[data-key="${key}"]`);
        if (item && item.classList.contains('locked') && isActivityUnlocked(key)) {
            hasNewUnlock = true;
            break;
        }
    }

    // Check growth
    if (!hasNewUnlock) {
        for (const key of Object.keys(GROWTH_STATS)) {
            const item = document.querySelector(`.growth-item[data-key="${key}"]`);
            if (item && item.classList.contains('locked') && isGrowthUnlocked(key)) {
                hasNewUnlock = true;
                break;
            }
        }
    }

    // Only do full render if something new unlocked
    if (hasNewUnlock) {
        renderActivities();
        renderGrowth();
    }
}

function renderActivities() {
    const container = document.getElementById('activity-list');
    container.innerHTML = '';

    const currentActivity = ACTIVITIES[gameState.currentActivity];
    if (currentActivity) {
        document.getElementById('current-activity-name').textContent = currentActivity.name;
        const rate = getActivityRate(gameState.currentActivity);
        document.getElementById('current-activity-rate').textContent = `+${rate.toFixed(1)} ${currentActivity.resource}/sec`;
    }

    for (const [key, activity] of Object.entries(ACTIVITIES)) {
        const unlocked = isActivityUnlocked(key);
        const level = gameState.activityLevels[key] || 0;
        const isActive = gameState.currentActivity === key;

        const div = document.createElement('div');
        div.className = `activity-item ${isActive ? 'active' : ''} ${!unlocked ? 'locked' : ''}`;
        div.setAttribute('data-key', key);

        let reqText = '';
        if (!unlocked && activity.unlockReq) {
            const reqGrowth = GROWTH_STATS[activity.unlockReq.growth];
            reqText = `<span class="item-req">Requires ${reqGrowth.name} Lv.${activity.unlockReq.level}</span>`;
        }

        div.innerHTML = `
            <span class="item-name">${activity.name}</span>
            <span class="item-level">${unlocked ? `Lv. ${level}` : ''} ${reqText}</span>
        `;

        if (unlocked) {
            div.onclick = () => {
                const prevActivity = gameState.currentActivity;
                gameState.currentActivity = key;
                updateActivitySelection(prevActivity, key);
            };
        }

        container.appendChild(div);
    }
}

// Update activity selection without full re-render
function updateActivitySelection(prevKey, newKey) {
    // Remove active class from previous
    if (prevKey) {
        const prevItem = document.querySelector(`.activity-item[data-key="${prevKey}"]`);
        if (prevItem) prevItem.classList.remove('active');
    }

    // Add active class to new
    const newItem = document.querySelector(`.activity-item[data-key="${newKey}"]`);
    if (newItem) newItem.classList.add('active');

    // Update current activity display
    const activity = ACTIVITIES[newKey];
    document.getElementById('current-activity-name').textContent = activity.name;
    const rate = getActivityRate(newKey);
    document.getElementById('current-activity-rate').textContent = `+${rate.toFixed(1)} ${activity.resource}/sec`;

    // Update progress bar display
    const level = gameState.activityLevels[newKey];
    document.getElementById('activity-level').textContent = `Lv. ${level}`;
}

function renderGrowth() {
    const physicalContainer = document.getElementById('physical-growth-list');
    const magicalContainer = document.getElementById('magical-growth-list');
    physicalContainer.innerHTML = '';
    magicalContainer.innerHTML = '';

    const currentGrowth = GROWTH_STATS[gameState.currentGrowth];
    if (currentGrowth) {
        document.getElementById('current-growth-name').textContent = currentGrowth.name;
    }

    for (const [key, growth] of Object.entries(GROWTH_STATS)) {
        const unlocked = isGrowthUnlocked(key);
        const level = gameState.growthLevels[key] || 0;
        const isActive = gameState.currentGrowth === key;
        const multiplier = gameState.rebirthMultipliers[key] || 1;

        const container = growth.category === 'physical' ? physicalContainer : magicalContainer;

        const div = document.createElement('div');
        div.className = `growth-item ${isActive ? 'active' : ''} ${!unlocked ? 'locked' : ''}`;
        div.setAttribute('data-key', key);

        let reqText = '';
        if (!unlocked && growth.unlockReq) {
            const reqGrowth = GROWTH_STATS[growth.unlockReq.growth];
            reqText = `<span class="item-req">Requires ${reqGrowth.name} Lv.${growth.unlockReq.level}</span>`;
        }

        let multiplierText = multiplier > 1 ? ` (${multiplier.toFixed(1)}x)` : '';

        div.innerHTML = `
            <span class="item-name">${growth.name}${multiplierText}</span>
            <span class="item-level">${unlocked ? `Lv. ${level}` : ''} ${reqText}</span>
        `;

        if (unlocked) {
            div.onclick = () => {
                const prevGrowth = gameState.currentGrowth;
                gameState.currentGrowth = key;
                updateGrowthSelection(prevGrowth, key);
            };
        }

        container.appendChild(div);
    }
}

// Update growth selection without full re-render
function updateGrowthSelection(prevKey, newKey) {
    // Remove active class from previous
    if (prevKey) {
        const prevItem = document.querySelector(`.growth-item[data-key="${prevKey}"]`);
        if (prevItem) prevItem.classList.remove('active');
    }

    // Add active class to new
    const newItem = document.querySelector(`.growth-item[data-key="${newKey}"]`);
    if (newItem) newItem.classList.add('active');

    // Update current growth display
    const growth = GROWTH_STATS[newKey];
    document.getElementById('current-growth-name').textContent = growth.name;

    // Update progress bar display
    const level = gameState.growthLevels[newKey];
    const xp = gameState.growthXp[newKey];
    const xpReq = getXpRequired(growth.baseXpReq, level);
    const percent = (xp / xpReq) * 100;
    document.getElementById('growth-progress').style.width = `${percent}%`;
    document.getElementById('growth-level').textContent = `Lv. ${level} → ${level + 1}`;
    document.getElementById('growth-percent').textContent = `${percent.toFixed(0)}%`;
}

function renderLifeStage() {
    const stage = getLifeStage();
    const totalLevels = getTotalLevels();

    document.getElementById('life-stage').textContent = stage.name;
    document.getElementById('total-levels').textContent = `Total Levels: ${totalLevels}`;

    const rebirthBtn = document.getElementById('rebirth-btn');
    const rebirthInfo = document.getElementById('rebirth-info');

    if (canRebirth()) {
        rebirthBtn.disabled = false;

        // Calculate potential multipliers
        let info = 'Rebirth will grant XP multipliers:';
        for (const key of Object.keys(GROWTH_STATS)) {
            const level = gameState.growthLevels[key];
            if (level > 0) {
                const mult = 1 + level / 10;
                info += `<br>${GROWTH_STATS[key].name}: ${mult.toFixed(1)}x`;
            }
        }
        rebirthInfo.innerHTML = info;
    } else {
        rebirthBtn.disabled = true;
        rebirthInfo.textContent = `Reach Ancient stage (100 total levels) to rebirth. Current: ${totalLevels}`;
    }
}

function renderStats() {
    document.getElementById('lifetimes').textContent = gameState.lifetimes;
    document.getElementById('total-days').textContent = formatNumber(gameState.totalDays);

    const multipliersDiv = document.getElementById('multipliers');
    multipliersDiv.innerHTML = '<strong>Rebirth Multipliers:</strong>';

    let hasMultipliers = false;
    for (const [key, mult] of Object.entries(gameState.rebirthMultipliers)) {
        if (mult > 1) {
            hasMultipliers = true;
            const growth = GROWTH_STATS[key];
            multipliersDiv.innerHTML += `
                <div class="multiplier-item">
                    <span>${growth.name}</span>
                    <span class="multiplier-value">${mult.toFixed(1)}x</span>
                </div>
            `;
        }
    }

    if (!hasMultipliers) {
        multipliersDiv.innerHTML += '<div style="color: #7a8a80; margin-top: 10px;">None yet - rebirth to gain multipliers!</div>';
    }
}

function renderAll() {
    renderResources();
    renderTime();
    renderProgressBars();
    renderActivities();
    renderGrowth();
    renderLifeStage();
    renderStats();
}

// ============ SAVE / LOAD ============

function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    } catch (e) {
        console.error('Failed to save:', e);
    }
}

function loadGame() {
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            gameState = { ...gameState, ...data };
        }
    } catch (e) {
        console.error('Failed to load:', e);
    }
}

function resetGame() {
    const input = prompt('Type "RESET" to confirm you want to delete ALL progress:');
    if (input === 'RESET') {
        localStorage.removeItem(SAVE_KEY);
        // Reset state without reloading
        gameState = {
            day: 1,
            year: 1,
            totalDays: 0,
            lifetimes: 1,
            resources: {
                water: 0,
                sunlight: 0,
                nutrients: 0,
                moonlight: 0,
                essence: 0,
            },
            currentActivity: 'absorbWater',
            activityXp: {},
            activityLevels: {},
            currentGrowth: 'rootDepth',
            growthXp: {},
            growthLevels: {},
            rebirthMultipliers: {},
            maxGrowthLevels: {},
        };
        initializeState();
        needsFullRender = true;
    }
}

// ============ INITIALIZATION ============

function init() {
    loadGame();
    initializeState();
    renderAll();

    // Start game loop
    setInterval(gameTick, TICK_RATE);

    // Event listeners
    document.getElementById('reset-btn').onclick = resetGame;
    document.getElementById('rebirth-btn').onclick = doRebirth;
}

// Start the game
init();
