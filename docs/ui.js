// --- State ---
const isTouchDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) && (window.innerWidth <= 1024);
const moveState = { forward: false, backward: false, left: false, right: false };
const joystickDirection = new THREE.Vector2();
const activeTouches = new Map();
let handMovementAccumulator = 0;
let isLocked = false;
let joystickActive = false;
let joystickTouchId = null;

// Expose to global scope
window.isTouchDevice = isTouchDevice;
window.moveState = moveState;
window.joystickDirection = joystickDirection;
window.activeTouches = activeTouches;
window.handMovementAccumulator = handMovementAccumulator;
window.isLocked = isLocked;
window.joystickActive = joystickActive;
window.joystickTouchId = joystickTouchId;

// --- Gamification State ---
let totalDistance = 0;
let grassTapCount = 0;
let mushroomCount = 0;
let totalCollectedMushrooms = 0;
let jumpCount = 0;
let boostActive = false;
let boostEndTime = 0;
let boostDuration = 0;
let currentSpeedMultiplier = 1.0;
const achievements = [
    { id: 'first_touch', name: 'First Touch', description: 'Touched grass for the first time', threshold: 0.1, unlocked: false },
    { id: 'tap_master', name: 'Not into stroking grass', description: 'Tapped grass 5 times', threshold: 5, type: 'taps', unlocked: false },
    { id: 'sprout', name: 'Sprout', description: '25m of grass touched', threshold: 25, unlocked: false },
    { id: 'seedling', name: 'Seedling', description: '50m of grass touched', threshold: 50, unlocked: false },
    { id: 'gardener', name: 'Gardener', description: '100m of grass touched', threshold: 100, unlocked: false },
    { id: 'hiker', name: 'Hiker', description: '200m of grass touched', threshold: 200, unlocked: false },
    { id: 'circumnavigator', name: 'Circumnavigator', description: '314m of grass touched (approx. circle)', threshold: 314, unlocked: false },
    { id: 'explorer', name: 'Explorer', description: '500m of grass touched', threshold: 500, unlocked: false },
    { id: 'wanderer', name: 'Wanderer', description: '750m of grass touched', threshold: 750, unlocked: false },
    { id: 'milestone_1k', name: '1 Kilometer', description: '1,000m of grass touched', threshold: 1000, unlocked: false },
    { id: 'green_thumb', name: 'Green Thumb', description: '1,500m of grass touched', threshold: 1500, unlocked: false },
    { id: 'nature_lover', name: 'Nature Lover', description: '2,000m of grass touched', threshold: 2000, unlocked: false },
    { id: 'terraformer', name: 'Terraformer', description: '2,500m of grass touched', threshold: 2500, unlocked: false },
    { id: 'eco_warrior', name: 'Eco-Warrior', description: '3,000m of grass touched', threshold: 3000, unlocked: false },
    { id: 'trail_blazer', name: 'Trail Blazer', description: '4,000m of grass touched', threshold: 4000, unlocked: false },
    { id: 'milestone_5k', name: '5 Kilometers', description: '5,000m of grass touched', threshold: 5000, unlocked: false },
    { id: 'adventurer', name: 'Adventurer', description: '6,500m of grass touched', threshold: 6500, unlocked: false },
    { id: 'nomad', name: 'Nomad', description: '8,000m of grass touched', threshold: 8000, unlocked: false },
    { id: 'grass_god', name: 'Grass God', description: '10,000m of grass touched', threshold: 10000, unlocked: false },
    { id: 'legend', name: 'Legend', description: '12,500m of grass touched', threshold: 12500, unlocked: false },
    { id: 'milestone_15k', name: '15 Kilometers', description: '15,000m of grass touched', threshold: 15000, unlocked: false },
    { id: 'ultra_runner', name: 'Ultra Runner', description: '18,000m of grass touched', threshold: 18000, unlocked: false },
    { id: 'half_marathon', name: 'Half Marathon', description: '21,097m of grass touched', threshold: 21097, unlocked: false },
    { id: 'endurance_master', name: 'Endurance Master', description: '25,000m of grass touched', threshold: 25000, unlocked: false },
    { id: 'milestone_30k', name: '30 Kilometers', description: '30,000m of grass touched', threshold: 30000, unlocked: false },
    { id: 'iron_will', name: 'Iron Will', description: '35,000m of grass touched', threshold: 35000, unlocked: false },
    { id: 'almost_there', name: 'Almost There', description: '40,000m of grass touched', threshold: 40000, unlocked: false },
    { id: 'marathon', name: 'Marathon', description: '42,195m of grass touched', threshold: 42195, unlocked: false, special: 'marathon' },
    { id: 'house_1', name: 'Breaking and Entering', description: 'Destroyed a house', threshold: 1, type: 'house', unlocked: false },
    { id: 'house_2', name: 'Property Damage', description: 'Destroyed 2 houses', threshold: 2, type: 'house', unlocked: false },
    { id: 'house_3', name: 'Vandalism', description: 'Destroyed 3 houses', threshold: 3, type: 'house', unlocked: false },
    { id: 'house_4', name: 'Arsonist', description: 'Destroyed 4 houses', threshold: 4, type: 'house', unlocked: false },
    { id: 'house_5', name: 'Demolition Expert', description: 'Destroyed 5 houses', threshold: 5, type: 'house', unlocked: false },
    { id: 'anti_establishment', name: 'Anti Establishment', description: 'Destroyed all houses on the planet', threshold: 5, type: 'house_all', unlocked: false },
    { id: 'forager', name: 'Forager', description: 'Collected 1 mushroom', threshold: 1, type: 'mushroom', unlocked: false },
    { id: 'mycologist', name: 'Mycologist', description: 'Collected 10 mushrooms', threshold: 10, type: 'mushroom', unlocked: false },
    { id: 'psychonaut', name: 'Psychonaut', description: 'Collected 50 mushrooms', threshold: 50, type: 'mushroom', unlocked: false },
    { id: 'enlightened', name: 'Enlightened', description: 'Collected 100 mushrooms', threshold: 100, type: 'mushroom', unlocked: false },
    { id: 'fungus_among_us', name: 'Fungus Among Us', description: 'Collected 200 mushrooms', threshold: 200, type: 'mushroom', unlocked: false },
    { id: 'mycelium_network', name: 'Mycelium Network', description: 'Collected 500 mushrooms', threshold: 500, type: 'mushroom', unlocked: false },
    { id: 'leap_of_faith', name: 'Leap of Faith', description: 'Jumped for the first time', threshold: 1, type: 'jump', unlocked: false },
    { id: 'grasshopper', name: 'Grasshopper', description: 'Jumped 50 times', threshold: 50, type: 'jump', unlocked: false },
    { id: 'moon_walker', name: 'Moon Walker', description: 'Jumped 100 times', threshold: 100, type: 'jump', unlocked: false },
    { id: 'orbital', name: 'Orbital', description: 'Jumped 500 times', threshold: 500, type: 'jump', unlocked: false },
    { id: 'fast_lane', name: 'Fast Lane', description: 'Reached 1.5x speed', threshold: 1.5, type: 'speed', unlocked: false },
    { id: 'supersonic', name: 'Supersonic', description: 'Reached 2.0x speed', threshold: 2.0, type: 'speed', unlocked: false },
    { id: 'warp_speed', name: 'Warp Speed', description: 'Reached 3.0x speed', threshold: 3.0, type: 'speed', unlocked: false },
    { id: 'completionist', name: 'Really Needs to Step Outside', description: 'Completed all achievements', threshold: 1, type: 'special', unlocked: false, special: 'legendary' }
];

let confettiActive = false;
window.confettiActive = false;

// --- UI Elements ---
const scoreValue = document.getElementById('score-value');
const progressBarFill = document.getElementById('progress-bar-fill');
const nextAchievementName = document.getElementById('next-achievement-name');
const achievementsList = document.getElementById('achievements-list');
const achievementCounter = document.getElementById('achievement-counter');
const instructions = document.getElementById('instructions');
const crosshair = document.getElementById('crosshair');
const mobilePauseBtn = document.getElementById('mobile-pause-btn');
const joystickContainer = document.getElementById('joystick-container');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const shareBtn = document.getElementById('share-btn');
const handLeft = document.getElementById('hand-left');
const handRight = document.getElementById('hand-right');
const mushroomCountDisplay = document.getElementById('mushroom-count');
const useMushroomsBtn = document.getElementById('use-mushrooms-btn');
const mushroomScoreContainer = document.getElementById('mushroom-score-container');
const boostTimerContainer = document.getElementById('boost-timer-container');
const boostTimerValue = document.getElementById('boost-timer-value');
const boostMultiplierValue = document.getElementById('boost-multiplier-value');
// medidationOverlay removed

// --- Functions ---

function addHandMovement(amount) {
    handMovementAccumulator += amount;
    window.handMovementAccumulator = handMovementAccumulator; // Update global
}

function resetHandMovement() {
    handMovementAccumulator = 0;
    window.handMovementAccumulator = 0;
}

function setIsLocked(locked) {
    isLocked = locked;
    window.isLocked = locked; // Update global
    if (isLocked) {
        instructions.style.opacity = 0;
        mobilePauseBtn.textContent = '⏸';
        if (isTouchDevice) {
            crosshair.style.opacity = 0;
        } else {
            crosshair.style.opacity = 1;
        }
    } else {
        instructions.style.opacity = 1;
        
        crosshair.style.opacity = 0;
        mobilePauseBtn.textContent = '▶';
        
        // Reset hands
        handLeft.classList.remove('active');
        handRight.classList.remove('active');
    }
    
    if (locked && window.TipManager) {
        window.TipManager.onStart();
    }
}

function updateGamification(playerDist, isTouchingGrass) {
    // Combine player movement and hand movement
    const totalFrameDist = (isTouchingGrass ? playerDist : 0) + handMovementAccumulator;
    
    // Reset accumulator after using it
    resetHandMovement();

    if (totalFrameDist > 0 && isTouchingGrass) {
        if (window.TipManager) {
            window.TipManager.onInput('touch');
            if (playerDist > 0) window.TipManager.onInput('move_touch');
        }
        totalDistance += totalFrameDist;
        scoreValue.textContent = Math.floor(totalDistance) + 'm';

        let nextAch = achievements.find(a => !a.unlocked && !a.type);
        if (nextAch) {
            nextAchievementName.textContent = nextAch.name;
            let prevThreshold = 0;
            const prevAchIndex = achievements.indexOf(nextAch) - 1;
            if (prevAchIndex >= 0) prevThreshold = achievements[prevAchIndex].threshold;
            
            // Logarithmic progress bar for better feel
            const progress = Math.min(100, ((totalDistance - prevThreshold) / (nextAch.threshold - prevThreshold)) * 100);
            progressBarFill.style.width = progress + '%';

            if (totalDistance >= nextAch.threshold) {
                nextAch.unlocked = true;
                addAchievementToUI(nextAch);
            }
        } else {
            nextAchievementName.textContent = "All Unlocked!";
            progressBarFill.style.width = '100%';
        }
    }
}

function checkFirstTouch() {
    const firstTouch = achievements.find(a => a.id === 'first_touch');
    if (firstTouch && !firstTouch.unlocked) {
        firstTouch.unlocked = true;
        addAchievementToUI(firstTouch);
    }
}

function incrementGrassTaps() {
    grassTapCount++;
    const tapAch = achievements.find(a => a.id === 'tap_master');
    if (tapAch && !tapAch.unlocked && grassTapCount >= tapAch.threshold) {
        tapAch.unlocked = true;
        addAchievementToUI(tapAch);
    }
}

function collectMushroom() {
    mushroomCount++;
    totalCollectedMushrooms++;
    mushroomCountDisplay.textContent = mushroomCount;
    
    // Check achievements
    achievements.filter(a => a.type === 'mushroom' && !a.unlocked).forEach(ach => {
        if (totalCollectedMushrooms >= ach.threshold) {
            ach.unlocked = true;
            addAchievementToUI(ach);
        }
    });

    if (mushroomCount >= 5) {
        useMushroomsBtn.style.display = 'block';
    }
}

function activateSpeedBoost() {
    if (mushroomCount <= 0) return;

    // Calculate boost parameters with diminishing returns
    const cappedCount = Math.min(mushroomCount, 10);
    const excessCount = Math.max(0, mushroomCount - 10);

    // Initial: 1s per mushroom. Excess: 0.05s (1/20th) per mushroom.
    let duration = (cappedCount * 1.0) + (excessCount * 0.05);
    
    // Initial: +0.1x per mushroom. Excess: +0.005x (1/20th) per mushroom.
    const multiplier = 1.0 + (cappedCount * 0.1) + (excessCount * 0.005);

    // Hard cap duration at 10 seconds
    duration = Math.min(duration, 10.0);

    boostDuration = duration;
    boostEndTime = performance.now() / 1000 + boostDuration;
    currentSpeedMultiplier = multiplier;
    boostActive = true;

    // Reset mushrooms but keep track for boost
    const countUsed = mushroomCount;
    mushroomCount = 0;
    mushroomCountDisplay.textContent = 0;
    useMushroomsBtn.style.display = 'none';

    // UI Updates
    if (mushroomScoreContainer) mushroomScoreContainer.style.display = 'none';
    if (boostTimerContainer) boostTimerContainer.style.display = 'flex';
    
    if (boostMultiplierValue) boostMultiplierValue.textContent = multiplier.toFixed(1) + "x Speed";
    if (boostTimerValue) boostTimerValue.textContent = boostDuration.toFixed(1) + "s";
    if (boostTimerValue) boostTimerValue.style.color = "#fff"; // Reset color
    
    console.log(`Boost activated! Count: ${countUsed}, Duration: ${boostDuration}s, Multiplier: ${multiplier}x`);

    // Check Speed Achievements
    achievements.filter(a => a.type === 'speed' && !a.unlocked).forEach(ach => {
        if (multiplier >= ach.threshold) {
            ach.unlocked = true;
            addAchievementToUI(ach);
        }
    });
    
    // Clear mushrooms from world
    if (window.resetMushrooms) window.resetMushrooms();
}

function updateBoostState() {
    if (!boostActive) return;

    const now = performance.now() / 1000;
    const remaining = boostEndTime - now;

    if (remaining <= 0) {
        // Boost Over
        boostActive = false;
        currentSpeedMultiplier = 1.0;
        
        // UI Reset
        mushroomScoreContainer.style.display = 'flex';
        boostTimerContainer.style.display = 'none';
    } else {
        // Update Progress
        if (boostTimerValue) {
            boostTimerValue.textContent = remaining.toFixed(1) + "s";
            // Flash red when low
            if (remaining < 3.0) {
                const isRed = Math.floor(now * 4) % 2 === 0;
                boostTimerValue.style.color = isRed ? "#ff0000" : "#fff";
            }
        }
    }
}

function getSpeedMultiplier() {
    return currentSpeedMultiplier;
}

function incrementJumpCount() {
    jumpCount++;
    const jumpAch = achievements.filter(a => a.type === 'jump' && !a.unlocked);
    jumpAch.forEach(ach => {
        if (jumpCount >= ach.threshold) {
            ach.unlocked = true;
            addAchievementToUI(ach);
        }
    });
}

function updateAchievementCounter() {
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalCount = achievements.length;
    
    if (achievementCounter) {
        achievementCounter.textContent = `${unlockedCount} of ${totalCount} Achievements`;
    }
}

function checkCompletionist() {
    const allRegularUnlocked = achievements.every(a => a.id === 'completionist' || a.unlocked);
    if (allRegularUnlocked) {
        const completionistAch = achievements.find(a => a.id === 'completionist');
        if (completionistAch && !completionistAch.unlocked) {
            completionistAch.unlocked = true;
            addAchievementToUI(completionistAch);
            confettiActive = true;
            window.confettiActive = true; // Sync global
        }
    }
}

function unlockAchievement(id) {
    const ach = achievements.find(a => a.id === id);
    if (ach && !ach.unlocked) {
        ach.unlocked = true;
        addAchievementToUI(ach);
    }
}

function addAchievementToUI(achievement) {
    const div = document.createElement('div');
    div.className = 'achievement-item';
    if (achievement.special) div.classList.add(achievement.special);
    
    div.innerHTML = `
        <span class="achievement-icon">🏆</span> 
        <div class="achievement-text">
            <span class="achievement-name">${achievement.name}</span>
            <span class="achievement-desc">${achievement.description}</span>
        </div>
    `;
    achievementsList.insertBefore(div, achievementsList.firstChild);
    
    // Auto-scroll to top
    achievementsList.scrollTop = 0;
    
    updateAchievementCounter();
    checkCompletionist();
}

function initUI() {
    // Mobile Detection & Setup
    if (isTouchDevice) {
        // instructions.style.display = 'none'; // No longer hiding, using CSS
        joystickContainer.style.display = 'block';
        mobilePauseBtn.style.display = 'flex';
    }
    
    updateAchievementCounter();

    // Share Button
    shareBtn.addEventListener('click', async () => {
        const distance = Math.floor(totalDistance);
        const distanceKm = (distance / 1000).toFixed(2);
        const shareText = `I've touched ${distance}m (${distanceKm}km) of grass today! 🌱\n\nhttps://jatacid.github.io/time-to-touch-grass/`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Time to Touch Grass',
                    text: shareText
                });
            } catch (err) {
                if (err.name !== 'AbortError') console.error('Share failed:', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareText);
                const originalText = shareBtn.innerHTML;
                shareBtn.innerHTML = '✓ Copied!';
                setTimeout(() => { shareBtn.innerHTML = originalText; }, 2000);
            } catch (err) {
                console.error('Copy failed:', err);
                alert('Share text:\n\n' + shareText);
            }
        }
    });

    // Mobile Pause Button
    mobilePauseBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLocked) {
            document.exitPointerLock(); // This triggers pointerlockchange -> setIsLocked(false)
            // For mobile where pointer lock might not be fully supported/used in same way:
            setIsLocked(false);
        } else {
            // Resume
            setIsLocked(true);
        }
    });

    // Joystick Logic
    const maxJoystickDistance = 40;
    const joystickCenter = new THREE.Vector2();

    joystickBase.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (joystickTouchId === null) {
            const touch = e.changedTouches[0];
            joystickTouchId = touch.identifier;
            joystickActive = true;
            window.joystickActive = true; // Sync global

            const rect = joystickBase.getBoundingClientRect();
            joystickCenter.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
    }, { passive: false });

    joystickBase.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;

        for (let touch of e.changedTouches) {
            if (touch.identifier === joystickTouchId) {
                const dx = touch.clientX - joystickCenter.x;
                const dy = touch.clientY - joystickCenter.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const clampedDistance = Math.min(distance, maxJoystickDistance);
                const angle = Math.atan2(dy, dx);

                const knobX = Math.cos(angle) * clampedDistance;
                const knobY = Math.sin(angle) * clampedDistance;
                joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

                if (distance > 5) {
                    joystickDirection.set(dx / distance, dy / distance);
                    const threshold = 0.5;
                    moveState.forward = joystickDirection.y < -threshold;
                    moveState.backward = joystickDirection.y > threshold;
                    moveState.left = false;
                    moveState.right = false;

                    // Tip Hook
                    if (window.TipManager && moveState.forward) window.TipManager.onInput('move'); // Only count forward movement as intentional 'moving' for tip purposes? Or any movement. Prompt says "Try walking forward". Assuming any movement is fine to clear "hasMoved".
                    if (window.TipManager && (moveState.forward || moveState.backward || moveState.left || moveState.right)) window.TipManager.onInput('move');
                } else {
                    joystickDirection.set(0, 0);
                    moveState.forward = false;
                    moveState.backward = false;
                    moveState.left = false;
                    moveState.right = false;
                }
                break;
            }
        }
    }, { passive: true });

    const resetJoystick = () => {
        joystickActive = false;
        window.joystickActive = false; // Sync global
        joystickTouchId = null;
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        joystickDirection.set(0, 0);
        moveState.forward = false;
        moveState.backward = false;
        moveState.left = false;
        moveState.right = false;
    };

    joystickBase.addEventListener('touchend', (e) => {
        for (let touch of e.changedTouches) {
            if (touch.identifier === joystickTouchId) {
                resetJoystick();
                break;
            }
        }
    });

    joystickBase.addEventListener('touchcancel', resetJoystick);

    // Touch Interaction (Right Side)
    document.body.addEventListener('touchstart', (e) => {
        if (!isTouchDevice) return;

        if (!isLocked) {
            // Auto-lock on first touch
            setIsLocked(true);
        }

        for (let touch of e.changedTouches) {
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target === joystickBase || target === joystickKnob || joystickBase.contains(target) ||
                target === mobilePauseBtn || mobilePauseBtn.contains(target)) {
                continue;
            }

            if (touch.clientX > window.innerWidth / 2) {
                activeTouches.set(touch.identifier, {
                    x: touch.clientX,
                    y: touch.clientY,
                    isRight: true
                });
            }
        }
    }, { passive: true });

    document.body.addEventListener('touchmove', (e) => {
        if (!isTouchDevice || !isLocked) return;

        for (let touch of e.changedTouches) {
            if (activeTouches.has(touch.identifier)) {
                const prev = activeTouches.get(touch.identifier);
                const dx = touch.clientX - prev.x;
                const dy = touch.clientY - prev.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                // Accumulate movement (scaled)
                addHandMovement(dist * 0.01);

                activeTouches.set(touch.identifier, {
                    x: touch.clientX,
                    y: touch.clientY,
                    isRight: prev.isRight
                });
            }
        }
    }, { passive: true });

    const removeTouches = (e) => {
        for (let touch of e.changedTouches) {
            activeTouches.delete(touch.identifier);
        }
    };

    document.body.addEventListener('touchend', removeTouches, { passive: true });
    document.body.addEventListener('touchcancel', removeTouches, { passive: true });

    // Prevent context menu
    document.body.addEventListener('contextmenu', (e) => {
        if (isTouchDevice) e.preventDefault();
    });

    // Window Resize (UI part)
    window.addEventListener('resize', () => {
        document.body.style.height = window.innerHeight + 'px';
    });
}

// Expose functions to global scope
window.addHandMovement = addHandMovement;
window.resetHandMovement = resetHandMovement;
window.setIsLocked = setIsLocked;
window.updateGamification = updateGamification;
window.checkFirstTouch = checkFirstTouch;
window.incrementGrassTaps = incrementGrassTaps;
window.unlockAchievement = unlockAchievement;
window.collectMushroom = collectMushroom;
window.updateBoostState = updateBoostState;
window.getSpeedMultiplier = getSpeedMultiplier;
window.incrementJumpCount = incrementJumpCount;
window.initUI = initUI;

// Event Listener for Button
document.addEventListener('DOMContentLoaded', () => {
    if (useMushroomsBtn) {
        useMushroomsBtn.addEventListener('click', activateSpeedBoost);
    }
});

// Key Listener for 'X'
document.addEventListener('keydown', (e) => {
    if ((e.code === 'KeyX' || e.key === 'x') && mushroomCount >= 5) {
        activateSpeedBoost();
    }
});

// --- Tip Manager ---
const TipManager = {
    activeTime: 0, // ms
    hasMoved: false,
    hasTouchedGrass: false,
    hasMovedAndTouched: false,
    hasUsedBothButtons: false,
    
    // Time thresholds (ms)
    walkDelay: 4000,
    touchDelay: 12000,
    moveTouchDelay: 20000,
    bothButtonsDelay: 45000,
    
    tipsShown: new Set(),
    currentTip: null,
    
    init() {
        this.el = document.getElementById('tip-text');
        // Check every second
        setInterval(() => this.update(), 1000);
    },
    
    onStart() {
        // No-op now, just tracking active time
    },
    
    onInput(type) {
        if (type === 'move') this.hasMoved = true;
        if (type === 'touch') this.hasTouchedGrass = true;
        if (type === 'move_touch') this.hasMovedAndTouched = true;
        if (type === 'both_buttons') this.hasUsedBothButtons = true;
    },
    
    show(id, text, duration = 4000) {
        if (this.tipsShown.has(id)) return;
        if (this.currentTip) return; // One at a time
        
        this.tipsShown.add(id);
        this.currentTip = id;
        
        this.el.textContent = text;
        this.el.classList.add('visible');
        
        setTimeout(() => {
            this.el.classList.remove('visible');
            this.currentTip = null;
        }, duration);
    },
    
    update() {
        if (!window.isLocked) return;
        
        this.activeTime += 1000;
        const elapsed = this.activeTime;
        
        // 1. Walk Forward
        if (elapsed > this.walkDelay && !this.hasMoved) {
            this.show('walk', "Try walking forward using the 'up' arrow or the joystick");
        }
        
        // 2. Touch Grass (Click & Drag)
        if (elapsed > this.touchDelay && !this.hasTouchedGrass) {
            this.show('touch', "Try clicking and dragging to touch the grass");
        }
        
        // 3. Move and Touch
        // If they have moved a bunch but haven't touched grass while moving
        if (elapsed > this.moveTouchDelay && this.hasMoved && !this.hasMovedAndTouched) {
            this.show('move_touch', "Try moving and touching the grass as you go");
        }
        
        // 4. Both Buttons
        if (elapsed > this.bothButtonsDelay && !this.hasUsedBothButtons) {
            this.show('both_buttons', "You can use both left and right mouse buttons at the same time for maximum grass coverage");
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    TipManager.init();
});

// Expose checks
window.TipManager = TipManager;
