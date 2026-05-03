let currentMode = 1;
let levels = [], currentIdx = 0, classifier, inputRefs = [], currentDoodleLabel = "", isDrawing = false;
let currentAcceptedEmojis = [];

async function setupML() {
    classifier = await ml5.imageClassifier('DoodleNet', () => { 
        document.getElementById('status').innerText = "AI HAZIR"; 
    });
    const res = await fetch('levels.json');
    levels = await res.json();
}

function showModeSelection() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('mode-selection').style.display = 'flex';
}

function goToMenu() { location.reload(); }

function startLevel(mode) {
    currentMode = mode;
    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('clear-btn').style.visibility = (mode === 1) ? 'visible' : 'hidden';
    initGame();
}

function initGame() {
    const modeLevels = levels.filter(l => l.mode === currentMode);
    if(modeLevels.length === 0) return alert("Bu modda seviye yok!");
    
    const data = modeLevels[currentIdx % modeLevels.length];
    const row = document.getElementById('game-row');
    document.getElementById('target').innerText = data.word;
    row.innerHTML = '';
    inputRefs = [];
    currentAcceptedEmojis = [];

    data.segments.forEach(seg => {
        if (seg.type === "draw") {
            currentDoodleLabel = seg.label;
            const cBox = document.createElement('div');
            cBox.className = 'canvas-box';
            cBox.innerHTML = `<canvas id="cvs"></canvas>`;
            row.appendChild(cBox);
            setupCanvas();
        } else if (seg.type === "emoji") {
            currentAcceptedEmojis = seg.accepted || [];
            const eBox = document.createElement('div');
            eBox.className = 'emoji-input-box';
            eBox.innerHTML = `<input type="text" id="emoji-in" placeholder="😃" oninput="limitEmoji(this)">`;
            row.appendChild(eBox);
        } else if (seg.type === "text" || seg.type === "number") {
            seg.value.split('').forEach(char => {
                const box = document.createElement('div');
                box.className = (seg.type === "number") ? 'number-box' : 'letter-box';
                const id = `I${inputRefs.length}`;
                box.innerHTML = `<input type="text" id="${id}" maxlength="1" autocomplete="off">`;
                row.appendChild(box);
                inputRefs.push({ id, correct: char.toUpperCase() });
            });
        }
    });
}

function limitEmoji(el) {
    let chars = Array.from(el.value);
    if (chars.length > 1) el.value = chars[chars.length - 1];
}

async function check() {
    let inputsOk = inputRefs.every(ref => document.getElementById(ref.id).value.toUpperCase() === ref.correct);
    if (!inputsOk) return alert("Hatalı!");

    if (currentMode === 1) {
        const res = await classifier.classify(document.getElementById('cvs'));
        if (res.slice(0, 3).some(r => r.label === currentDoodleLabel)) showSuccess();
        else alert("Tanınmadı!");
    } else if (currentMode === 2) {
        if (currentAcceptedEmojis.includes(document.getElementById('emoji-in').value)) showSuccess();
        else alert("Yanlış Emoji!");
    } else { showSuccess(); }
}

function showSuccess() {
    confetti({ particleCount: 200, spread: 70 });
    document.getElementById('success-card').style.display = 'flex';
}

function nextLevel() {
    document.getElementById('success-card').style.display = 'none';
    currentIdx++;
    initGame();
}

function setupCanvas() {
    const c = document.getElementById('cvs');
    const ctx = c.getContext('2d');
    const rect = c.parentElement.getBoundingClientRect();
    c.width = rect.width * 2; c.height = rect.height * 2;
    ctx.fillStyle = "white"; ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle = "black"; ctx.lineWidth = 10; ctx.lineCap = "round";
    const getPos = (e) => {
        const r = c.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - r.left) * (c.width / r.width), y: (clientY - r.top) * (c.height / r.height) };
    };
    c.onmousedown = c.ontouchstart = (e) => { isDrawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); };
    c.onmousemove = c.ontouchmove = (e) => { if(!isDrawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    window.onmouseup = window.ontouchend = () => isDrawing = false;
}

function clearDraw() {
    const c = document.getElementById('cvs');
    if(c) c.getContext('2d').fillRect(0,0,c.width,c.height);
}

setupML();
