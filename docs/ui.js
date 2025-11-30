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
    { id: 'anti_establishment', name: 'Anti Establishment', description: 'Destroyed all houses on the planet', threshold: 5, type: 'house_all', unlocked: false }
];

// --- UI Elements ---
const scoreValue = document.getElementById('score-value');
const progressBarFill = document.getElementById('progress-bar-fill');
const nextAchievementName = document.getElementById('next-achievement-name');
const achievementsList = document.getElementById('achievements-list');
const instructions = document.getElementById('instructions');
const touchInstructions = document.getElementById('touch-instructions');
const crosshair = document.getElementById('crosshair');
const mobilePauseBtn = document.getElementById('mobile-pause-btn');
const joystickContainer = document.getElementById('joystick-container');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const shareBtn = document.getElementById('share-btn');
const handLeft = document.getElementById('hand-left');
const handRight = document.getElementById('hand-right');

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
        touchInstructions.style.opacity = 0;
        mobilePauseBtn.textContent = '⏸';
        if (isTouchDevice) {
            crosshair.style.opacity = 0;
        } else {
            crosshair.style.opacity = 1;
        }
    } else {
        if (!isTouchDevice) instructions.style.opacity = 1;
        else touchInstructions.style.opacity = 1;
        
        crosshair.style.opacity = 0;
        mobilePauseBtn.textContent = '▶';
        
        // Reset hands
        handLeft.classList.remove('active');
        handRight.classList.remove('active');
    }
}

function updateGamification(playerDist, isTouchingGrass) {
    // Combine player movement and hand movement
    const totalFrameDist = (isTouchingGrass ? playerDist : 0) + handMovementAccumulator;
    
    // Reset accumulator after using it
    resetHandMovement();

    if (totalFrameDist > 0 && isTouchingGrass) {
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
    if (tapAch && !tapAch.unlocked && grassTapCount >= tapAch.threshold) {
        tapAch.unlocked = true;
        addAchievementToUI(tapAch);
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
}

function initUI() {
    // Mobile Detection & Setup
    if (isTouchDevice) {
        instructions.style.display = 'none';
        touchInstructions.style.display = 'block';
        joystickContainer.style.display = 'block';
        mobilePauseBtn.style.display = 'flex';
    }

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
window.initUI = initUI;
