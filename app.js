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
    const desiredState = forceState !== null ? forceState : !isFlashlightOn;

    // If turning ON, ensure we have a track
    if (desiredState && !track) {
        const success = await initFlashlight();
        if (!success) return;
    }

    // If turning OFF and no track, just ensure state is correct
    if (!desiredState && !track) {
        isFlashlightOn = false;
        updateFlashlightUI();
        return;
    }

    try {
        await track.applyConstraints({
            advanced: [{ torch: desiredState }]
        });
        isFlashlightOn = desiredState;

        // Release resources if turning off and not in SOS mode
        if (!desiredState && !isSosActive) {
            track.stop();
            track = null;
        }

        updateFlashlightUI();
    } catch (err) {
        console.error('Error toggling flashlight:', err);
        // If error occurs (e.g. track ended), reset state
        isFlashlightOn = false;
        track = null;
        updateFlashlightUI();
    }
}

function updateFlashlightUI() {
    if (isFlashlightOn) {
        flashlightBtn.classList.add('is-active-custom', 'is-warning');
        flashlightBtn.classList.remove('is-info');
    } else {
        flashlightBtn.classList.remove('is-active-custom', 'is-warning');
        flashlightBtn.classList.add('is-info');
    }
}

// SOS Logic
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
