// --- 1. SETUP & DOM REFERENCES ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// --- CONSTANTS ---
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
canvas.width = BASE_WIDTH;
canvas.height = BASE_HEIGHT;

const PLAYER_SIZE = 70;
const ENEMY_SIZE = 65;
const BULLET_SIZE = { width: 5, height: 15 };

// --- GAME STATE VARIABLES ---
let player, keys, enemies, bullets, score, hearts, gameOver;
let gameSpeed, spawnTimer, spawnInterval;
let images = {}; // Object to hold all our loaded images

// ------------------------------------------------------------------
// --- ‼️ IMAGE SETUP - THIS IS WHERE YOU ADD YOUR IMAGES ‼️ ---
// ------------------------------------------------------------------
// To use your own images, place them in the same folder as your
// HTML file and change the file names below.
const IMAGE_ASSETS = {
    player: 'player.png', // Create a 'player.png' image file
    enemy: 'enemy.png',   // Create an 'enemy.png' image file
    enemyDamaged: 'enemy_damaged.png', // An image for when the enemy is hit once
    bullet: 'bullet.png' // A 'bullet.png' for the projectile
};
// If you don't have images, the game will draw colored squares as a fallback.
// ------------------------------------------------------------------


/**
 * Loads all images and starts the game when done.
 */
function loadAssetsAndStart() {
    let assetsLoaded = 0;
    const assetKeys = Object.keys(IMAGE_ASSETS);
    
    // Show a loading message
    ctx.fillStyle = 'white';
    ctx.font = '30px "Courier New"';
    ctx.fillText('Loading Assets...', BASE_WIDTH / 2 - 100, BASE_HEIGHT / 2);

    assetKeys.forEach(key => {
        images[key] = new Image();
        images[key].src = IMAGE_ASSETS[key];
        images[key].onload = () => {
            assetsLoaded++;
            if (assetsLoaded === assetKeys.length) {
                // All images loaded, start the game!
                init();
            }
        };
        // If an image fails to load, we'll just have an empty image object.
        // The draw functions will handle this by drawing a square instead.
        images[key].onerror = () => {
            assetsLoaded++;
            console.error(`Could not load image: ${IMAGE_ASSETS[key]}`);
            if (assetsLoaded === assetKeys.length) {
                init();
            }
        };
    });
}


/**
 * Resets all game variables to their initial state.
 */
function init() {
    player = {
        x: BASE_WIDTH / 2 - PLAYER_SIZE / 2,
        y: BASE_HEIGHT - PLAYER_SIZE - 20,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        speed: 7,
        shootCooldown: 250, // Fires every 250ms
        lastShotTime: 0
    };
    keys = { ArrowLeft: false, ArrowRight: false }; // Movement is only left/right now
    enemies = [];
    bullets = [];
    score = 0;
    hearts = 3;
    gameOver = false;
    gameSpeed = 1;
    spawnTimer = 0;
    spawnInterval = 1500;
    gameOverScreen.classList.add('hidden');
    gameLoop();
}

// --- INPUT HANDLING ---
window.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });
restartButton.addEventListener('click', loadAssetsAndStart);

// Touch controls for movement
function handleTouch(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const touchX = (e.touches[0].clientX - rect.left) * scaleX;
    player.x = touchX - player.width / 2;
    // Keep player within bounds
    if (player.x < 0) player.x = 0;
    if (player.x > BASE_WIDTH - player.width) player.x = BASE_WIDTH - player.width;
}
canvas.addEventListener('touchstart', handleTouch, { passive: false });
canvas.addEventListener('touchmove', handleTouch, { passive: false });


// --- GAME LOOP ---
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

    updatePlayer(timestamp);
    updateEnemies();
    updateBullets();
    checkCollisions();

    drawPlayer();
    drawEnemies();
    drawBullets();
    drawStats();

    requestAnimationFrame(gameLoop);
}

// --- UPDATE FUNCTIONS ---

function updatePlayer(currentTime) {
    // Keyboard movement
    if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x < BASE_WIDTH - player.width) player.x += player.speed;

    // Shooting
    if (currentTime - player.lastShotTime > player.shootCooldown) {
        player.lastShotTime = currentTime;
        bullets.push({
            x: player.x + player.width / 2 - BULLET_SIZE.width / 2,
            y: player.y,
            width: BULLET_SIZE.width,
            height: BULLET_SIZE.height,
            speed: 10
        });
    }
}

function updateEnemies() {
    // Spawn new enemies
    spawnTimer += 16; // Approximately 60fps
    if (spawnTimer > spawnInterval) {
        spawnTimer = 0;
        const spawnX = Math.random() * (BASE_WIDTH - ENEMY_SIZE);
        enemies.push({
            x: spawnX, y: -ENEMY_SIZE,
            width: ENEMY_SIZE, height: ENEMY_SIZE,
            hp: 2 // Each enemy has 2 health
        });
    }

    // Move enemies towards the player
    enemies.forEach(enemy => {
        const dx = (player.x + player.width / 2) - (enemy.x + enemy.width / 2);
        const dy = (player.y + player.height / 2) - (enemy.y + enemy.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 1) {
            enemy.x += (dx / distance) * gameSpeed;
            enemy.y += (dy / distance) * gameSpeed;
        }
    });
    
    // Difficulty scaling
    gameSpeed = 1 + Math.floor(score / 10);
    spawnInterval = Math.max(300, 1500 - score * 15);
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        if (bullets[i].y < 0) {
            bullets.splice(i, 1); // Remove bullets that go off-screen
        }
    }
}

// --- COLLISION DETECTION ---

function checkCollisions() {
    // Bullet-Enemy collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (isColliding(bullets[i], enemies[j])) {
                enemies[j].hp--; // Decrease enemy health
                bullets.splice(i, 1); // Remove the bullet
                
                if (enemies[j].hp <= 0) {
                    score++;
                    enemies.splice(j, 1); // Remove the enemy
                }
                break; // Bullet can only hit one enemy
            }
        }
    }

    // Player-Enemy collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (isColliding(player, enemies[i])) {
            hearts--;
            enemies.splice(i, 1); // Remove enemy on collision
            if (hearts <= 0) {
                gameOver = true;
            }
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

// --- DRAWING FUNCTIONS (IMAGE-READY) ---

function draw(assetKey, color, obj) {
    if (images[assetKey] && images[assetKey].complete && images[assetKey].naturalHeight !== 0) {
        ctx.drawImage(images[assetKey], obj.x, obj.y, obj.width, obj.height);
    } else {
        // Fallback to drawing a colored square if image is missing/broken
        ctx.fillStyle = color;
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    }
}

function drawPlayer() {
    draw('player', '#00FF00', player);
}

function drawEnemies() {
    enemies.forEach(enemy => {
        // Draw damaged image if hp is 1, otherwise draw normal image
        const assetKey = enemy.hp === 1 ? 'enemyDamaged' : 'enemy';
        const fallbackColor = enemy.hp === 1 ? 'orange' : 'red';
        draw(assetKey, fallbackColor, enemy);
    });
}

function drawBullets() {
    bullets.forEach(bullet => {
        draw('bullet', 'yellow', bullet);
    });
}

function drawStats() {
    ctx.fillStyle = 'white';
    ctx.font = '30px "Courier New"';
    ctx.fillText(`Score: ${score}`, 20, 40);
    ctx.fillText(`Hearts: ${hearts}`, BASE_WIDTH - 150, 40);
}

// --- 3. START THE GAME ---
loadAssetsAndStart();
