/* Truth Seekers Game - Enhanced Script without Firebase */

// Game state
const gameState = {
  gameCode: "",
  players: [],
  currentPlayerIndex: 0,
  questions: [],
  currentQuestionIndex: 0,
  fakemakerName: "",
  fakemakerUnmasked: false,
  playerName: "",
  playerRole: "",
  playerSteps: {},
  activeScreen: "startScreen",
  lastResult: { title: "", message: "" },
  gameStarted: false,
};

// Role codes
const roleCodes = [
  { code: "1288", role: "Fakemaker" },
  { code: "7523", role: "Factchecker" },
  { code: "7358", role: "Factchecker" },
  { code: "6411", role: "Factchecker" },
  { code: "9876", role: "Factchecker" },
  { code: "5432", role: "Factchecker" },
];

// DOM Elements
const screens = document.querySelectorAll(".screen");

// Shuffle questions
function shuffleQuestions() {
  for (let i = gameState.questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gameState.questions[i], gameState.questions[j]] = [
      gameState.questions[j],
      gameState.questions[i],
    ];
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Load questions from questions.json
  try {
    const response = await fetch("questions.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    gameState.questions = await response.json();
    console.log(`Loaded ${gameState.questions.length} questions from questions.json`);
    
    // Shuffle questions for variety
    shuffleQuestions();
  } catch (error) {
    console.error("Error loading questions:", error);
    alert("Kon vragen niet laden. Controleer of questions.json beschikbaar is.");
    return;
  }

  // Set up event listeners
  setupEventListeners();
  
  // Check for game code in URL
  checkForGameCodeInURL();
});

// Setup all event listeners
function setupEventListeners() {
  // Navigation buttons
  document.getElementById("hostGameBtn")?.addEventListener("click", () => showScreen("hostSetupScreen"));
  document.getElementById("goToJoinBtn")?.addEventListener("click", () => showScreen("joinGameScreen"));
  document.getElementById("backFromHostBtn")?.addEventListener("click", () => showScreen("startScreen"));
  document.getElementById("backFromJoinBtn")?.addEventListener("click", () => showScreen("startScreen"));
  
  // Game flow buttons
  document.getElementById("createGameBtn")?.addEventListener("click", createGame);
  document.getElementById("submitJoinBtn")?.addEventListener("click", joinGame);
  document.getElementById("submitRoleBtn")?.addEventListener("click", submitRoleCode);
  document.getElementById("continueAfterRoleBtn")?.addEventListener("click", continueAfterRole);
  document.getElementById("startGameBtn")?.addEventListener("click", startGame);
  document.getElementById("showQuestionBtn")?.addEventListener("click", showQuestion);
  document.getElementById("nextTurnBtn")?.addEventListener("click", nextTurn);
  document.getElementById("newGameBtn")?.addEventListener("click", resetGame);
  
  // Answer buttons
  document.getElementById("trueBtn")?.addEventListener("click", () => submitAnswer(true));
  document.getElementById("falseBtn")?.addEventListener("click", () => submitAnswer(false));
  
  // Multiple choice buttons
  for (let i = 0; i < 4; i++) {
    document.getElementById(`option${i}`)?.addEventListener("click", () => submitMultipleChoiceAnswer(i));
  }
  
  // Utility buttons
  document.getElementById("copyCodeBtn")?.addEventListener("click", copyGameCode);
  document.getElementById("shareGameBtn")?.addEventListener("click", shareGame);
}

// Show a specific screen
function showScreen(screenId) {
  screens.forEach((screen) => {
    screen.classList.remove("active");
  });
  document.getElementById(screenId)?.classList.add("active");
}

// Generate a random game code
function generateGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Sanitize player names to be valid Firebase keys
function sanitizeFirebaseKey(key) {
  if (!key) return "";
  let sanitizedKey = key.replace(/[.#$[\]]/g, "_");
  if (!sanitizedKey.trim()) return "";
  return sanitizedKey;
}

// Create a new game as host
function createGame() {
  let hostName = document.getElementById("hostNameInput").value.trim();
  if (!hostName) {
    alert("Voer je naam in");
    return;
  }
  
  hostName = sanitizeFirebaseKey(hostName);
  if (!hostName) {
    alert("De ingevoerde naam is ongeldig. Kies een andere naam.");
    return;
  }

  gameState.playerName = hostName;
  gameState.gameCode = generateGameCode();
  gameState.players = [{
    name: hostName,
    role: "",
    isHost: true,
    steps: 0,
  }];

  gameState.playerSteps[hostName] = 0;
  
  document.getElementById("gameCodeDisplay").textContent = gameState.gameCode;
  showScreen("roleCodeScreen");
}

// Join an existing game (simplified for local testing)
function joinGame() {
  let playerName = document.getElementById("playerNameInput").value.trim();
  const gameCode = document.getElementById("gameCodeInput").value.trim().toUpperCase();

  if (!playerName || !gameCode) {
    showError("joinErrorMessage", "Voer je naam en spelcode in");
    return;
  }

  playerName = sanitizeFirebaseKey(playerName);
  if (!playerName) {
    showError("joinErrorMessage", "Ongeldige naam. Kies een andere naam.");
    return;
  }

  // For local testing, just add the player
  gameState.playerName = playerName;
  gameState.gameCode = gameCode;
  
  if (!gameState.players.some(p => p.name === playerName)) {
    gameState.players.push({
      name: playerName,
      role: "",
      isHost: false,
      steps: 0,
    });
    gameState.playerSteps[playerName] = 0;
  }

  showScreen("roleCodeScreen");
}

// Submit role code
function submitRoleCode() {
  const roleCode = document.getElementById("roleCodeInput").value.trim();

  if (!roleCode) {
    showError("roleErrorMessage", "Voer een rolcode in");
    return;
  }

  const roleEntry = roleCodes.find((r) => r.code === roleCode);
  if (!roleEntry) {
    showError("roleErrorMessage", "Ongeldige rolcode");
    return;
  }

  gameState.playerRole = roleEntry.role;

  const playerIndex = gameState.players.findIndex((p) => p.name === gameState.playerName);
  if (playerIndex !== -1) {
    gameState.players[playerIndex].role = roleEntry.role;

    if (roleEntry.role === "Fakemaker") {
      gameState.fakemakerName = gameState.playerName;
    }
  }

  document.getElementById("playerRoleDisplay").textContent = roleEntry.role;

  if (roleEntry.role === "Fakemaker") {
    document.getElementById("roleInstructions").textContent = 
      "Als Fakemaker zie je de juiste antwoorden. Probeer niet op te vallen tussen de Factcheckers!";
  } else {
    document.getElementById("roleInstructions").textContent = 
      "Als Factchecker probeer je te ontdekken wie de Fakemaker is door hun antwoorden te observeren.";
  }

  showScreen("roleConfirmationScreen");
}

// Continue after role confirmation
function continueAfterRole() {
  const currentPlayer = gameState.players.find(p => p.name === gameState.playerName);
  if (currentPlayer && currentPlayer.isHost) {
    updatePlayerList();
    showScreen("hostGameScreen");
  } else {
    showScreen("gameScreen");
    updateGameDisplay();
  }
}

// Start game (host only)
function startGame() {
  if (!gameState.players.some((player) => player.role)) {
    alert("Spelers moeten eerst rollen toegewezen krijgen.");
    return;
  }

  gameState.gameStarted = true;
  gameState.activeScreen = "gameScreen";
  updateGameDisplay();
  showScreen("gameScreen");
}

// Show current question
function showQuestion() {
  if (gameState.currentQuestionIndex >= gameState.questions.length) {
    alert("Alle vragen zijn beantwoord!");
    return;
  }

  const question = gameState.questions[gameState.currentQuestionIndex];
  
  // Update question display - remove "vraag X:" prefix if present
  let questionTitle = `Vraag ${gameState.currentQuestionIndex + 1}`;
  document.getElementById("questionNumber").textContent = questionTitle;
  document.getElementById("questionContent").textContent = question.content;

  // Handle different question types
  if (question.type === "multiple_choice") {
    // Show multiple choice buttons
    document.getElementById("trueFalseButtons").classList.add("hidden");
    document.getElementById("multipleChoiceButtons").classList.remove("hidden");
    
    // Set up options
    question.options.forEach((option, index) => {
      const button = document.getElementById(`option${index}`);
      if (button) {
        button.textContent = option;
        button.style.display = "block";
      }
    });
    
    // Hide unused option buttons
    for (let i = question.options.length; i < 4; i++) {
      const button = document.getElementById(`option${i}`);
      if (button) {
        button.style.display = "none";
      }
    }
  } else {
    // Show true/false buttons for image/video questions
    document.getElementById("trueFalseButtons").classList.remove("hidden");
    document.getElementById("multipleChoiceButtons").classList.add("hidden");
  }

  // Handle media content
  handleMediaContent(question);

  showScreen("questionScreen");
}

// Handle media content (images, videos, PDFs)
function handleMediaContent(question) {
  // Hide all media containers first
  document.getElementById("imageContainer").classList.add("hidden");
  document.getElementById("videoContainer").classList.add("hidden");
  document.getElementById("externalActionContainer").classList.add("hidden");

  if (question.imagePath) {
    if (question.imagePath.endsWith('.pdf')) {
      // Handle PDF files
      document.getElementById("externalActionContainer").classList.remove("hidden");
      document.getElementById("externalActionPrompt").innerHTML = 
        `<p>Bekijk het document:</p><a href="${question.imagePath}" target="_blank" class="pdf-direct-link">Open PDF</a>`;
    } else {
      // Handle image files
      document.getElementById("imageContainer").classList.remove("hidden");
      document.getElementById("questionImage").src = question.imagePath;
    }
  } else if (question.videoUrl) {
    // Handle video files
    document.getElementById("videoContainer").classList.remove("hidden");
    const videoElement = document.getElementById("questionVideo");
    const sourceElement = document.getElementById("videoSource");
    
    if (question.videoUrl.includes('youtube.com') || question.videoUrl.includes('youtu.be')) {
      // For YouTube videos, show link instead of embed
      document.getElementById("videoContainer").classList.add("hidden");
      document.getElementById("externalActionContainer").classList.remove("hidden");
      document.getElementById("externalActionPrompt").innerHTML = 
        `<p>Bekijk de video:</p><a href="${question.videoUrl}" target="_blank" class="pdf-direct-link">Open YouTube Video</a>`;
    } else {
      // For direct video files
      sourceElement.src = question.videoUrl;
      videoElement.load();
    }
  }
}

// Submit true/false answer
function submitAnswer(answer) {
  const question = gameState.questions[gameState.currentQuestionIndex];
  const isCorrect = answer === question.answer;
  
  processAnswer(isCorrect, answer);
}

// Submit multiple choice answer
function submitMultipleChoiceAnswer(optionIndex) {
  const question = gameState.questions[gameState.currentQuestionIndex];
  const isCorrect = optionIndex === question.correctOption;
  
  processAnswer(isCorrect, optionIndex);
}

// Process answer and update game state
function processAnswer(isCorrect, playerAnswer) {
  // Update player steps
  const currentPlayer = gameState.players.find(p => p.name === gameState.playerName);
  if (currentPlayer) {
    if (isCorrect) {
      currentPlayer.steps += 1;
      gameState.playerSteps[gameState.playerName] = currentPlayer.steps;
    }
  }

  // Show result
  const resultTitle = isCorrect ? "Correct!" : "Fout!";
  const resultMessage = isCorrect ? 
    "Je hebt het juiste antwoord gegeven!" : 
    "Helaas, dat was niet het juiste antwoord.";

  document.getElementById("resultTitle").textContent = resultTitle;
  document.getElementById("resultMessage").textContent = resultMessage;
  document.getElementById("stepsDisplayResult").textContent = gameState.playerSteps[gameState.playerName] || 0;
  
  const stepChange = isCorrect ? "+1 stap" : "Geen stappen";
  document.getElementById("stepChange").textContent = stepChange;

  showScreen("resultScreen");
}

// Move to next turn
function nextTurn() {
  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  gameState.currentQuestionIndex += 1;

  updateGameDisplay();
  showScreen("gameScreen");
}

// Reset game
function resetGame() {
  // Reset game state
  Object.assign(gameState, {
    gameCode: "",
    players: [],
    currentPlayerIndex: 0,
    currentQuestionIndex: 0,
    fakemakerName: "",
    fakemakerUnmasked: false,
    playerName: "",
    playerRole: "",
    playerSteps: {},
    activeScreen: "startScreen",
    lastResult: { title: "", message: "" },
    gameStarted: false,
  });

  // Shuffle questions again
  shuffleQuestions();
  
  showScreen("startScreen");
}

// Copy game code to clipboard
function copyGameCode() {
  const gameCode = document.getElementById("gameCodeDisplay").textContent;
  navigator.clipboard.writeText(gameCode).then(() => {
    const successMsg = document.getElementById("shareSuccessMessage");
    if (successMsg) {
      successMsg.textContent = "Spelcode gekopieerd!";
      successMsg.classList.remove("hidden");
      setTimeout(() => successMsg.classList.add("hidden"), 3000);
    }
  }).catch(err => {
    console.error("Could not copy text: ", err);
  });
}

// Share game
function shareGame() {
  const gameUrl = `${window.location.origin}${window.location.pathname}?code=${gameState.gameCode}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Truth Seekers Game',
      text: `Doe mee met mijn Truth Seekers spel! Code: ${gameState.gameCode}`,
      url: gameUrl
    });
  } else {
    navigator.clipboard.writeText(gameUrl).then(() => {
      const successMsg = document.getElementById("shareSuccessMessage");
      if (successMsg) {
        successMsg.textContent = "Spellink gekopieerd!";
        successMsg.classList.remove("hidden");
        setTimeout(() => successMsg.classList.add("hidden"), 3000);
      }
    });
  }
}

// Show error message
function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
    setTimeout(() => errorElement.classList.add("hidden"), 3000);
  }
}

// Update player list in host screen
function updatePlayerList() {
  const playerListElement = document.getElementById("hostPlayerList");
  if (!playerListElement) return;
  
  playerListElement.innerHTML = "";

  gameState.players.forEach((player) => {
    const playerItem = document.createElement("div");
    playerItem.className = "player-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "player-name";
    nameSpan.textContent = player.name;

    const roleSpan = document.createElement("span");
    roleSpan.className = "player-role";
    roleSpan.textContent = player.role ? "Rol toegewezen" : "Geen rol";

    playerItem.appendChild(nameSpan);
    playerItem.appendChild(roleSpan);
    playerListElement.appendChild(playerItem);
  });

  // Enable start button if conditions are met
  const startBtn = document.getElementById("startGameBtn");
  if (startBtn) {
    startBtn.disabled = gameState.players.length < 1 || !gameState.players.some((p) => p.role);
  }
}

// Update game display
function updateGameDisplay() {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (currentPlayer) {
    const currentPlayerDisplay = document.getElementById("currentPlayerDisplay");
    if (currentPlayerDisplay) {
      currentPlayerDisplay.textContent = currentPlayer.name;
    }
  }

  // Show/hide turn info based on current player
  const yourTurnInfo = document.getElementById("yourTurnInfo");
  if (yourTurnInfo) {
    if (currentPlayer && currentPlayer.name === gameState.playerName) {
      yourTurnInfo.style.display = "block";
    } else {
      yourTurnInfo.style.display = "none";
    }
  }
}

// Check for game code in URL
function checkForGameCodeInURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameCode = urlParams.get('code');
  
  if (gameCode) {
    const gameCodeInput = document.getElementById("gameCodeInput");
    if (gameCodeInput) {
      gameCodeInput.value = gameCode;
      showScreen("joinGameScreen");
    }
  }
}

