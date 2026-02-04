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

    // Rebirth bonus: 10% more XP per level from previous life
    xpMultiplier: 1,
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

function getLifespan() {
    // Base lifespan of 1 year (365 days) + logarithmic bonus from nutrients
    // Logarithmic scaling: early nutrients matter more, diminishing returns at high amounts
    const nutrients = gameState.resources.nutrients;
    const nutrientBonus = nutrients > 0 ? Math.floor(Math.log10(nutrients + 1) * 200) : 0;
    return 365 + nutrientBonus;
}

function getCurrentAge() {
    // Total days lived this life
    return Math.floor((gameState.year - 1) * 365 + gameState.day);
}

function isLifespanExceeded() {
    return getCurrentAge() >= getLifespan() && !deathModalShowing;
}

let deathModalShowing = false;

function showDeathModal() {
    if (deathModalShowing) return;
    deathModalShowing = true;

    const age = getCurrentAge();
    const modal = document.getElementById('death-modal');
    const ageSpan = document.getElementById('death-age');

    ageSpan.textContent = age;
    modal.classList.remove('hidden');
}

function hideDeathModal() {
    const modal = document.getElementById('death-modal');
    modal.classList.add('hidden');
    deathModalShowing = false;
    doRebirth();
}

function doRebirth() {
    // Calculate XP multiplier for next life: 10% more XP per total level at death
    const totalLevels = getTotalLevels();
    gameState.xpMultiplier = 1 + (totalLevels * 0.10);

    // Reset for new life
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

    // Check for death (lifespan exceeded)
    if (isLifespanExceeded()) {
        showDeathModal();
        return; // Skip rest of tick, wait for modal
    }

    // Activity progress
    if (gameState.currentActivity && isActivityUnlocked(gameState.currentActivity)) {
        const rate = getActivityRate(gameState.currentActivity);
        const resource = ACTIVITIES[gameState.currentActivity].resource;

        // Add resources
        gameState.resources[resource] += rate * deltaTime;

        // Gain activity XP (water boosts by 0.1% per unit, non-compounding)
        // Also apply xpMultiplier from previous life (10% per level at death)
        const waterBonus = 1 + gameState.resources.water * 0.001;
        gameState.activityXp[gameState.currentActivity] += deltaTime * 10 * waterBonus * gameState.xpMultiplier;

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

        // Gain growth XP (sunlight boosts by 0.1% per unit)
        // Also apply xpMultiplier from previous life (10% per level at death)
        const sunlightBonus = 1 + gameState.resources.sunlight * 0.001;
        gameState.growthXp[gameState.currentGrowth] += deltaTime * 10 * sunlightBonus * gameState.xpMultiplier;

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
        updateLifespanDisplay();
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
    const level = gameState.growthLevels[growthKey];

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

    // Update lifespan display
    updateLifespanDisplay();

    // Check if any new activities/growth unlocked
    checkForNewUnlocks();
}

// Update lifespan display without full re-render
function updateLifespanDisplay() {
    const lifespan = getLifespan();
    const currentAge = getCurrentAge();
    const daysRemaining = Math.max(0, lifespan - currentAge);

    const rebirthInfo = document.getElementById('rebirth-info');
    rebirthInfo.innerHTML = `<strong>Lifespan:</strong> ${currentAge} / ${lifespan} days (${daysRemaining} remaining)`;
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

        const container = growth.category === 'physical' ? physicalContainer : magicalContainer;

        const div = document.createElement('div');
        div.className = `growth-item ${isActive ? 'active' : ''} ${!unlocked ? 'locked' : ''}`;
        div.setAttribute('data-key', key);

        let reqText = '';
        if (!unlocked && growth.unlockReq) {
            const reqGrowth = GROWTH_STATS[growth.unlockReq.growth];
            reqText = `<span class="item-req">Requires ${reqGrowth.name} Lv.${growth.unlockReq.level}</span>`;
        }

        div.innerHTML = `
            <span class="item-name">${growth.name}</span>
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

    // Hide manual rebirth button
    document.getElementById('rebirth-btn').style.display = 'none';

    // Show lifespan info
    updateLifespanDisplay();
}

function renderStats() {
    document.getElementById('lifetimes').textContent = gameState.lifetimes;
    document.getElementById('total-days').textContent = formatNumber(gameState.totalDays);

    // Show XP multiplier from rebirth
    const multipliers = document.getElementById('multipliers');
    if (gameState.xpMultiplier > 1) {
        multipliers.style.display = 'block';
        multipliers.innerHTML = `<div class="stat"><span class="stat-name">XP Bonus</span><span class="stat-value">${((gameState.xpMultiplier - 1) * 100).toFixed(0)}%</span></div>`;
    } else {
        multipliers.style.display = 'none';
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
            xpMultiplier: 1,
        };
        initializeState();
        needsFullRender = true;
    }
}

// ============ SAVE EXPORT/IMPORT ============

let saveBuffer = '';
let saveModalShowing = false;

function createSaveModal() {
    const modal = document.createElement('div');
    modal.id = 'save-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Save Management</h2>
            <p style="margin-bottom: 15px; color: #aaa;">Export your save to back it up, or import a previous save.</p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button id="export-save-btn" style="padding: 12px; font-size: 1rem; cursor: pointer; background: #4a9; border: none; border-radius: 8px; color: white;">📥 Export Save</button>
                <button id="import-save-btn" style="padding: 12px; font-size: 1rem; cursor: pointer; background: #49a; border: none; border-radius: 8px; color: white;">📤 Import Save</button>
                <input type="file" id="import-file-input" accept=".json" style="display: none;">
                <button id="close-save-modal" style="padding: 12px; font-size: 1rem; cursor: pointer; background: #666; border: none; border-radius: 8px; color: white; margin-top: 10px;">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('close-save-modal').onclick = hideSaveModal;
    document.getElementById('export-save-btn').onclick = exportSave;
    document.getElementById('import-save-btn').onclick = () => document.getElementById('import-file-input').click();
    document.getElementById('import-file-input').onchange = importSave;
}

function showSaveModal() {
    if (saveModalShowing) return;
    saveModalShowing = true;
    document.getElementById('save-modal').classList.remove('hidden');
}

function hideSaveModal() {
    document.getElementById('save-modal').classList.add('hidden');
    saveModalShowing = false;
}

function exportSave() {
    const saveData = localStorage.getItem(SAVE_KEY);
    if (!saveData) {
        alert('No save data found!');
        return;
    }
    const blob = new Blob([saveData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plant-life-save-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importSave(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
            alert('Save imported successfully! Refreshing...');
            location.reload();
        } catch (err) {
            alert('Invalid save file!');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function handleSaveKeypress(e) {
    saveBuffer = (saveBuffer + e.key).slice(-4);
    if (saveBuffer.toLowerCase() === 'save') {
        showSaveModal();
        saveBuffer = '';
    }
}

// ============ INITIALIZATION ============

function init() {
    loadGame();
    initializeState();
    renderAll();
    createSaveModal();

    // Start game loop
    setInterval(gameTick, TICK_RATE);

    // Event listeners
    document.getElementById('reset-btn').onclick = resetGame;
    document.getElementById('death-continue-btn').onclick = hideDeathModal;
    document.addEventListener('keydown', handleSaveKeypress);
}

// Start the game
init();
