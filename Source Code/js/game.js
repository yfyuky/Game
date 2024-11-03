// Canvas setup
const canvas = document.querySelector('canvas');
const c = canvas.getContext('2d');

canvas.width = 1024;
canvas.height = 576;

c.fillRect(0, 0, canvas.width, canvas.height);

const gravity = 0.7;

// ====== Classes ======
class Sprite {
    constructor({
        position,
        imageSrc,
        scale = 1,
        framesMax = 1,
        offset = { x: 0, y: 0 }
    }) {
        this.position = position;
        this.width = 50;
        this.height = 150;
        this.image = new Image();
        this.image.src = imageSrc;
        this.scale = scale;
        this.framesMax = framesMax;
        this.framesCurrent = 0;
        this.framesElapsed = 0;
        this.framesHold = 5;
        this.offset = offset;
    }

    draw() {
        c.drawImage(
            this.image,
            this.framesCurrent * (this.image.width / this.framesMax),
            0,
            this.image.width / this.framesMax,
            this.image.height,
            this.position.x - this.offset.x,
            this.position.y - this.offset.y,
            (this.image.width / this.framesMax) * this.scale,
            this.image.height * this.scale
        );
    }

    animateFrames() {
        this.framesElapsed++;

        if (this.framesElapsed % this.framesHold === 0) {
            if (this.framesCurrent < this.framesMax - 1) {
                this.framesCurrent++;
            } else {
                this.framesCurrent = 0;
            }
        }
    }

    update() {
        this.draw();
        this.animateFrames();
    }
}

class Fighter extends Sprite {
    constructor({
        position,
        velocity,
        color = 'red',
        imageSrc,
        scale = 1,
        framesMax = 1,
        offset = { x: 0, y: 0 },
        sprites,
        attackBox = { offset: {}, width: undefined, height: undefined }
    }) {
        super({
            position,
            imageSrc,
            scale,
            framesMax,
            offset
        });

        this.velocity = velocity;
        this.width = 50;
        this.height = 150;
        this.lastKey;
        this.attackBox = {
            position: {
                x: this.position.x,
                y: this.position.y
            },
            offset: attackBox.offset,
            width: attackBox.width,
            height: attackBox.height
        };
        this.color = color;
        this.isAttacking;
        this.health = 100;
        this.framesCurrent = 0;
        this.framesElapsed = 0;
        this.framesHold = 5;
        this.sprites = sprites;
        this.dead = false;

        this.loadSprites();
    }

    loadSprites() {
        for (const sprite in this.sprites) {
            this.sprites[sprite].image = new Image();
            this.sprites[sprite].image.src = this.sprites[sprite].imageSrc;
        }
    }

    update() {
        this.draw();
        if (!this.dead) this.animateFrames();

        this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y;

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        if (this.position.y + this.height + this.velocity.y >= canvas.height - 50) {
            this.velocity.y = 0;
        } else this.velocity.y += gravity;
    }

    attack() {
        this.switchSprite('attack1');
        this.isAttacking = true;
    }

    takeHit() {
        this.health -= 10;

        if (this.health <= 0) {
            this.switchSprite('death');
        } else this.switchSprite('takeHit');
    }

    switchSprite(sprite) {
        if (this.image === this.sprites.death.image) {
            if (this.framesCurrent === this.sprites.death.framesMax - 1)
                this.dead = true;
            return;
        }

        if (
            this.image === this.sprites.attack1.image &&
            this.framesCurrent < this.sprites.attack1.framesMax - 1
        )
            return;

        if (
            this.image === this.sprites.takeHit.image &&
            this.framesCurrent < this.sprites.takeHit.framesMax - 1
        )
            return;

        switch (sprite) {
            case 'idle':
            case 'run':
            case 'jump':
            case 'fall':
            case 'attack1':
            case 'takeHit':
            case 'death':
                if (this.image !== this.sprites[sprite].image) {
                    this.image = this.sprites[sprite].image;
                    this.framesMax = this.sprites[sprite].framesMax;
                    this.framesCurrent = 0;
                }
                break;
        }
    }
}

// ====== Utility Functions ======
// Get logged in user data
function getLoggedInUser() {
    return {
        email: localStorage.getItem('userEmail'),
        username: localStorage.getItem('username')
    };
}

// Attacking mechanism with collision detection
function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
        rectangle1.attackBox.position.x + rectangle1.attackBox.width >=
        rectangle2.position.x &&
        rectangle1.attackBox.position.x <=
        rectangle2.position.x + rectangle2.width &&
        rectangle1.attackBox.position.y + rectangle1.attackBox.height >=
        rectangle2.position.y &&
        rectangle1.attackBox.position.y <=
        rectangle2.position.y + rectangle2.height
    );
}

// Determine winner and update leaderboard
function determineWinner({ player, enemy, timerId }) {
    clearTimeout(timerId);
    const displayText = document.querySelector('#displayText');
    displayText.style.display = 'flex';

    const loggedInUser = getLoggedInUser();
    if (!loggedInUser.username) {
        console.log('No user logged in');
        return;
    }

    if (player.health === enemy.health) {
        displayText.innerHTML = 'Tie';
        return;
    }

    const isPlayer1Winner = player.health > enemy.health;
    displayText.innerHTML = isPlayer1Winner ? 'Player 1 Wins' : 'Player 2 Wins';

    // Update user's stats in localStorage
    if (isPlayer1Winner) {
        updatePlayerStats(loggedInUser.username, true);
    } else {
        updatePlayerStats(loggedInUser.username, false);
    }

    // Update leaderboard display
    updateLeaderboardDisplay();
}

// Function to update player statistics
function updatePlayerStats(username, isWin) {
    // Get existing stats or initialize new ones
    let playerStats = JSON.parse(localStorage.getItem('playerStats')) || {};

    if (!playerStats[username]) {
        playerStats[username] = {
            wins: 0,
            losses: 0
        };
    }

    // Update stats
    if (isWin) {
        playerStats[username].wins++;
    } else {
        playerStats[username].losses++;
    }

    // Store updated stats
    localStorage.setItem('playerStats', JSON.stringify(playerStats));

    // Update leaderboard data
    updateLeaderboardData(username, playerStats[username]);
}

// Function to update leaderboard data
function updateLeaderboardData(username, stats) {
    if (!leaderboardData) {
        leaderboardData = { leaderboard: [] };
    }

    // Find or create player entry
    let playerEntry = leaderboardData.leaderboard.find(p => p.name === username);

    if (!playerEntry) {
        playerEntry = {
            name: username,
            wins: stats.wins,
            losses: stats.losses,
            rank: leaderboardData.leaderboard.length + 1
        };
        leaderboardData.leaderboard.push(playerEntry);
    } else {
        playerEntry.wins = stats.wins;
        playerEntry.losses = stats.losses;
    }

    // Sort and update ranks
    leaderboardData.leaderboard.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
    leaderboardData.leaderboard.forEach((player, index) => {
        player.rank = index + 1;
    });

    // Limit to top 6 players
    leaderboardData.leaderboard = leaderboardData.leaderboard.slice(0, 6);
}

// Initialize timer
let timer = 60;
let timerId;

// Decreases the game timer and checks for game ending conditions
function decreaseTimer() {
    if (timer > 0) {
        timerId = setTimeout(decreaseTimer, 1000);
        timer--;
        document.querySelector('#timer').innerHTML = timer;
    }

    if (timer === 0) {
        determineWinner({ player, enemy, timerId });
    }
}

// ====== Game Setup ======
const background = new Sprite({
    position: { x: 0, y: 0 },
    imageSrc: '../img/Fighting game assets/background.png'
});

const shop = new Sprite({
    position: { x: 700, y: 150 },
    imageSrc: '../img/Fighting game assets/shop.png',
    scale: 2.75,
    framesMax: 6
});

const player = new Fighter({
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    imageSrc: '../img/Fighting game assets/Player/Idle.png',
    framesMax: 8,
    scale: 2.5,
    offset: { x: 215, y: 157 },
    sprites: {
        idle: { imageSrc: '../img/Fighting game assets/Player/Idle.png', framesMax: 8 },
        run: { imageSrc: '../img/Fighting game assets/Player/Run.png', framesMax: 8 },
        jump: { imageSrc: '../img/Fighting game assets/Player/Jump.png', framesMax: 2 },
        fall: { imageSrc: '../img/Fighting game assets/Player/Fall.png', framesMax: 2 },
        attack1: { imageSrc: '../img/Fighting game assets/Player/Attack1.png', framesMax: 6 },
        takeHit: { imageSrc: '../img/Fighting game assets/Player/Take Hit - white silhouette.png', framesMax: 4 },
        death: { imageSrc: '../img/Fighting game assets/Player/Death.png', framesMax: 6 }
    },
    attackBox: { offset: { x: 100, y: 50 }, width: 160, height: 50 }
});

const enemy = new Fighter({
    position: { x: 950, y: 100 },
    velocity: { x: 0, y: 0 },
    color: 'blue',
    offset: { x: -50, y: 0 },
    imageSrc: '../img/Fighting game assets/Enemy/Idle.png',
    framesMax: 4,
    scale: 2.5,
    offset: { x: 215, y: 167 },
    sprites: {
        idle: { imageSrc: '../img/Fighting game assets/Enemy/Idle.png', framesMax: 4 },
        run: { imageSrc: '../img/Fighting game assets/Enemy/Run.png', framesMax: 8 },
        jump: { imageSrc: '../img/Fighting game assets/Enemy/Jump.png', framesMax: 2 },
        fall: { imageSrc: '../img/Fighting game assets/Enemy/Fall.png', framesMax: 2 },
        attack1: { imageSrc: '../img/Fighting game assets/Enemy/Attack1.png', framesMax: 4 },
        takeHit: { imageSrc: '../img/Fighting game assets/Enemy/Take hit.png', framesMax: 3 },
        death: { imageSrc: '../img/Fighting game assets/Enemy/Death.png', framesMax: 7 }
    },
    attackBox: { offset: { x: -170, y: 50 }, width: 170, height: 50 }
});

const keys = {
    a: { pressed: false },
    d: { pressed: false },
    ArrowRight: { pressed: false },
    ArrowLeft: { pressed: false }
};

decreaseTimer();

// ====== Game Loop ======
function animate() {
    window.requestAnimationFrame(animate);
    c.fillStyle = 'black';
    c.fillRect(0, 0, canvas.width, canvas.height);
    background.update();
    shop.update();
    c.fillStyle = 'rgba(255, 255, 255, 0.15)';
    c.fillRect(0, 0, canvas.width, canvas.height);
    player.update();
    enemy.update();

    player.velocity.x = 0;
    enemy.velocity.x = 0;

    // Player movement
    if (keys.a.pressed && player.lastKey === 'a') {
        player.velocity.x = -5;
        player.switchSprite('run');
    } else if (keys.d.pressed && player.lastKey === 'd') {
        player.velocity.x = 5;
        player.switchSprite('run');
    } else {
        player.switchSprite('idle');
    }

    // Player jumping/falling
    if (player.velocity.y < 0) {
        player.switchSprite('jump');
    } else if (player.velocity.y > 0) {
        player.switchSprite('fall');
    }

    // Enemy movement
    if (keys.ArrowLeft.pressed && enemy.lastKey === 'ArrowLeft') {
        enemy.velocity.x = -5;
        enemy.switchSprite('run');
    } else if (keys.ArrowRight.pressed && enemy.lastKey === 'ArrowRight') {
        enemy.velocity.x = 5;
        enemy.switchSprite('run');
    } else {
        enemy.switchSprite('idle');
    }

    // Enemy jumping/falling
    if (enemy.velocity.y < 0) {
        enemy.switchSprite('jump');
    } else if (enemy.velocity.y > 0) {
        enemy.switchSprite('fall');
    }

    // Detect collision & enemy gets hit
    if (rectangularCollision({ rectangle1: player, rectangle2: enemy }) &&
        player.isAttacking && player.framesCurrent === 4) {
        enemy.takeHit();
        player.isAttacking = false;
        gsap.to('#enemyHealth', { width: enemy.health + '%' });
    }

    // Player misses
    if (player.isAttacking && player.framesCurrent === 4) {
        player.isAttacking = false;
    }

    // Player gets hit
    if (rectangularCollision({ rectangle1: enemy, rectangle2: player }) &&
        enemy.isAttacking && enemy.framesCurrent === 2) {
        player.takeHit();
        enemy.isAttacking = false;
        gsap.to('#playerHealth', { width: player.health + '%' });
    }

    // Enemy misses
    if (enemy.isAttacking && enemy.framesCurrent === 2) {
        enemy.isAttacking = false;
    }

    // End game based on health
    if (enemy.health <= 0 || player.health <= 0) {
        determineWinner({ player, enemy, timerId });
    }
}

// Start animation loop
animate();

// ====== Event Listeners ======
window.addEventListener('keydown', (event) => {
    if (!player.dead) {
        switch (event.key) {
            case 'd': keys.d.pressed = true; player.lastKey = 'd'; break;
            case 'a': keys.a.pressed = true; player.lastKey = 'a'; break;
            case 'w': player.velocity.y = -20; break;
            case ' ': player.attack(); break;
        }
    }

    if (!enemy.dead) {
        switch (event.key) {
            case 'ArrowRight': keys.ArrowRight.pressed = true; enemy.lastKey = 'ArrowRight'; break;
            case 'ArrowLeft': keys.ArrowLeft.pressed = true; enemy.lastKey = 'ArrowLeft'; break;
            case 'ArrowUp': enemy.velocity.y = -20; break;
            case 'Enter': enemy.attack(); break;
        }
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'd': keys.d.pressed = false; break;
        case 'a': keys.a.pressed = false; break;
        case 'ArrowRight': keys.ArrowRight.pressed = false; break;
        case 'ArrowLeft': keys.ArrowLeft.pressed = false; break;
    }
});