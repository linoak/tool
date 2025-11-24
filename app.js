// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW registration failed', err));
    });
}

// DOM Elements
const latEl = document.getElementById('latitude');
const longEl = document.getElementById('longitude');
const locErrorEl = document.getElementById('location-error');
const flashlightBtn = document.getElementById('flashlight-btn');
const sosBtn = document.getElementById('sos-btn');
const permissionWarning = document.getElementById('permission-warning');

// State
let track = null;
let isFlashlightOn = false;
let isSosActive = false;
let sosInterval = null;
let sosStep = 0;

// Initialize Geolocation
function initGeolocation() {
    if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition(
            (position) => {
                latEl.textContent = position.coords.latitude.toFixed(6);
                longEl.textContent = position.coords.longitude.toFixed(6);
                locErrorEl.textContent = '';
            },
            (error) => {
                console.error('Geolocation error:', error);
                locErrorEl.textContent = '無法取得位置資訊';
            },
            { enableHighAccuracy: true }
        );
    } else {
        locErrorEl.textContent = '此裝置不支援地理定位';
    }
}

// Initialize Camera/Flashlight
async function initFlashlight() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        track = stream.getVideoTracks()[0];

        // Check if torch is supported
        const capabilities = track.getCapabilities();
        if (!capabilities.torch) {
            console.warn('Torch not supported on this device');
            flashlightBtn.disabled = true;
            sosBtn.disabled = true;
            flashlightBtn.textContent = '不支援手電筒';
            return false;
        }
        return true;
    } catch (err) {
        console.error('Camera permission denied or error:', err);
        permissionWarning.classList.remove('is-hidden');
        return false;
    }
}

// Toggle Flashlight
async function toggleFlashlight(forceState = null) {
    if (!track) {
        const success = await initFlashlight();
        if (!success) return;
    }

    const newState = forceState !== null ? forceState : !isFlashlightOn;

    try {
        await track.applyConstraints({
            advanced: [{ torch: newState }]
        });
        isFlashlightOn = newState;

        // UI Update
        if (isFlashlightOn) {
            flashlightBtn.classList.add('is-active-custom', 'is-warning');
            flashlightBtn.classList.remove('is-info');
        } else {
            flashlightBtn.classList.remove('is-active-custom', 'is-warning');
            flashlightBtn.classList.add('is-info');
        }
    } catch (err) {
        console.error('Error toggling flashlight:', err);
    }
}

// SOS Logic
// SOS Pattern: ... --- ... (Dot=Short, Dash=Long)
// Timing: Dot=1 unit, Dash=3 units, Intra-char gap=1 unit, Inter-char gap=3 units, Word gap=7 units
// Simplified for visual SOS: 
// S (...) : ON(200)-OFF(200)-ON(200)-OFF(200)-ON(200)-OFF(600)
// O (---) : ON(600)-OFF(200)-ON(600)-OFF(200)-ON(600)-OFF(600)
// S (...) : ON(200)-OFF(200)-ON(200)-OFF(200)-ON(200)-OFF(1400)

const SOS_PATTERN = [
    // S
    200, 200, 200, 200, 200, 600,
    // O
    600, 200, 600, 200, 600, 600,
    // S
    200, 200, 200, 200, 200, 1400
];

async function runSosCycle() {
    if (!isSosActive) return;

    let stepIndex = 0;

    const executeStep = async () => {
        if (!isSosActive) {
            await toggleFlashlight(false);
            return;
        }

        // Even index = ON duration, Odd index = OFF duration
        const isLightOn = stepIndex % 2 === 0;
        const duration = SOS_PATTERN[stepIndex];

        await toggleFlashlight(isLightOn);

        stepIndex++;
        if (stepIndex >= SOS_PATTERN.length) {
            stepIndex = 0; // Loop
        }

        if (isSosActive) {
            sosInterval = setTimeout(executeStep, duration);
        }
    };

    executeStep();
}

function toggleSos() {
    if (isSosActive) {
        // Stop SOS
        isSosActive = false;
        clearTimeout(sosInterval);
        toggleFlashlight(false);

        sosBtn.classList.remove('sos-active');
        sosBtn.textContent = 'SOS 訊號';
        flashlightBtn.disabled = false;
    } else {
        // Start SOS
        // Turn off flashlight if it's on normally
        if (isFlashlightOn) toggleFlashlight(false);

        isSosActive = true;
        flashlightBtn.disabled = true; // Disable manual flashlight while SOS is active

        sosBtn.classList.add('sos-active');
        sosBtn.textContent = '停止 SOS';

        runSosCycle();
    }
}

// Event Listeners
flashlightBtn.addEventListener('click', () => toggleFlashlight());
sosBtn.addEventListener('click', toggleSos);

// Close warning
permissionWarning.querySelector('.delete').addEventListener('click', () => {
    permissionWarning.classList.add('is-hidden');
});

// Init
initGeolocation();
