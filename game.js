
// --- Constants ---
const SUITS = ['♠', '♥', '♣', '♦'];
const VALUES = [
    { rank: 2, display: '2', value: 2 },
    { rank: 3, display: '3', value: 3 },
    { rank: 4, display: '4', value: 4 },
    { rank: 5, display: '5', value: 5 },
    { rank: 6, display: '6', value: 6 },
    { rank: 7, display: '7', value: 7 },
    { rank: 8, display: '8', value: 8 },
    { rank: 9, display: '9', value: 9 },
    { rank: 10, display: '10', value: 10 },
    { rank: 11, display: 'J', value: 11 },
    { rank: 12, display: 'Q', value: 12 },
    { rank: 13, display: 'K', value: 13 },
    { rank: 14, display: 'A', value: 14 }
];

// --- Game State ---
const state = {
    deck: [],
    pile: [],
    bin: [],
    players: {
        human: {
            id: 0,
            name: 'PLAYER',
            hand: [],
            lastStand: [],
            lastChance: [],
            cardsEaten: 0
        },
        ai: {
            id: 1,
            name: 'OPPONENT',
            hand: [],
            lastStand: [],
            lastChance: [],
            cardsEaten: 0
        }
    },
    turn: null, // 'human' or 'ai'
    stage: 0, // 0: Init, 1: Deal, 2: Swap, 3: PlayLoop, 4: EmptyHand (implicit in PlayLoop), 5: LC, 6: LS
    selectedCards: [], // Used for drag selection or multi-select
    settings: {
        difficulty: 'Medium', // Easy, Medium, Hard, Extreme
        cheating: false
    },
    stats: {
        startTime: 0,
        turns: 0
    }
};

// --- DOM Elements ---
const els = {
    humanHand: document.getElementById('player-hand-container'),
    humanSpecial: document.getElementById('player-special-cards'),
    aiHandCount: document.getElementById('opponent-card-count'),
    aiSpecial: document.getElementById('opponent-special-cards'),
    pile: document.getElementById('center-pile'),
    bin: document.getElementById('bin-pile'),
    deck: document.getElementById('deck-pile'),
    btn: document.getElementById('action-button'),
    msg: document.getElementById('message-display'),

    // Menu & Modals
    menuBtn: document.getElementById('menu-btn'),
    menuDropdown: document.getElementById('menu-dropdown'),
    cheatToggle: document.getElementById('cheat-toggle'),
    startScreen: document.getElementById('start-screen'),

    modals: {
        generic: document.getElementById('game-modal'),
        rules: document.getElementById('rules-modal'),
        stats: document.getElementById('stats-modal'),
        difficulty: document.getElementById('difficulty-modal')
    },

    modalElements: {
        title: document.getElementById('modal-title'),
        msg: document.getElementById('modal-message'),
        btn: document.getElementById('modal-btn'),
        statsBody: document.getElementById('stats-body')
    }
};

// --- Animation System ---
const animator = {
    // Moves a clone of the card from Start to End
    animateCard(card, startRect, endRect, callback) {
        if (!startRect || !endRect) {
            if (callback) callback();
            return;
        }

        const el = document.createElement('div');
        el.className = `card ${['♥','♦'].includes(card.suit) ? 'red' : 'black'}`;
        el.innerHTML = `<div>${card.display}</div><div>${card.suit}</div>`;

        // Initial Position
        el.style.position = 'fixed';
        el.style.left = `${startRect.left}px`;
        el.style.top = `${startRect.top}px`;
        el.style.width = `${startRect.width}px`;
        el.style.height = `${startRect.height}px`;
        el.style.zIndex = '9999';
        el.style.transition = 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)';

        document.body.appendChild(el);

        // Force Reflow
        el.getBoundingClientRect();

        // End Position
        el.style.left = `${endRect.left}px`;
        el.style.top = `${endRect.top}px`;
        el.style.width = `${endRect.width}px`;
        el.style.height = `${endRect.height}px`;

        setTimeout(() => {
            el.remove();
            if (callback) callback();
        }, 500);
    }
};

// --- Drag & Drop Controller ---
const dragCtrl = {
    active: false,
    item: null, // { type: 'hand'|'chance', index: 0, card: {}, sourcePlayer: 'human' }
    el: null, // The ghost element
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },

    init() {
        document.addEventListener('mousedown', this.handleStart.bind(this));
        document.addEventListener('mousemove', this.handleMove.bind(this));
        document.addEventListener('mouseup', this.handleEnd.bind(this));

        document.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleEnd.bind(this));
    },

    handleStart(e) {
        if (state.turn !== 'human' && state.stage !== 2) return; // Only human turn or swap

        const target = e.target.closest('.card');
        if (!target) return;

        // Check if card is draggable (human hand or valid special card)
        const isHand = target.parentElement.id === 'player-hand-container';
        const isChance = target.classList.contains('last-chance-card') && target.closest('#player-special-cards');
        const isStand = target.classList.contains('last-stand-card') && target.closest('#player-special-cards');
        const isPile = target.closest('#center-pile');

        if (!isHand && !isChance && !isStand && !isPile) return;

        // Prevent default only if we started dragging a valid card
        // e.preventDefault(); // Don't prevent default too early, might block scrolling if we implement it.

        // Identify Card Data
        let itemData = null;
        if (isHand) {
            const index = Array.from(els.humanHand.children).indexOf(target);
            itemData = { type: 'hand', index, card: state.players.human.hand[index], source: 'hand' };
        } else if (isChance) {
             const slot = target.closest('.special-slot');
             const index = Array.from(els.humanSpecial.children).indexOf(slot);
             itemData = { type: 'chance', index, card: state.players.human.lastChance[index], source: 'chance' };
        } else if (isStand) {
             // Only draggable in specific stage/condition? Usually click.
             // Mobile version supports dragging stand cards to play.
             const slot = target.closest('.special-slot');
             const index = Array.from(els.humanSpecial.children).indexOf(slot);
             itemData = { type: 'stand', index, card: state.players.human.lastStand[index], source: 'stand' };
        } else if (isPile) {
            // Eating pile
            if (state.pile.length === 0) return;
            itemData = { type: 'pile', source: 'pile' };
        }

        if (!itemData) return;

        // Start Drag
        this.active = true;
        this.item = itemData;
        this.el = target.cloneNode(true);
        this.el.classList.add('card-ghost');
        this.el.classList.remove('hand-card'); // Remove positioning classes
        this.el.style.margin = '0';

        // Get touch/mouse coords
        const point = e.touches ? e.touches[0] : e;
        this.startPos = { x: point.clientX, y: point.clientY };
        this.currentPos = { x: point.clientX, y: point.clientY };

        // Position ghost
        const rect = target.getBoundingClientRect();
        this.el.style.left = `${rect.left}px`;
        this.el.style.top = `${rect.top}px`;
        this.el.style.width = `${rect.width}px`;
        this.el.style.height = `${rect.height}px`;

        document.body.appendChild(this.el);
        target.classList.add('dragging');

        // Vibration feedback
        if (navigator.vibrate) navigator.vibrate(20);
    },

    handleMove(e) {
        if (!this.active) return;
        e.preventDefault(); // Prevent scrolling while dragging

        const point = e.touches ? e.touches[0] : e;
        const dx = point.clientX - this.startPos.x;
        const dy = point.clientY - this.startPos.y;

        this.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.1)`;
        this.el.style.zIndex = '9999';
    },

    handleEnd(e) {
        if (!this.active) return;

        this.active = false;

        // Determine Drop Target
        // We use document.elementFromPoint. For touch end, we need changedTouches.
        const point = e.changedTouches ? e.changedTouches[0] : e;

        // Temporarily hide ghost to see what's underneath
        this.el.style.display = 'none';
        let dropTarget = document.elementFromPoint(point.clientX, point.clientY);
        this.el.style.display = 'block';

        // Handle Logic based on Source -> Target
        const source = this.item.source;

        // --- 1. Play Card (Hand/Chance/Stand -> Pile) ---
        if (dropTarget && dropTarget.closest('#center-pile')) {
            if (source === 'hand' || source === 'chance' || source === 'stand') {
                 handlePlayDrop(this.item);
            }
        }

        // --- 2. Eat Pile (Pile -> Hand) ---
        else if (dropTarget && (dropTarget.closest('#player-hand-container') || dropTarget.closest('#player-area'))) {
            if (source === 'pile') {
                handleEatDrop();
            } else if (source === 'chance') {
                 // Drag LC to Hand (Swap Phase)
                 if (state.stage === 2) handleSwapDrop(this.item, null, 'hand');
            }
        }

        // --- 3. Swap (Hand -> Chance / Chance -> Hand) ---
        else if (dropTarget && dropTarget.closest('.special-slot') && state.stage === 2) {
             const slot = dropTarget.closest('.special-slot');
             const slotIndex = Array.from(els.humanSpecial.children).indexOf(slot);

             if (source === 'hand') {
                 handleSwapDrop(this.item, slotIndex, 'chance');
             }
        }

        // Cleanup
        this.el.remove();
        const originalEl = this.getOriginalElement();
        if (originalEl) originalEl.classList.remove('dragging');

        this.item = null;
        this.el = null;
    },

    getOriginalElement() {
        if (!this.item) return null;
        if (this.item.type === 'hand') return els.humanHand.children[this.item.index];
        if (this.item.type === 'chance') return els.humanSpecial.children[this.item.index].querySelector('.last-chance-card');
        if (this.item.type === 'stand') return els.humanSpecial.children[this.item.index].querySelector('.last-stand-card');
        return null;
    }
};

// --- Initialization ---

function initApp() {
    dragCtrl.init();
    // Start screen is visible by default in HTML, ensuring game state is ready
    // We might want to "clear" the board visuals just in case
    renderPile();
    renderDeckBin();
}

function startGame() {
    els.startScreen.classList.add('hidden');
    els.menuBtn.classList.remove('hidden');
    initGame();
}

function initGame() {
    createDeck();
    shuffleDeck();

    // Reset players
    state.players.human.hand = [];
    state.players.human.lastStand = [];
    state.players.human.lastChance = [];
    state.players.human.cardsEaten = 0;

    state.players.ai.hand = [];
    state.players.ai.lastStand = [];
    state.players.ai.lastChance = [];
    state.players.ai.cardsEaten = 0;

    state.pile = [];
    state.bin = [];
    state.turn = null;
    state.stats.turns = 0;
    state.stats.startTime = Date.now();

    dealCards(); // Stage 1
    state.stage = 3; // Skip Swap Stage -> Gameplay

    updateUI();
    determineStartPlayer();
}

function resetGame() {
    hideMenu();
    // Return to start screen
    els.menuBtn.classList.add('hidden');
    els.startScreen.classList.remove('hidden');

    // Clear State entirely
    state.pile = [];
    state.bin = [];
    state.deck = [];
    state.turn = null;
    state.stage = 0;

    state.players.human.hand = [];
    state.players.ai.hand = [];
    state.players.human.lastChance = [];
    state.players.ai.lastChance = [];
    state.players.human.lastStand = [];
    state.players.ai.lastStand = [];
    state.players.human.cardsEaten = 0;
    state.players.ai.cardsEaten = 0;
    state.stats.startTime = 0;
    state.stats.turns = 0;

    updateUI();
}

function resetGame() {
    hideMenu();
    // Return to start screen
    els.menuBtn.classList.add('hidden');
    els.startScreen.classList.remove('hidden');

    // Clear State entirely
    state.pile = [];
    state.bin = [];
    state.deck = [];
    state.turn = null;
    state.stage = 0;

    state.players.human.hand = [];
    state.players.ai.hand = [];
    state.players.human.lastChance = [];
    state.players.ai.lastChance = [];
    state.players.human.lastStand = [];
    state.players.ai.lastStand = [];
    state.players.human.cardsEaten = 0;
    state.players.ai.cardsEaten = 0;
    state.stats.startTime = 0;
    state.stats.turns = 0;

    updateUI();
}

function createDeck() {
    let fullDeck = [];
    for (let s of SUITS) {
        for (let v of VALUES) {
            fullDeck.push({
                suit: s,
                rank: v.rank,
                display: v.display,
                value: v.value,
                id: Math.random().toString(36).substr(2, 9)
            });
        }
    }

    const twos = fullDeck.filter(c => c.rank === 2);
    const tens = fullDeck.filter(c => c.rank === 10);
    const others = fullDeck.filter(c => c.rank !== 2 && c.rank !== 10);

    const keptTwo = twos[Math.floor(Math.random() * twos.length)];
    const keptTen = tens[Math.floor(Math.random() * tens.length)];

    state.deck = [...others, keptTwo, keptTen];
}

function shuffleDeck() {
    for (let i = state.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
    }
}

function dealCards() {
    // Deal 3 Last Stand (Face Down)
    for (let i=0; i<3; i++) {
        state.players.human.lastStand.push(state.deck.pop());
        state.players.ai.lastStand.push(state.deck.pop());
    }
    // Deal 3 Last Chance (Face Up)
    for (let i=0; i<3; i++) {
        state.players.human.lastChance.push(state.deck.pop());
        state.players.ai.lastChance.push(state.deck.pop());
    }
    // Deal 3 to Hand
    for (let i=0; i<3; i++) {
        state.players.human.hand.push(state.deck.pop());
        state.players.ai.hand.push(state.deck.pop());
    }
    sortHand('human');
    sortHand('ai');
}

function sortHand(playerKey) {
    state.players[playerKey].hand.sort((a,b) => a.value - b.value);
}

function determineStartPlayer() {
    const getMinRank = (hand) => {
        // Exclude 2 and 10 from starting consideration?
        // Rules: "The player with the lowest card starts". Usually 3 is lowest.
        const playable = hand.filter(c => c.rank !== 2 && c.rank !== 10);
        if (playable.length === 0) return 15; // High value
        return Math.min(...playable.map(c => c.rank));
    };

    const hMin = getMinRank(state.players.human.hand);
    const aMin = getMinRank(state.players.ai.hand);

    if (hMin < aMin) {
        state.turn = 'human';
        showMessage("You start!", "green");
    } else if (aMin < hMin) {
        state.turn = 'ai';
        showMessage("Opponent starts!", "red");
        setTimeout(aiTurn, 1000);
    } else {
        // Tie - Opponent starts
        state.turn = 'ai';
        showMessage("Tie! Opponent starts.", "red");
        setTimeout(aiTurn, 1000);
    }
}

// --- Gameplay Interactions (Called by DragController) ---

function handlePlayDrop(item) {
    if (state.turn !== 'human') return;

    const source = item.source; // 'hand', 'chance', 'stand'

    // Validate Source Active
    const activeSource = getActiveSource('human');
    if (source !== activeSource) {
        showMessage(`Must play from ${activeSource === 'chance' ? 'Last Chance' : activeSource === 'stand' ? 'Last Stand' : 'Hand'}!`);
        return;
    }

    const card = item.card;

    // Last Stand Blind Logic
    if (source === 'stand') {
        showMessage(`Revealed: ${card.display}${card.suit}`);

        if (canBeatPile(card.rank)) {
             playCards([card], 'human', source, [item.index]);
        } else {
             // Failed LS
             state.players.human.lastStand[item.index] = null; // Remove from stand
             state.players.human.hand.push(card); // Add to hand
             performPickup('human');
        }
        return;
    }

    // Normal Validation
    if (!canBeatPile(card.rank)) {
        showMessage("Invalid Move!", "red");
        // Animate snap back?
        return;
    }

    // Play the card
    // Note: We only support single card play via Drag for now.
    // TODO: Multi-select then drag?
    // Or auto-play duplicates? "If multiple cards of same value, ask?"
    // User requested "Mimic mobile app". Mobile app drags stack if selected.
    // For now, let's play the single dragged card.
    // Advanced: Check for other cards of same rank in hand and ask/auto-play?
    // Let's auto-play duplicates for convenience if setting enabled? No, sticking to core.

    playCards([card], 'human', source, [item.index]);
}

function handleEatDrop() {
    if (state.turn !== 'human') return;
    if (state.pile.length === 0) return;

    // Check if player has valid move
    // "Eat - When the player ... doesn't have a card ... ALL cards ... into Hand"
    // Usually only allowed if no valid move.
    // "Game Rule: ... player ... IS ALLOWED to eat even if they have a move?"
    // Mobile logic `handleMpaClick`: "If player has valid move... Prevent eating".

    const hasMove = playerHasValidMove('human');
    if (hasMove) {
        showMessage("You have a valid move!", "red");
        return;
    }

    performPickup('human');
}

// --- Core Game Logic ---

function getActiveSource(playerKey) {
    const p = state.players[playerKey];
    if (p.hand.length > 0) return 'hand';
    if (state.deck.length > 0) return 'hand';
    if (p.lastChance.some(c => c !== null)) return 'chance';
    if (p.lastStand.some(c => c !== null)) return 'stand';
    return 'done';
}

function canBeatPile(rank) {
    if (rank === 2 || rank === 10) return true; // Special cards always playable
    if (state.pile.length === 0) return true;

    const topCard = state.pile[state.pile.length - 1];
    if (topCard.rank === 2) return true; // 2 resets value to 0

    return rank >= topCard.rank;
}

function playerHasValidMove(playerKey) {
    const p = state.players[playerKey];
    const source = getActiveSource(playerKey);
    let cards = [];

    if (source === 'hand') cards = p.hand;
    else if (source === 'chance') cards = p.lastChance.filter(c => c);
    else if (source === 'stand') return true; // Blind play is always "valid attempt"

    return cards.some(c => canBeatPile(c.rank));
}

function playCards(cards, playerKey, source, indices) {
    // Remove from source
    if (source === 'hand') {
        state.players[playerKey].hand = state.players[playerKey].hand.filter(c => !cards.includes(c));
    } else if (source === 'chance') {
        indices.forEach(idx => state.players[playerKey].lastChance[idx] = null);
    } else if (source === 'stand') {
        indices.forEach(idx => state.players[playerKey].lastStand[idx] = null);
    }

    // Add to pile
    state.pile.push(...cards);
    state.stats.turns++;

    const topRank = cards[0].rank;
    let event = null;

    if (topRank === 10) event = 'clear';
    else if (topRank === 2) event = 'reset';
    else if (state.pile.length >= 4) {
        const last4 = state.pile.slice(-4);
        if (last4.every(c => c.rank === topRank)) event = 'clear';
    }

    replenishHand(playerKey);
    updateUI();

    // Check Win
    if (getActiveSource(playerKey) === 'done') {
        if (event === 'clear' || event === 'reset') {
             // Illegal win
             showMessage("Cannot win on Special Card!", "red");
             performPickup(playerKey);
             return;
        } else {
             showModal('generic', "GAME OVER", `${playerKey === 'human' ? 'You' : 'Opponent'} Won!`);
             return;
        }
    }

    if (event === 'clear' || event === 'reset') {
        showMessage(event === 'clear' ? "CLEARED!" : "RESET!", "yellow");
        if (event === 'clear') {
            state.bin.push(...state.pile);
            state.pile = [];
            updateUI();
            if (playerKey === 'ai') setTimeout(aiTurn, 1000);
            return;
        }
    }

    // Switch Turn
    state.turn = playerKey === 'human' ? 'ai' : 'human';
    updateUI();

    if (state.turn === 'ai') setTimeout(aiTurn, 1000);
}

function performPickup(playerKey) {
    // Capture Pile Rect for animation start (before we clear it)
    const pileRect = els.pile.getBoundingClientRect();
    const targetRect = playerKey === 'human'
        ? els.humanHand.getBoundingClientRect()
        : els.aiHandCount.parentElement.getBoundingClientRect();

    // Trigger Animation for top 3 cards
    const cardsToAnimate = state.pile.slice(-3);
    cardsToAnimate.forEach((card, i) => {
        setTimeout(() => {
            animator.animateCard(card, pileRect, targetRect);
        }, i * 50);
    });

    showMessage(`${playerKey === 'human' ? "You" : "Opponent"} ate the pile!`);

    // Add pile to hand
    state.players[playerKey].hand.push(...state.pile);
    state.players[playerKey].cardsEaten += state.pile.length;
    state.pile = [];

    sortHand(playerKey);

    state.turn = playerKey === 'human' ? 'ai' : 'human'; // Next player's turn
    updateUI();

    if (state.turn === 'ai') setTimeout(aiTurn, 1000);
}

function replenishHand(playerKey) {
    while (state.players[playerKey].hand.length < 3 && state.deck.length > 0) {
        state.players[playerKey].hand.push(state.deck.pop());
    }
    sortHand(playerKey);
}

// --- AI Logic (Ported/Simplified) ---

function aiTurn() {
    if (state.turn !== 'ai') return;

    const source = getActiveSource('ai');
    const p = state.players.ai;
    const diff = state.settings.difficulty;

    if (source === 'done') {
        showModal('generic', "GAME OVER", "Opponent Won!");
        return;
    }

    let play = [];
    let indices = [];
    let startRect = els.aiHandCount.parentElement.getBoundingClientRect(); // Default start

    if (source === 'stand') {
        // Random pick
        const validIndices = p.lastStand.map((c, i) => c ? i : -1).filter(i => i !== -1);
        const pick = validIndices[Math.floor(Math.random() * validIndices.length)];
        const card = p.lastStand[pick];
        const slotEl = els.aiSpecial.children[pick];
        if (slotEl) startRect = slotEl.getBoundingClientRect();

        showMessage(`Opponent plays blind...`);
        if (canBeatPile(card.rank)) {
            play = [card];
            indices = [pick];
        } else {
            // Fail
            showMessage(`Opponent revealed ${card.display}, failed!`);
            p.lastStand[pick] = null;
            p.hand.push(card);
            performPickup('ai');
            return;
        }
    } else {
        // Logic for Hand/Chance
        let cards = source === 'hand' ? p.hand : p.lastChance.filter(c => c);

        // Group by rank
        const groups = {};
        cards.forEach(c => {
            if (!groups[c.rank]) groups[c.rank] = [];
            groups[c.rank].push(c);
        });

        // Filter playable groups
        let playableGroups = Object.values(groups).filter(g => canBeatPile(g[0].rank));

        if (playableGroups.length === 0) {
            performPickup('ai');
            return;
        }

        // Difficulty Selection
        // Sort by value
        playableGroups.sort((a,b) => a[0].value - b[0].value);

        let selectedGroup = null;

        if (diff === 'Easy') {
            selectedGroup = playableGroups[0]; // Lowest value
        } else {
            // Medium/Hard: Try to save high cards, but play high if pile is big?
            // Simple Medium logic: Play lowest valid. If have 2 or 10, save them unless necessary?
            const special = playableGroups.filter(g => g[0].rank === 2 || g[0].rank === 10);
            const normal = playableGroups.filter(g => g[0].rank !== 2 && g[0].rank !== 10);

            if (normal.length > 0) {
                selectedGroup = normal[0];
            } else {
                selectedGroup = special[0];
            }
        }

        play = selectedGroup;

        // Find indices if from Chance
        if (source === 'chance') {
             play.forEach(c => {
                 const idx = p.lastChance.indexOf(c);
                 if (idx !== -1) indices.push(idx);
             });
             // Set startRect based on first card
             const firstIdx = p.lastChance.indexOf(play[0]);
             if (firstIdx !== -1 && els.aiSpecial.children[firstIdx]) {
                 startRect = els.aiSpecial.children[firstIdx].getBoundingClientRect();
             }
        }
    }

    // Animation
    const endRect = els.pile.getBoundingClientRect();
    play.forEach((c, i) => {
        setTimeout(() => {
            animator.animateCard(c, startRect, endRect);
        }, i * 50);
    });

    // Wait for animation before updating logic
    setTimeout(() => {
        playCards(play, 'ai', source, indices);
    }, 600);
}


// --- UI Rendering ---

function updateUI() {
    renderPile();
    renderDeckBin();
    renderOpponent();
    renderPlayer();

    // Cheating: Show opponent cards if enabled
    if (state.settings.cheating) {
        document.querySelectorAll('.opponent-hidden-card').forEach(el => {
            el.classList.add('revealed');
            // We need to inject text if not there.
            // Simplified: Hand count text is there. Stand is face down.
        });
    }
}

function renderPile() {
    els.pile.innerHTML = '';
    state.pile.forEach((card, i) => {
        const el = createCardEl(card);
        // Stacking effect
        el.style.transform = `translate(${i*2}px, ${-i*2}px)`;
        els.pile.appendChild(el);
    });
}

function renderDeckBin() {
    els.deck.style.visibility = state.deck.length > 0 ? 'visible' : 'hidden';

    els.bin.innerHTML = '';
    if (state.bin.length > 0) {
        const top = state.bin[state.bin.length - 1];
        els.bin.appendChild(createCardEl(top));
    }
}

function renderOpponent() {
    els.aiHandCount.innerText = state.players.ai.hand.length;

    els.aiSpecial.innerHTML = '';
    for (let i=0; i<3; i++) {
        const slot = document.createElement('div');
        slot.className = 'special-slot';

        // Stand
        if (state.players.ai.lastStand[i]) {
            const card = document.createElement('div');
            card.className = 'card card-back last-stand-card opponent-hidden-card';
            if (state.settings.cheating) {
                const c = state.players.ai.lastStand[i];
                card.innerHTML = `<div style="color:white; font-size:10px">${c.display}${c.suit}</div>`;
            }
            slot.appendChild(card);
        }

        // Chance
        if (state.players.ai.lastChance[i]) {
            const c = state.players.ai.lastChance[i];
            const el = createCardEl(c);
            el.classList.add('last-chance-card');
            slot.appendChild(el);
        }
        els.aiSpecial.appendChild(slot);
    }
}

function renderPlayer() {
    els.humanSpecial.innerHTML = '';
    for (let i=0; i<3; i++) {
        const slot = document.createElement('div');
        slot.className = 'special-slot';

        // Stand
        if (state.players.human.lastStand[i]) {
            const card = document.createElement('div');
            card.className = 'card card-back last-stand-card';
            slot.appendChild(card);
        }

        // Chance
        if (state.players.human.lastChance[i]) {
            const el = createCardEl(state.players.human.lastChance[i]);
            el.classList.add('last-chance-card');
            slot.appendChild(el);
        }

        els.humanSpecial.appendChild(slot);
    }

    // Hand Rendering with Overlap Logic
    els.humanHand.innerHTML = '';
    const hand = state.players.human.hand;
    const containerWidth = els.humanHand.clientWidth - 20; // Subtract padding
    const cardWidth = 60; // Assuming 60px card width

    // Calculate overlap
    let marginLeft = 0;
    const totalWidthNeeded = hand.length * cardWidth;

    if (totalWidthNeeded > containerWidth && hand.length > 1) {
        // We need to overlap.
        // Available space for n-1 cards is (containerWidth - cardWidth)
        // Space per card = (containerWidth - cardWidth) / (n - 1)
        // Margin left = Space per card - cardWidth
        const spacePerCard = (containerWidth - cardWidth) / (hand.length - 1);
        marginLeft = spacePerCard - cardWidth;
    }

    hand.forEach((card, i) => {
        const el = createCardEl(card);
        el.classList.add('hand-card');

        if (i > 0) {
            el.style.marginLeft = `${marginLeft}px`;
        }

        // Ensure proper z-index for hovering/interaction
        el.style.zIndex = i;

        els.humanHand.appendChild(el);
    });
}

function createCardEl(card) {
    const el = document.createElement('div');
    el.className = `card ${['♥','♦'].includes(card.suit) ? 'red' : 'black'}`;
    el.innerHTML = `<div>${card.display}</div><div>${card.suit}</div>`;
    return el;
}

function showMessage(text, color='white') {
    els.msg.innerText = text;
    els.msg.style.color = color;
    els.msg.classList.add('visible');
    setTimeout(() => {
        els.msg.classList.remove('visible');
    }, 1500);
}

// --- Menu & Modals ---

els.menuBtn.onclick = (e) => {
    e.stopPropagation(); // Prevent global click from immediately closing it
    els.menuDropdown.classList.toggle('hidden');
};

// Global click to close menu
document.addEventListener('click', (e) => {
    if (!els.menuDropdown.classList.contains('hidden')) {
        if (!els.menuDropdown.contains(e.target) && e.target !== els.menuBtn) {
            hideMenu();
        }
    }
});

els.cheatToggle.onclick = () => {
    state.settings.cheating = !state.settings.cheating;
    els.cheatToggle.classList.toggle('active');
    updateUI();
};

function showModal(type, title, message) {
    hideMenu();
    Object.values(els.modals).forEach(m => m.classList.add('hidden'));

    if (type === 'generic') {
        els.modalElements.title.innerText = title;
        els.modalElements.msg.innerText = message;
        els.modals.generic.classList.remove('hidden');
        els.modalElements.btn.onclick = () => els.modals.generic.classList.add('hidden');
    } else if (type === 'stats') {
        renderStats();
        els.modals.stats.classList.remove('hidden');
    } else {
        els.modals[type].classList.remove('hidden');
    }
}

function hideModal(type) {
    els.modals[type].classList.add('hidden');
}

function hideMenu() {
    els.menuDropdown.classList.add('hidden');
}

function setDifficulty(level) {
    state.settings.difficulty = level;
    document.querySelectorAll('.diff-btn').forEach(b => {
        b.classList.remove('selected');
        if (b.innerText === level) b.classList.add('selected');
    });
    hideModal('difficulty');
}

function renderStats() {
    const s = state.stats;
    const time = Math.floor((Date.now() - s.startTime) / 1000);
    const mins = Math.floor(time / 60);
    const secs = time % 60;

    els.modalElements.statsBody.innerHTML = `
        <div class="stat-row"><span class="text-yellow">Time Played</span><span>${mins}:${secs < 10 ? '0'+secs : secs}</span></div>
        <div class="stat-row"><span class="text-yellow">Turns</span><span>${s.turns}</span></div>
        <div class="stat-row"><span class="text-yellow">Difficulty</span><span>${state.settings.difficulty}</span></div>
        <br>
        <div class="stat-header">YOU</div>
        <div class="stat-row"><span>Cards Eaten</span><span>${state.players.human.cardsEaten}</span></div>
        <div class="stat-header">OPPONENT</div>
        <div class="stat-row"><span>Cards Eaten</span><span>${state.players.ai.cardsEaten}</span></div>
    `;
}

// --- Start ---
initApp();
