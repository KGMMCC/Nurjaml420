"use strict";

// ========== গ্লোবাল স্টেট ==========
let players = [];
let totalScores = [];
let playerStats = [];
let roundHistory = [];
let currentRound = 1;
let currentCallValues = [];
let gameActive = false;

// ========== ডোম এলিমেন্ট ==========
const setupPanel = document.getElementById('setupPanel');
const gamePanel = document.getElementById('gamePanel');
const bonusArea = document.getElementById('bonusArea');
const callArea = document.getElementById('callArea');
const callPhase = document.getElementById('callPhase');
const trickPhase = document.getElementById('trickPhase');
const roundTitle = document.getElementById('roundTitle');
const currentRoundSpan = document.getElementById('currentRound');
const totalRoundsSpan = document.getElementById('totalRounds');
const scoreboardBody = document.getElementById('scoreboardBody');
const nameFieldsContainer = document.getElementById('nameFieldsContainer');
const statusText = document.getElementById('statusText');
const statusPhase = document.getElementById('statusPhase');
const toastContainer = document.getElementById('toastContainer');
const confettiCanvas = document.getElementById('confettiCanvas');
const particlesContainer = document.getElementById('particles');

// ========== থিম ম্যানেজমেন্ট ==========
function setTheme(theme) {
  document.body.className = `theme-${theme}`;
  
  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.querySelector(`.theme-option[onclick="setTheme('${theme}')"]`).classList.add('active');
  
  localStorage.setItem('breezeTheme', theme);
  showToast(`${theme} থিম অ্যাক্টিভেটেড`, 'success');
}

// ========== পার্টিকেল ইফেক্ট ==========
function createParticles() {
  if (!particlesContainer) return;
  
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement('div');
    particle.style.cssText = `
      position: absolute;
      width: ${Math.random() * 3}px;
      height: ${Math.random() * 3}px;
      background: rgba(255, 255, 255, ${Math.random() * 0.3});
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation: float ${Math.random() * 10 + 5}s linear infinite;
      pointer-events: none;
    `;
    particlesContainer.appendChild(particle);
  }
}

// ========== প্যানেল সুইচিং ==========
function switchPanel(panel) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  
  if (panel === 'setup') {
    setupPanel.classList.add('active');
    event.currentTarget.classList.add('active');
  } else if (panel === 'game') {
    if (players.length > 0) {
      gamePanel.classList.add('active');
      event.currentTarget.classList.add('active');
    } else {
      showToast('প্রথমে খেলোয়াড় সেটআপ করুন', 'error');
    }
  }
}

// ========== কাউন্ট অ্যাডজাস্ট ==========
function adjustCount(delta) {
  const input = document.getElementById('playerCount');
  let value = parseInt(input.value) + delta;
  if (value < 2) value = 2;
  if (value > 6) value = 6;
  input.value = value;
}

// ========== টোস্ট নোটিফিকেশন ==========
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';
  
  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ========== কনফেটি ইফেক্ট ==========
function shootConfetti() {
  const canvas = confettiCanvas;
  const ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const particles = [];
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
  
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: Math.random() * 5 + 2,
      angle: Math.random() * Math.PI * 2
    });
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let stillFalling = false;
    
    particles.forEach(p => {
      p.y += p.speed;
      p.x += Math.sin(p.angle) * 0.5;
      
      if (p.y < canvas.height + 50) {
        stillFalling = true;
      }
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
    
    if (stillFalling) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  
  animate();
}

// ========== নাম ফিল্ড জেনারেট ==========
function generateNameFields() {
  const count = parseInt(document.getElementById('playerCount').value);
  
  const avatars = ['👑', '⚡', '🌟', '🔥', '💎', '🎯'];
  let html = '';
  
  for (let i = 0; i < count; i++) {
    html += `
      <div class="name-input-wrapper">
        <span class="player-avatar">${avatars[i]}</span>
        <input type="text" id="playerName${i}" 
               placeholder="প্লেয়ার ${i+1}" 
               value="প্লেয়ার ${i+1}">
      </div>
    `;
  }
  
  nameFieldsContainer.innerHTML = html;
  showToast(`${count} জন প্লেয়ারের ফিল্ড তৈরি হয়েছে`, 'success');
}

// ========== গেম স্টার্ট ==========
function startBonusRound() {
  const count = parseInt(document.getElementById('playerCount').value);
  
  // প্লেয়ার নাম সংগ্রহ
  players = [];
  playerStats = [];
  
  for (let i = 0; i < count; i++) {
    let nameField = document.getElementById(`playerName${i}`);
    let name = nameField ? nameField.value.trim() : '';
    if (name === '') name = `প্লেয়ার ${i+1}`;
    players.push(name);
    playerStats.push({
      correctCalls: 0,
      bonusPoints: 0,
      totalRounds: 0
    });
  }
  
  totalScores = new Array(players.length).fill(0);
  currentRound = 1;
  roundHistory = [];
  currentCallValues = [];
  
  // UI আপডেট
  setupPanel.classList.remove('active');
  gamePanel.classList.add('active');
  
  document.querySelectorAll('.nav-item')[0].classList.remove('active');
  document.querySelectorAll('.nav-item')[1].classList.add('active');
  
  updateRoundCounter();
  showBonusRound();
  updateScoreboard();
  updateStatus('বোনাস রাউন্ড চলছে', '🎁');
  showToast('বোনাস রাউন্ড শুরু হয়েছে!', 'success');
}

// ========== বোনাস রাউন্ড দেখান ==========
function showBonusRound() {
  bonusArea.style.display = 'block';
  callArea.style.display = 'none';
  roundTitle.innerHTML = '🎁 বোনাস রাউন্ড';
  
  const grid = document.getElementById('bonusPlayersGrid');
  grid.innerHTML = '';
  
  players.forEach((player, idx) => {
    const card = createPlayerCard(player, idx, 'bonus');
    grid.appendChild(card);
  });
}

// ========== প্লেয়ার কার্ড তৈরি ==========
function createPlayerCard(player, idx, type) {
  const card = document.createElement('div');
  card.className = 'player-card';
  
  const avatars = ['👑', '⚡', '🌟', '🔥', '💎', '🎯'];
  
  if (type === 'bonus') {
    card.innerHTML = `
      <div class="player-card-header">
        <span class="player-avatar-large">${avatars[idx]}</span>
        <h4>${player}</h4>
      </div>
      <div class="input-pair">
        <label>উঠেছে</label>
        <input type="number" id="bonus${idx}" min="0" value="" placeholder="০" step="1">
      </div>
      <div class="hint">
        <i class="fas fa-gift"></i>
        বোনাস রাউন্ডে সব উঠানো যোগ হবে
      </div>
    `;
  } else if (type === 'call') {
    card.innerHTML = `
      <div class="player-card-header">
        <span class="player-avatar-large">${avatars[idx]}</span>
        <h4>${player}</h4>
      </div>
      <div class="input-pair">
        <label>কল</label>
        <input type="number" id="call${idx}" min="0" value="" placeholder="০" step="1">
      </div>
      <div class="hint">
        <i class="fas fa-lightbulb"></i>
        আপনি কত trick পাবেন মনে করেন?
      </div>
    `;
  } else if (type === 'trick') {
    card.innerHTML = `
      <div class="player-card-header">
        <span class="player-avatar-large">${avatars[idx]}</span>
        <h4>${player}</h4>
      </div>
      <div class="call-summary">
        <span class="call-badge">কল: ${currentCallValues[idx] || 0}</span>
      </div>
      <div class="input-pair">
        <label>উঠেছে</label>
        <input type="number" id="trick${idx}" min="0" value="" placeholder="০" step="1">
      </div>
      <div class="hint">
        <i class="fas fa-calculator"></i>
        কলের সাথে মিলিয়ে স্কোর হবে
      </div>
    `;
  }
  
  return card;
}

// ========== বোনাস রাউন্ড সাবমিট ==========
function submitBonusRound() {
  if (currentRound !== 1) return;
  
  let hasValue = false;
  const roundData = {
    round: 1,
    type: 'bonus',
    players: []
  };
  
  players.forEach((_, i) => {
    const input = document.getElementById(`bonus${i}`);
    let got = parseInt(input?.value, 10) || 0;
    if (got > 0) hasValue = true;
    
    totalScores[i] += got;
    
    roundData.players.push({
      name: players[i],
      got: got,
      score: got
    });
  });
  
  if (!hasValue) {
    showToast('অনুগ্রহ করে উঠানো সংখ্যা দিন', 'error');
    return;
  }
  
  roundHistory.push(roundData);
  
  currentRound = 2;
  updateRoundCounter();
  roundTitle.innerHTML = '📞 কল রাউন্ড';
  
  bonusArea.style.display = 'none';
  callArea.style.display = 'block';
  callPhase.classList.remove('hidden');
  trickPhase.classList.add('hidden');
  
  loadCallPhase();
  updateScoreboard();
  updateStatus('কল ফেজ - সবাই কল দিন', '📞');
  showToast('বোনাস রাউন্ড জমা হয়েছে!', 'success');
}

// ========== কল ফেজ লোড ==========
function loadCallPhase() {
  const grid = document.getElementById('callPlayersGrid');
  grid.innerHTML = '';
  
  players.forEach((player, idx) => {
    const card = createPlayerCard(player, idx, 'call');
    grid.appendChild(card);
  });
}

// ========== কল ফেজ সাবমিট ==========
function submitCallPhase() {
  currentCallValues = [];
  let hasValue = false;
  
  players.forEach((_, i) => {
    const input = document.getElementById(`call${i}`);
    let call = parseInt(input?.value, 10) || 0;
    currentCallValues[i] = call;
    if (call > 0) hasValue = true;
  });
  
  if (!hasValue) {
    showToast('অনুগ্রহ করে কল দিন', 'error');
    return;
  }
  
  callPhase.classList.add('hidden');
  trickPhase.classList.remove('hidden');
  
  loadTrickPhase();
  updateStatus('ট্রিক ফেজ - কত trick উঠলো দিন', '🎯');
  showToast('কল সাবমিট হয়েছে!', 'success');
}

// ========== ট্রিক ফেজ লোড ==========
function loadTrickPhase() {
  const grid = document.getElementById('trickPlayersGrid');
  grid.innerHTML = '';
  
  players.forEach((player, idx) => {
    const card = createPlayerCard(player, idx, 'trick');
    grid.appendChild(card);
  });
}

// ========== ট্রিক ফেজ সাবমিট ==========
function submitTrickPhase() {
  let hasValue = false;
  const roundData = {
    round: currentRound,
    type: 'call',
    players: []
  };
  
  players.forEach((_, i) => {
    const input = document.getElementById(`trick${i}`);
    let got = parseInt(input?.value, 10) || 0;
    if (got > 0) hasValue = true;
    
    let call = currentCallValues[i] || 0;
    let score = calculateScore(call, got);
    
    totalScores[i] += score;
    
    if (call === got) playerStats[i].correctCalls++;
    if (got > call) playerStats[i].bonusPoints += (got - call);
    playerStats[i].totalRounds++;
    
    roundData.players.push({
      name: players[i],
      call: call,
      got: got,
      score: score
    });
  });
  
  if (!hasValue) {
    showToast('অনুগ্রহ করে উঠানো সংখ্যা দিন', 'error');
    return;
  }
  
  roundHistory.push(roundData);
  
  currentRound++;
  updateRoundCounter();
  
  callPhase.classList.remove('hidden');
  trickPhase.classList.add('hidden');
  
  loadCallPhase();
  updateScoreboard();
  updateStatus(`রাউন্ড ${currentRound} - কল ফেজ শুরু`, '📞');
  showToast(`রাউন্ড ${currentRound-1} সম্পন্ন!`, 'success');
}

// ========== স্কোর ক্যালকুলেশন ==========
function calculateScore(call, got) {
  call = parseInt(call, 10) || 0;
  got = parseInt(got, 10) || 0;
  
  if (got > call) {
    return call + ((got - call) * 0.1);
  } else if (call === got) {
    return call;
  } else {
    return -call;
  }
}

// ========== স্কোরবোর্ড আপডেট ==========
function updateScoreboard() {
  if (!players.length) return;
  
  let html = '';
  
  // ফর্ম ক্যালকুলেশন
  players.forEach((player, i) => {
    let form = '⚪';
    if (playerStats[i].totalRounds > 0) {
      const correctRatio = playerStats[i].correctCalls / playerStats[i].totalRounds;
      if (correctRatio > 0.6) form = '🔥';
      else if (correctRatio < 0.3) form = '❄️';
    }
    
    const avatars = ['👑', '⚡', '🌟', '🔥', '💎', '🎯'];
    
    html += `
      <tr>
        <td>
          <span style="margin-right: 8px;">${avatars[i]}</span>
          ${player}
        </td>
        <td class="score-cell">${totalScores[i].toFixed(1)}</td>
        <td>${playerStats[i].correctCalls}</td>
        <td>${playerStats[i].bonusPoints}</td>
        <td>${form}</td>
      </tr>
    `;
  });
  
  scoreboardBody.innerHTML = html;
}

// ========== রাউন্ড কাউন্টার আপডেট ==========
function updateRoundCounter() {
  currentRoundSpan.textContent = currentRound;
  totalRoundsSpan.textContent = roundHistory.length + 1;
}

// ========== স্ট্যাটাস আপডেট ==========
function updateStatus(text, emoji) {
  statusText.textContent = text;
  statusPhase.textContent = emoji;
}

// ========== স্ট্যাটস টগল ==========
function toggleStats() {
  const panel = document.getElementById('statsPanel');
  const grid = document.getElementById('statsGrid');
  
  if (panel.classList.contains('hidden')) {
    // স্ট্যাটস আপডেট
    const totalRounds = roundHistory.length;
    const callRounds = roundHistory.filter(r => r.type === 'call').length;
    const totalCorrect = playerStats.reduce((acc, s) => acc + s.correctCalls, 0);
    const totalBonus = playerStats.reduce((acc, s) => acc + s.bonusPoints, 0);
    
    grid.innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${totalRounds}</div>
        <div class="stat-label">মোট রাউন্ড</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${callRounds}</div>
        <div class="stat-label">কল রাউন্ড</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${totalCorrect}</div>
        <div class="stat-label">সঠিক কল</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${totalBonus.toFixed(1)}</div>
        <div class="stat-label">বোনাস</div>
      </div>
    `;
    
    panel.classList.remove('hidden');
  } else {
    panel.classList.add('hidden');
  }
}

// ========== স্কোরবোর্ড রিফ্রেশ ==========
function refreshBoard() {
  updateScoreboard();
  showToast('স্কোরবোর্ড রিফ্রেশ করা হয়েছে', 'info');
}

// ========== গেম শেষ ==========
function endGame() {
  if (!players.length) return;
  openLeaderboard();
  shootConfetti();
}

// ========== লিডারবোর্ড খুলুন ==========
function openLeaderboard() {
  if (!players.length) {
    showToast('কোনো গেম ডাটা নেই', 'error');
    return;
  }
  
  const sorted = players.map((p, i) => ({
    name: p,
    score: totalScores[i],
    stats: playerStats[i]
  })).sort((a, b) => b.score - a.score);
  
  const podium = document.getElementById('podiumContainer');
  const list = document.getElementById('leaderboardList');
  
  // পোডিয়াম
  podium.innerHTML = '';
  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    const p = sorted[i];
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
    const medals = ['🥇', '🥈', '🥉'];
    
    podium.innerHTML += `
      <div class="podium-item">
        <div class="podium-rank" style="background: ${colors[i]};">${medals[i]}</div>
        <div class="podium-name">${p.name}</div>
        <div class="podium-score">${p.score.toFixed(1)}</div>
      </div>
    `;
  }
  
  // লিডারবোর্ড লিস্ট
  list.innerHTML = '<h3 style="margin-bottom: 1rem;">ফাইনাল র‌্যাঙ্কিং</h3>';
  
  sorted.forEach((p, i) => {
    const medal = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
    const color = i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : 'var(--primary)';
    
    list.innerHTML += `
      <div class="leaderboard-item">
        <div class="leaderboard-rank" style="background: ${color};">${medal}</div>
        <div class="leaderboard-info">
          <span class="leaderboard-name">${p.name}</span>
          <span class="leaderboard-score">${p.score.toFixed(1)}</span>
        </div>
      </div>
    `;
  });
  
  document.getElementById('leaderboardModal').style.display = 'flex';
}

// ========== হিস্ট্রি খুলুন ==========
function openHistory() {
  if (roundHistory.length === 0) {
    showToast('কোনো হিস্ট্রি নেই', 'error');
    return;
  }
  
  const container = document.getElementById('historyContainer');
  container.innerHTML = '';
  
  roundHistory.slice().reverse().forEach((round, idx) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    
    let html = `
      <div class="history-round">
        <i class="fas ${round.type === 'bonus' ? 'fa-gift' : 'fa-phone'}"></i>
        রাউন্ড ${round.round} (${round.type === 'bonus' ? 'বোনাস' : 'কল'})
      </div>
    `;
    
    round.players.forEach(p => {
      if (round.type === 'bonus') {
        html += `
          <div class="history-detail">
            <span>${p.name}</span>
            <span>উঠেছে: ${p.got} = +${p.score}</span>
          </div>
        `;
      } else {
        html += `
          <div class="history-detail">
            <span>${p.name}</span>
            <span>কল: ${p.call}, উঠেছে: ${p.got} = ${p.score.toFixed(1)}</span>
          </div>
        `;
      }
    });
    
    div.innerHTML = html;
    container.appendChild(div);
  });
  
  document.getElementById('historyModal').style.display = 'flex';
}

// ========== মডাল ক্লোজ ==========
function closeLeaderboard() {
  document.getElementById('leaderboardModal').style.display = 'none';
}

function closeHistory() {
  document.getElementById('historyModal').style.display = 'none';
}

// ========== নতুন গেম ==========
function newGame() {
  players = [];
  totalScores = [];
  playerStats = [];
  roundHistory = [];
  currentRound = 1;
  currentCallValues = [];
  
  localStorage.removeItem('breezeGame');
  
  document.getElementById('leaderboardModal').style.display = 'none';
  gamePanel.classList.remove('active');
  setupPanel.classList.add('active');
  
  document.querySelectorAll('.nav-item')[1].classList.remove('active');
  document.querySelectorAll('.nav-item')[0].classList.add('active');
  
  showToast('নতুন গেম শুরু! সেটআপ করুন', 'success');
}

// ========== গেম সেভ/লোড ==========
function saveGame() {
  const state = {
    players,
    totalScores,
    playerStats,
    roundHistory,
    currentRound,
    currentCallValues
  };
  localStorage.setItem('breezeGame', JSON.stringify(state));
}

function loadGame() {
  const saved = localStorage.getItem('breezeGame');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      players = state.players || [];
      totalScores = state.totalScores || [];
      playerStats = state.playerStats || [];
      roundHistory = state.roundHistory || [];
      currentRound = state.currentRound || 1;
      currentCallValues = state.currentCallValues || [];
      
      if (players.length > 0) {
        setupPanel.classList.remove('active');
        gamePanel.classList.add('active');
        
        if (currentRound === 1) {
          showBonusRound();
        } else {
          roundTitle.innerHTML = '📞 কল রাউন্ড';
          bonusArea.style.display = 'none';
          callArea.style.display = 'block';
          callPhase.classList.remove('hidden');
          trickPhase.classList.add('hidden');
          loadCallPhase();
        }
        
        updateScoreboard();
        showToast('গেম লোড করা হয়েছে', 'success');
      }
    } catch (e) {
      console.error('লোড করতে সমস্যা:', e);
    }
  }
}

// ========== অটো সেভ ==========
setInterval(() => {
  if (players.length > 0) saveGame();
}, 30000);

// ========== উইন্ডো লোড ==========
window.onload = function() {
  // থিম লোড
  const savedTheme = localStorage.getItem('breezeTheme') || 'pro';
  setTheme(savedTheme);
  
  // পার্টিকেল তৈরি
  createParticles();
  
  // ডিফল্ট নাম ফিল্ড
  generateNameFields();
  
  // গেম লোড
  loadGame();
  
  // কীবোর্ড শর্টকাট
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLeaderboard();
      closeHistory();
    }
  });
};

// ========== গ্লোবাল ফাংশন ==========
window.switchPanel = switchPanel;
window.setTheme = setTheme;
window.adjustCount = adjustCount;
window.generateNameFields = generateNameFields;
window.startBonusRound = startBonusRound;
window.submitBonusRound = submitBonusRound;
window.submitCallPhase = submitCallPhase;
window.submitTrickPhase = submitTrickPhase;
window.endGame = endGame;
window.openLeaderboard = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;
window.openHistory = openHistory;
window.closeHistory = closeHistory;
window.newGame = newGame;
window.toggleStats = toggleStats;
window.refreshBoard = refreshBoard;
