
// --- Constants ---
const SUITS = ['♠', '♥', '♣', '♦'];
const VALUES = [
    { rank: 2, display: '2' },
    { rank: 3, display: '3' },
    { rank: 4, display: '4' },
    { rank: 5, display: '5' },
    { rank: 6, display: '6' },
    { rank: 7, display: '7' },
    { rank: 8, display: '8' },
    { rank: 9, display: '9' },
    { rank: 10, display: '10' },
    { rank: 11, display: 'J' },
    { rank: 12, display: 'Q' },
    { rank: 13, display: 'K' },
    { rank: 14, display: 'A' }
];

// --- Game State ---
const state = {
    deck: [],
    pile: [],
    bin: [],
    players: {
        human: {
            hand: [],
            lastStand: [], // The face-down cards
            lastChance: [], // The face-up cards on top
        },
        ai: {
            hand: [],
            lastStand: [],
            lastChance: [],
        }
    },
    turn: null, // 'human' or 'ai'
    stage: 0, // 0: Init, 1: Deal, 2: Swap, 3: PlayLoop, 4: EmptyHand, 5: LC, 6: LS
    selectedCards: [], // Indices of selected cards in hand (or LC/LS if active)
    selectedSource: 'hand', // 'hand', 'chance', 'stand'
    message: ""
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
    modal: document.getElementById('game-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalMsg: document.getElementById('modal-message'),
    modalBtn: document.getElementById('modal-btn')
};

// --- Initialization ---

function initGame() {
    createDeck();
    shuffleDeck();
    dealCards(); // Stage 1
    state.stage = 2; // Swap Stage
    updateUI();
    showModal("Swap Phase", "You can swap cards between your Hand and your Face-Up (Last Chance) cards. Click a card in hand then a face-up card to swap. Click 'Start Game' when ready.");
    els.btn.innerText = "FINISH SWAP";
    els.btn.onclick = endSwapPhase;
}

function createDeck() {
    let fullDeck = [];
    for (let s of SUITS) {
        for (let v of VALUES) {
            fullDeck.push({ suit: s, rank: v.rank, display: v.display, id: Math.random().toString(36).substr(2, 9) });
        }
    }

    // Filter 2s and 10s
    // Keep 1 random 2 and 1 random 10
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
    // Deal 3 Last Stand (Face Down) to each
    for (let i=0; i<3; i++) {
        state.players.human.lastStand.push(drawCard());
        state.players.ai.lastStand.push(drawCard());
    }
    // Deal 3 Last Chance (Face Up) to each
    for (let i=0; i<3; i++) {
        state.players.human.lastChance.push(drawCard());
        state.players.ai.lastChance.push(drawCard());
    }
    // Deal 3 to Hand
    for (let i=0; i<3; i++) {
        state.players.human.hand.push(drawCard());
        state.players.ai.hand.push(drawCard());
    }
}

function drawCard() {
    return state.deck.pop();
}

function determineStartPlayer() {
    // Player with lowest card starts.
    // Check hands.
    const getMinRank = (hand) => Math.min(...hand.map(c => c.rank));
    const hMin = getMinRank(state.players.human.hand);
    const aMin = getMinRank(state.players.ai.hand);

    if (hMin < aMin) {
        state.turn = 'human';
        showMessage("You start!");
    } else if (aMin < hMin) {
        state.turn = 'ai';
        showMessage("Opponent starts!");
        setTimeout(aiTurn, 1000);
    } else {
        // Tie - Opponent starts
        state.turn = 'ai';
        showMessage("Tie! Opponent starts.");
        setTimeout(aiTurn, 1000);
    }
}

// --- Gameplay Logic ---

function endSwapPhase() {
    state.stage = 3;
    els.btn.innerText = "PLAY SELECTED";
    els.btn.onclick = playHumanTurn;
    determineStartPlayer();
    updateUI();
}

function getActiveSource(playerKey) {
    const p = state.players[playerKey];
    if (p.hand.length > 0) return 'hand';
    // If hand empty and deck empty (Stage 5/6 condition)
    // Actually, can you enter Stage 5 if deck is not empty?
    // "Stage 4: Once all cards from the Deck have been distributed... goal is to get rid of all cards in Hand"
    // "Stage 5: ... successfully completed Stage 4" (Empty hand, empty deck).
    if (state.deck.length > 0) return 'hand'; // Still cards to draw

    // Hand empty, Deck empty
    // Check Last Chance
    if (p.lastChance.some(c => c !== null)) return 'chance';

    // Check Last Stand
    if (p.lastStand.some(c => c !== null)) return 'stand';

    return 'done'; // Win?
}

function playHumanTurn() {
    if (state.turn !== 'human') return;

    const source = getActiveSource('human');

    if (source === 'done') {
        showModal("VICTORY", "You have won!");
        return;
    }

    if (state.selectedCards.length === 0) {
        // Check for pickup necessity
        if (source === 'hand') {
            const validMoves = getValidMoves(state.players.human.hand);
            if (validMoves.length === 0) {
                performPickup('human');
                return;
            } else {
                showMessage("Select cards to play!");
                return;
            }
        }
        else if (source === 'chance') {
             // Logic same as hand, but from LC
             const cards = state.players.human.lastChance.filter(c => c !== null);
             const validMoves = getValidMoves(cards);
             if (validMoves.length === 0) {
                 performPickup('human');
                 return;
             } else {
                 showMessage("Select a Last Chance card!");
                 return;
             }
        }
        else if (source === 'stand') {
            // Player must click a card blindly.
            showMessage("Click a face-down card!");
            return;
        }
    }

    // Process Play
    let cardsToPlay = [];
    if (source === 'hand') {
        cardsToPlay = state.selectedCards.map(idx => state.players.human.hand[idx]);
    } else if (source === 'chance') {
         cardsToPlay = state.selectedCards.map(idx => state.players.human.lastChance[idx]);
    } else if (source === 'stand') {
        // Blind play handled in click event directly?
        // Or we select a blind card and click play?
        // Let's assume select blind card -> Click Play.
        const idx = state.selectedCards[0];
        const card = state.players.human.lastStand[idx];

        // Reveal
        showMessage(`Revealed: ${card.display}${card.suit}`);

        if (canBeatPile(card.rank)) {
             cardsToPlay = [card];
             // It's valid, continue to play logic
        } else {
             // Failed LS
             // Move card to hand (it becomes part of pickup?)
             // "LS Event... Eat event will trigger... player cannot progress... until all cards cleared from Hand"
             // So we pick up pile + the LS card.
             state.players.human.lastStand[idx] = null; // Remove from stand
             state.players.human.hand.push(card); // Add to hand
             performPickup('human');
             return;
        }
    }

    // Validation (Already did rank check in selection logic or assumed correct for single selection)
    const firstRank = cardsToPlay[0].rank;
    if (!cardsToPlay.every(c => c.rank === firstRank)) {
        showMessage("Must play cards of same rank!");
        return;
    }

    if (!canBeatPile(firstRank)) {
        showMessage("Invalid Move!");
        return;
    }

    // Execute Play
    if (source === 'hand') {
        moveCardsToPile(cardsToPlay, 'human');
    } else if (source === 'chance') {
        // Remove from specific slots
        state.selectedCards.forEach(idx => {
            state.players.human.lastChance[idx] = null;
        });
        state.pile.push(...cardsToPlay);
    } else if (source === 'stand') {
        const idx = state.selectedCards[0];
        state.players.human.lastStand[idx] = null;
        state.pile.push(cardsToPlay[0]);
    }

    state.selectedCards = [];
    replenishHand('human');

    // Check Win Condition (Hand empty AND no more sources? OR just played last card?)
    const remainingSource = getActiveSource('human');

    // Check Events
    const event = checkPileEvents();

    // WIN CHECK:
    // If player has NO cards left anywhere (source === 'done')
    // AND the card played did NOT trigger Discard/Reset.
    if (remainingSource === 'done') {
        if (event === 'discard' || event === 'reset') {
             // Illegal Win!
             showMessage("Cannot win on Special Card! Pickup!");
             performPickup('human');
             return;
        } else {
             showModal("VICTORY", "You have won the game!");
             state.turn = null;
             return;
        }
    }

    if (event === 'discard') {
        clearPileToBin();
        showMessage("Discard Event! Go again.");
        updateUI();
        return;
    }

    if (event === 'reset') {
        showMessage("Reset! Go again.");
        updateUI();
        return;
    }

    // Pass turn
    state.turn = 'ai';
    updateUI();
    setTimeout(aiTurn, 1000);
}

function aiTurn() {
    if (state.turn !== 'ai') return;

    const source = getActiveSource('ai');

    if (source === 'done') {
        showModal("DEFEAT", "Opponent has won!");
        return;
    }

    let cardsToPlay = null;

    if (source === 'hand') {
        const hand = state.players.ai.hand;
        const groups = groupCards(hand);
        const ranks = Object.keys(groups).map(Number).sort((a,b) => a - b);
        for (let r of ranks) {
            if (canBeatPile(r)) {
                cardsToPlay = groups[r];
                break;
            }
        }
    } else if (source === 'chance') {
        const cards = state.players.ai.lastChance.filter(c => c !== null);
        const groups = groupCards(cards);
        const ranks = Object.keys(groups).map(Number).sort((a,b) => a - b);
         for (let r of ranks) {
            if (canBeatPile(r)) {
                cardsToPlay = groups[r];
                break;
            }
        }
    } else if (source === 'stand') {
        // AI picks random blind card
        const indices = state.players.ai.lastStand.map((c, i) => c ? i : -1).filter(i => i !== -1);
        if (indices.length > 0) {
            const pick = indices[Math.floor(Math.random() * indices.length)];
            const card = state.players.ai.lastStand[pick];

            // Reveal
            showMessage(`Opponent revealed: ${card.display}${card.suit}`);
             if (canBeatPile(card.rank)) {
                cardsToPlay = [card];
                // Remove from source map manually later
                // Special handling for LS removal below
                state.players.ai.lastStand[pick] = null;
                state.pile.push(card);
             } else {
                 // Fail
                 state.players.ai.lastStand[pick] = null;
                 state.players.ai.hand.push(card);
                 performPickup('ai');
                 return;
             }
        }
    }

    if (cardsToPlay) {
        if (source === 'hand') {
            moveCardsToPile(cardsToPlay, 'ai');
        } else if (source === 'chance') {
             // Find indices to remove (since we grouped by value, need to find instances)
             // Simple way: iterate backwards through array slots
             cardsToPlay.forEach(c => {
                 const idx = state.players.ai.lastChance.indexOf(c);
                 if (idx !== -1) state.players.ai.lastChance[idx] = null;
             });
             state.pile.push(...cardsToPlay);
        }
        // Stand already handled

        replenishHand('ai');

        // Win Check
        if (getActiveSource('ai') === 'done') {
             const evt = checkPileEvents();
             if (evt === 'discard' || evt === 'reset') {
                 showMessage("Opponent invalid win! Pickup.");
                 performPickup('ai');
                 return;
             } else {
                 showModal("DEFEAT", "Opponent has won!");
                 state.turn = null;
                 return;
             }
        }

        const event = checkPileEvents();
        if (event === 'discard' || event === 'reset') {
            updateUI();
            setTimeout(aiTurn, 1000);
            return;
        }

        state.turn = 'human';
        updateUI();
    } else {
        performPickup('ai');
    }
}

function groupCards(list) {
    const groups = {};
    list.forEach(c => {
        if (!groups[c.rank]) groups[c.rank] = [];
        groups[c.rank].push(c);
    });
    return groups;
}

function canBeatPile(rank) {
    // 2 beats anything
    if (rank === 2) return true;

    // If pile empty, anything goes
    if (state.pile.length === 0) return true;

    const topCard = state.pile[state.pile.length - 1];
    const topRank = topCard.rank;

    // If top is 2, anything goes (Reset Event logic handles clearing, but if a 2 sits there...
    // Actually, "If a 2 is ever played it will trigger the Reset Event".
    // Meaning the next player can play anything.
    // Usually 2 clears the pile or resets value requirement.
    // Rules: "Reset Event - any card may be played next".
    // So if top is 2, effectively pile value is 0.
    if (topRank === 2) return true;

    return rank >= topRank;
}

function checkPileEvents() {
    if (state.pile.length === 0) return null;

    const topCard = state.pile[state.pile.length - 1];

    // 10 -> Discard
    if (topCard.rank === 10) return 'discard';

    // 2 -> Reset
    if (topCard.rank === 2) return 'reset';

    // 4 of a kind
    // Check last 4 cards
    if (state.pile.length >= 4) {
        const last4 = state.pile.slice(-4);
        const r = last4[0].rank;
        if (last4.every(c => c.rank === r)) return 'discard';
    }

    return null;
}

function moveCardsToPile(cards, playerKey) {
    // Remove from hand
    state.players[playerKey].hand = state.players[playerKey].hand.filter(c => !cards.includes(c));
    // Add to pile
    state.pile.push(...cards);
}

function clearPileToBin() {
    state.bin.push(...state.pile);
    state.pile = [];
}

function performPickup(playerKey) {
    showMessage(`${playerKey === 'human' ? "You" : "Opponent"} picked up!`);

    // Move pile to hand
    state.players[playerKey].hand.push(...state.pile);
    state.pile = [];

    // Sort hand for UX
    state.players[playerKey].hand.sort((a,b) => a.rank - b.rank);

    // Turn passes to NEXT player usually?
    // Rules: "Eat - ... then the next player gets to lay down".
    // So if I eat, Opponent plays.
    state.turn = playerKey === 'human' ? 'ai' : 'human';
    updateUI();

    if (state.turn === 'ai') setTimeout(aiTurn, 1000);
}

function replenishHand(playerKey) {
    // Stage 4 Rule: "Once all cards from Deck distributed... no longer need to have minimum of 3"
    if (state.deck.length === 0) return;

    while (state.players[playerKey].hand.length < 3 && state.deck.length > 0) {
        state.players[playerKey].hand.push(drawCard());
    }
    // Sort hand
    state.players[playerKey].hand.sort((a,b) => a.rank - b.rank);
}

// --- UI Rendering ---

function updateUI() {
    renderPile();
    renderDeckBin();
    renderOpponent();
    renderPlayer();
    updateButton();
}

function renderPile() {
    els.pile.innerHTML = '';
    if (state.pile.length === 0) return;

    const topCard = state.pile[state.pile.length - 1];
    const cardEl = createCardEl(topCard);
    els.pile.appendChild(cardEl);
}

function renderDeckBin() {
    els.deck.style.visibility = state.deck.length > 0 ? 'visible' : 'hidden';

    els.bin.innerHTML = '';
    if (state.bin.length > 0) {
        const topBin = state.bin[state.bin.length - 1];
        const cardEl = createCardEl(topBin);
        els.bin.appendChild(cardEl);
    }
}

function renderOpponent() {
    els.aiHandCount.innerText = state.players.ai.hand.length;

    els.aiSpecial.innerHTML = '';

    for (let i=0; i<3; i++) {
        const slot = document.createElement('div');
        slot.className = 'special-slot';

        // Last Stand (Face Down)
        if (state.players.ai.lastStand[i]) {
            const lsCard = document.createElement('div');
            lsCard.className = 'card card-back last-stand-card';
            lsCard.style.width = '100%'; lsCard.style.height = '100%';
            slot.appendChild(lsCard);
        }

        // Last Chance (Face Up)
        if (state.players.ai.lastChance[i]) {
            const lcCard = createCardEl(state.players.ai.lastChance[i]);
            lcCard.classList.add('last-chance-card');
            slot.appendChild(lcCard);
        }

        els.aiSpecial.appendChild(slot);
    }
}

function renderPlayer() {
    els.humanSpecial.innerHTML = '';
    const activeSource = getActiveSource('human');

    for (let i=0; i<3; i++) {
        const slot = document.createElement('div');
        slot.className = 'special-slot';

        // Last Stand
        if (state.players.human.lastStand[i]) {
            const lsCard = document.createElement('div');
            lsCard.className = 'card card-back last-stand-card';
            lsCard.style.width = '100%'; lsCard.style.height = '100%';

            // Interaction: Only in Stage 6 (Stand is source)
            if (activeSource === 'stand' && !state.players.human.lastChance[i] && state.turn === 'human') {
                 lsCard.style.cursor = 'pointer';
                 lsCard.style.border = '2px solid yellow';
                 if (state.selectedCards.includes(i)) {
                     lsCard.style.transform = 'scale(1.1)';
                 }
                 lsCard.onclick = () => handleSpecialClick(i, 'stand');
            }

            slot.appendChild(lsCard);
        }

        // Last Chance
        if (state.players.human.lastChance[i]) {
            const lcCard = createCardEl(state.players.human.lastChance[i]);
            lcCard.classList.add('last-chance-card');

            // Interaction for Swap Phase
            if (state.stage === 2) {
                lcCard.onclick = () => handleSwapClick(i, 'chance');
            }
            // Interaction for Stage 5 (Chance is source)
            else if (activeSource === 'chance' && state.turn === 'human') {
                lcCard.style.cursor = 'pointer';
                if (state.selectedCards.includes(i)) {
                    lcCard.classList.add('selected');
                }
                lcCard.onclick = () => handleSpecialClick(i, 'chance');
            }

            slot.appendChild(lcCard);
        }

        els.humanSpecial.appendChild(slot);
    }

    // Hand
    els.humanHand.innerHTML = '';
    const hand = state.players.human.hand;

    // Dynamic Spacing Calculation
    let margin = -5; // Default small overlap
    if (hand.length > 1) {
        const containerWidth = els.humanHand.offsetWidth || 300; // Fallback
        const cardWidth = 60; // From CSS
        const totalWidthNeeded = cardWidth * hand.length; // No overlap width

        // We want: cardWidth + (N-1) * (cardWidth + margin) <= containerWidth
        // (N-1)*(cardWidth+margin) <= containerWidth - cardWidth
        // cardWidth+margin <= (containerWidth - cardWidth) / (N-1)
        // margin <= ((containerWidth - cardWidth) / (N-1)) - cardWidth

        const maxMargin = ((containerWidth - cardWidth) / (hand.length - 1)) - cardWidth;
        // Cap margin at -5 (standard overlap) or whatever maxMargin is if it needs to be tighter (more negative)
        // Actually, we usually want at least some overlap or spacing.
        // If maxMargin is positive (plenty of space), we cap it at say 5px.
        // If maxMargin is negative (needs squeeze), we use it.

        margin = Math.min(5, maxMargin);
    }

    hand.forEach((card, idx) => {
        const cardEl = createCardEl(card);
        cardEl.className += ' hand-card';
        cardEl.style.marginLeft = idx === 0 ? '0' : `${margin}px`;

        // Ensure z-index follows order so hover works nicely
        cardEl.style.zIndex = idx;

        if (activeSource === 'hand' && state.selectedCards.includes(idx)) {
            cardEl.classList.add('selected');
        }

        // Disable clicks if not active source or not turn
        if (state.turn === 'human' && (activeSource === 'hand' || state.stage === 2)) {
            cardEl.onclick = () => handleHandClick(idx);
        } else {
             cardEl.style.opacity = '0.7';
        }

        els.humanHand.appendChild(cardEl);
    });
}

function createCardEl(card) {
    const el = document.createElement('div');
    el.className = `card ${['♥','♦'].includes(card.suit) ? 'red' : 'black'}`;
    el.innerHTML = `<div>${card.display}</div><div>${card.suit}</div>`;
    return el;
}

function updateButton() {
    if (state.stage === 2) {
        els.btn.innerText = "FINISH SWAP";
        els.btn.disabled = false;
        return;
    }

    if (state.turn === 'human') {
        const source = getActiveSource('human');

        if (source === 'hand') {
            const validMoves = getValidMoves(state.players.human.hand);
            if (validMoves.length === 0) {
                els.btn.innerText = "PICK UP";
            } else {
                els.btn.innerText = "PLAY SELECTED";
            }
        } else if (source === 'chance') {
             const validMoves = getValidMoves(state.players.human.lastChance.filter(c => c));
             if (validMoves.length === 0) {
                 els.btn.innerText = "PICK UP";
             } else {
                 els.btn.innerText = "PLAY SELECTED";
             }
        } else if (source === 'stand') {
            els.btn.innerText = "PLAY BLIND CARD";
        }

        els.btn.disabled = false;
    } else {
        els.btn.innerText = "OPPONENT TURN";
        els.btn.disabled = true;
    }
}

// --- Interactions ---

function handleHandClick(idx) {
    if (state.stage === 2) {
        if (state.selectedCards.includes(idx)) state.selectedCards = [];
        else state.selectedCards = [idx];
        renderPlayer();
        return;
    }

    if (state.turn !== 'human') return;
    if (getActiveSource('human') !== 'hand') return;

    // Toggle
    if (state.selectedCards.includes(idx)) {
        state.selectedCards = state.selectedCards.filter(i => i !== idx);
    } else {
        // Can only select same rank
        const card = state.players.human.hand[idx];
        if (state.selectedCards.length > 0) {
            const first = state.players.human.hand[state.selectedCards[0]];
            if (first.rank !== card.rank) {
                state.selectedCards = [idx];
            } else {
                state.selectedCards.push(idx);
            }
        } else {
            state.selectedCards.push(idx);
        }
    }
    renderPlayer();
}

function handleSpecialClick(idx, type) {
    if (state.turn !== 'human') return;

    // Only allow selection if correct source
    if (getActiveSource('human') !== type) return;

    if (type === 'stand') {
        // Only 1 at a time for Stand
        state.selectedCards = [idx];
        renderPlayer();
        return;
    }

    if (type === 'chance') {
         // Same rank logic
        const card = state.players.human.lastChance[idx];
        if (state.selectedCards.includes(idx)) {
            state.selectedCards = state.selectedCards.filter(i => i !== idx);
        } else {
             if (state.selectedCards.length > 0) {
                 const firstIdx = state.selectedCards[0];
                 const first = state.players.human.lastChance[firstIdx];
                 if (first.rank !== card.rank) {
                     state.selectedCards = [idx];
                 } else {
                     state.selectedCards.push(idx);
                 }
             } else {
                 state.selectedCards = [idx];
             }
        }
        renderPlayer();
    }
}

function handleSwapClick(slotIdx, type) {
    if (state.stage !== 2) return;
    if (state.selectedCards.length !== 1) return;

    const handIdx = state.selectedCards[0];
    const handCard = state.players.human.hand[handIdx];
    const specialCard = state.players.human.lastChance[slotIdx];

    // Swap
    state.players.human.hand[handIdx] = specialCard;
    state.players.human.lastChance[slotIdx] = handCard;
    state.selectedCards = [];

    renderPlayer();
}

function showMessage(msg) {
    els.msg.innerText = msg;
    els.msg.style.display = 'block';
    setTimeout(() => {
        els.msg.style.display = 'none';
    }, 2000);
}

function showModal(title, msg) {
    els.modalTitle.innerText = title;
    els.modalMsg.innerText = msg;
    els.modal.classList.remove('hidden');
    els.modalBtn.onclick = () => els.modal.classList.add('hidden');
}

function getValidMoves(hand) {
    return hand.filter(c => canBeatPile(c.rank));
}

// Start
els.btn.onclick = initGame;
