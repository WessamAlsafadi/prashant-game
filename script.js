// --- 1. SETUP & DOM REFERENCES ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// --- CONSTANTS ---
// --- UPDATED --- These are now our BASE or VIRTUAL resolution.
// All game logic happens in this 800x600 world.
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const PLAYER_SIZE = 50;
const OBJECT_SIZE = 30;

// Colors
const PLAYER_COLOR = '#00FF00';
const OBSTACLE_COLOR = '#FF0000';
const TARGET_COLOR = '#FFD700';

// Set the canvas drawing surface size. This does NOT change.
canvas.width = BASE_WIDTH;
canvas.height = BASE_HEIGHT;

// --- GAME STATE VARIABLES ---
let player, keys, obstacles, targets, score, hearts, gameOver;
let gameSpeed, spawnTimer, spawnInterval;

// --- 2. GAME FUNCTIONS ---

function init() {
    player = {
        x: BASE_WIDTH / 2 - PLAYER_SIZE / 2,
        y: BASE_HEIGHT - PLAYER_SIZE - 20,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        speed: 7
    };
    keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
    obstacles = [];
    targets = [];
    score = 0;
    hearts = 3;
    gameOver = false;
    gameSpeed = 3;
    spawnTimer = 0;
    spawnInterval = 1000;
    gameOverScreen.classList.add('hidden');
    gameLoop();
}

// --- INPUT HANDLING (KEYBOARD & TOUCH) ---

// Keyboard
window.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });
restartButton.addEventListener('click', init);

// --- NEW: Touch Controls ---
function handleTouch(e) {
    e.preventDefault(); // Prevent screen from scrolling
    // Get the position of the canvas on the page
    const rect = canvas.getBoundingClientRect();
    // Calculate the scale factor between the display size and the game size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get the touch coordinates and convert them to our internal game coordinates
    const touchX = (e.touches[0].clientX - rect.left) * scaleX;
    const touchY = (e.touches[0].clientY - rect.top) * scaleY;

    // Move the player to the touch position (centered)
    player.x = touchX - player.width / 2;
    player.y = touchY - player.height / 2;

    // Keep player within bounds
    if (player.x < 0) player.x = 0;
    if (player.x > BASE_WIDTH - player.width) player.x = BASE_WIDTH - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y > BASE_HEIGHT - player.height) player.y = BASE_HEIGHT - player.height;
}

canvas.addEventListener('touchstart', handleTouch, { passive: false });
canvas.addEventListener('touchmove', handleTouch, { passive: false });

// --- GAME LOOP & LOGIC (Mostly Unchanged) ---

let lastTime = 0;
function gameLoop(timestamp = 0) {
    if (gameOver) {
        finalScoreEl.textContent = score;
        gameOverScreen.classList.remove('hidden');
        return;
    }
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    updatePlayer();
    updateObjects(deltaTime);
    checkCollisions();

    drawPlayer();
    drawObjects();
    drawStats();

    requestAnimationFrame(gameLoop);
}

function updatePlayer() {
    // This keyboard logic still works for PC players
    if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x < BASE_WIDTH - player.width) player.x += player.speed;
    if (keys.ArrowUp && player.y > 0) player.y -= player.speed;
    if (keys.ArrowDown && player.y < BASE_HEIGHT - player.height) player.y += player.speed;
}

function updateObjects(deltaTime) {
    spawnTimer += deltaTime;
    if (spawnTimer > spawnInterval) {
        spawnTimer = 0;
        const spawnX = Math.random() * (BASE_WIDTH - OBJECT_SIZE);
        if (Math.random() < 0.7) {
            obstacles.push({ x: spawnX, y: -OBJECT_SIZE, width: OBJECT_SIZE, height: OBJECT_SIZE });
        } else {
            targets.push({ x: spawnX, y: -OBJECT_SIZE, width: OBJECT_SIZE, height: OBJECT_SIZE });
        }
    }

    [...obstacles, ...targets].forEach(obj => { obj.y += gameSpeed; });

    gameSpeed = 3 + Math.floor(score / 5);
    spawnInterval = Math.max(200, 1000 - score * 10);

    obstacles = obstacles.filter(obj => obj.y < BASE_HEIGHT);
    targets = targets.filter(obj => obj.y < BASE_HEIGHT);
}

function checkCollisions() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (isColliding(player, obstacles[i])) {
            hearts--;
            obstacles.splice(i, 1);
            if (hearts <= 0) gameOver = true;
        }
    }
    for (let i = targets.length - 1; i >= 0; i--) {
        if (isColliding(player, targets[i])) {
            score++;
            targets.splice(i, 1);
        }
    }
}

function isColliding(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// --- DRAWING FUNCTIONS (Unchanged) ---

function drawPlayer() {
    ctx.fillStyle = PLAYER_COLOR;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function drawObjects() {
    ctx.fillStyle = OBSTACLE_COLOR;
    obstacles.forEach(obj => ctx.fillRect(obj.x, obj.y, obj.width, obj.height));
    ctx.fillStyle = TARGET_COLOR;
    targets.forEach(obj => ctx.fillRect(obj.x, obj.y, obj.width, obj.height));
}

function drawStats() {
    ctx.fillStyle = 'white';
    ctx.font = '30px "Courier New"';
    ctx.fillText(`Score: ${score}`, 20, 40);
    ctx.fillText(`Hearts: ${hearts}`, BASE_WIDTH - 150, 40);
}

// --- 3. START THE GAME ---
init();
