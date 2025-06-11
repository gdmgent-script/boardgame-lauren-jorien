/* Truth Seekers Game - Enhanced Script with Firebase */

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

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWuEvMYs1bEZs8OV8TRaILoI_HA2Urx4I",
  authDomain: "truth-seekers-lauren.firebaseapp.com",
  databaseURL: "https://truth-seekers-lauren-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "truth-seekers-lauren",
  storageBucket: "truth-seekers-lauren.appspot.com",
  messagingSenderId: "342706717766",
  appId: "1:342706717766:web:83349268a19770cd35f647",
  measurementId: "G-4Q61SPTCF9",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

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
    const questionsData = await response.json();
    if (!questionsData || questionsData.length === 0) {
      // Ensure questionsData is an array and not empty
      throw new Error("Questions data is empty or invalid. Ensure questions.json contains a valid array of questions.");
    }
    gameState.questions = questionsData;
    console.log(`Loaded ${gameState.questions.length} questions.`);
    shuffleQuestions(); // Shuffle questions for variety
  } catch (error) {
    console.error("Error loading questions:", error);
    alert(`Fout bij het laden van de vragen: ${error.message}. Controleer of 'questions.json' beschikbaar is in dezelfde map als het spel en correct geformatteerd is. Het spel kan niet starten zonder vragen.`);
    // Optionally, display a persistent error message on the page if the alert is dismissed
    // document.body.innerHTML = "<p style='color:red; text-align:center; padding-top: 50px;'>Kan het spel niet starten: Kon de vragen niet laden. Vernieuw de pagina en controleer 'questions.json'.</p>";
    return;
  }

  // Set up event listeners
  setupEventListeners();
  
  // Check for game code in URL, which might change gameState.activeScreen and call showScreen
  checkForGameCodeInURL();

  // Ensure the correct screen (either from URL or default "startScreen") is shown.
  // showScreen is called by checkForGameCodeInURL if a code is found.
  const currentVisibleScreen = document.querySelector('.screen.active');
  if (!currentVisibleScreen || currentVisibleScreen.id !== gameState.activeScreen) {
    showScreen(gameState.activeScreen);
  }
  startListeningForUpdates();
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
async function createGame() {
  let hostName = document.getElementById("hostNameInput").value.trim();
  if (!hostName) {
    alert("Voer je naam in");
    return;
  }
  
  hostName = sanitizeFirebaseKey(hostName);
  if (!hostName) {
    alert("De ingevoerde naam is ongeldig na het verwijderen van speciale tekens (zoals ., #, $, [, ]). Kies een andere naam.");
    return;
  }

  // Show loading indicator
  const createBtn = document.getElementById("createGameBtn");
  createBtn.disabled = true;
  createBtn.textContent = "Spel aanmaken...";

  gameState.playerName = hostName;
  gameState.gameCode = generateGameCode();
  gameState.players = [{
    name: hostName,
    role: "",
    isHost: true,
    steps: 0,
  }];

  // Initialize player steps
  gameState.playerSteps[hostName] = 0;

  try {
    gameState.activeScreen = "roleCodeScreen"; // Host proceeds to role code screen

    // Save game to Firebase
    console.log("Attempting to save new game to Firebase:", gameState.gameCode);
    await saveGameToFirebase();

    // Start listening for updates (if not already started)
    startListeningForUpdates();
    // Display game code
    document.getElementById("gameCodeDisplay").textContent = gameState.gameCode;

    // The Firebase listener will now handle showing the "roleCodeScreen"
    // based on the activeScreen property saved to Firebase.
    showScreen("roleCodeScreen");
  } catch (error) {
    console.error("Error creating game:", error);
    gameState.activeScreen = "startScreen"; // Revert on error
    alert("Kon geen spel aanmaken. Probeer het opnieuw.");
  } finally {
    // Reset button
    createBtn.disabled = false;
    createBtn.textContent = "Maak Spel";
  }
}

// Join an existing game
async function joinGame() {
  let playerName = document.getElementById("playerNameInput").value.trim();
  const gameCode = document.getElementById("gameCodeInput").value.trim().toUpperCase();

  if (!playerName || !gameCode) {
    showError("joinErrorMessage", "Voer je naam en spelcode in");
    return;
  }

  playerName = sanitizeFirebaseKey(playerName);
  if (!playerName) {
    showError("joinErrorMessage", "De ingevoerde naam is ongeldig na het verwijderen van speciale tekens (zoals ., #, $, [, ]). Kies een andere naam.");
    return;
  }

  // Capture the joining player's current screen state before modifications for potential error recovery.
  const originalJoiningPlayerScreen = gameState.activeScreen;

  // Show loading indicator
  const submitBtn = document.getElementById("submitJoinBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Deelnemen...";

  try {
    // Try to load game from Firebase
    console.log("Attempting to load game from Firebase:", gameCode);
    const gameData = await loadGameFromFirebase(gameCode);

    if (!gameData) {
      showError("joinErrorMessage", "Spel niet gevonden. Controleer de code en probeer opnieuw.");
      // Restore original screen state if game not found
      gameState.activeScreen = originalJoiningPlayerScreen;
      return;
    }

    // Check if name is already taken
    if (gameData.players && gameData.players.some((p) => p.name === playerName)) {
      showError("joinErrorMessage", "Naam is al in gebruik. Kies een andere naam.");
      // Restore original screen state if name is taken
      gameState.activeScreen = originalJoiningPlayerScreen;
      return;
    }

    // Load game state
    gameState.gameCode = gameCode;
    gameState.playerName = playerName;
    gameState.players = gameData.players || [];
    gameState.currentPlayerIndex = gameData.currentPlayerIndex || 0;
    gameState.currentQuestionIndex = gameData.currentQuestionIndex || 0;
    gameState.fakemakerName = gameData.fakemakerName || "";
    gameState.fakemakerUnmasked = gameData.fakemakerUnmasked || false;
    gameState.playerSteps = gameData.playerSteps || {};
    gameState.questions = gameData.questions || gameState.questions;
    gameState.gameStarted = gameData.gameStarted || false;

    // Add new player
    const newPlayer = {
      name: playerName,
      role: "",
      isHost: false,
      steps: 0,
    };

    gameState.players.push(newPlayer);

    // Initialize player steps
    gameState.playerSteps[playerName] = 0;

    // Determine the activeScreen that should be persisted in Firebase.
    // This should be the screen the game was on before this player joined (e.g., hostGameScreen).
    const screenToPersistInFirebase = gameData.activeScreen || "hostGameScreen";

    // Temporarily set gameState.activeScreen to the value that needs to be saved to Firebase.
    // This prevents the joining player's local screen (e.g., "startScreen") from being saved.
    gameState.activeScreen = screenToPersistInFirebase;

    console.log("Attempting to save updated game state to Firebase after join:", gameState.gameCode);
    await saveGameToFirebase(); // Saves with activeScreen = screenToPersistInFirebase

    // After successful save, set the joining player's local activeScreen for their next step.
    gameState.activeScreen = "roleCodeScreen";
    showScreen("roleCodeScreen"); // Navigate the joining player locally

    // Start listening for updates
    startListeningForUpdates();

  } catch (error) {
    console.error("Error joining game:", error);
    showError("joinErrorMessage", "Fout bij deelnemen aan spel. Probeer het opnieuw.");
    // Restore the original screen state for the joining player if an error occurred
    gameState.activeScreen = originalJoiningPlayerScreen;
  } finally {
    // Reset button
    submitBtn.disabled = false;
    submitBtn.textContent = "Deelnemen";
  }
}

// Submit role code
async function submitRoleCode() {
  const roleCode = document.getElementById("roleCodeInput").value.trim();

  if (!roleCode) {
    showError("roleErrorMessage", "Voer een rolcode in");
    return;
  }

  // Validate role code
  const roleEntry = roleCodes.find((r) => r.code === roleCode);
  if (!roleEntry) {
    showError("roleErrorMessage", "Ongeldige rolcode");
    return;
  }

  // Show loading indicator
  const submitBtn = document.getElementById("submitRoleBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Bevestigen...";

  try {
    // Update player role
    gameState.playerRole = roleEntry.role;

    // Update player in game state
    const playerIndex = gameState.players.findIndex((p) => p.name === gameState.playerName);
    if (playerIndex !== -1) {
      gameState.players[playerIndex].role = roleEntry.role;

      // If this is the Fakemaker, record their name
      if (roleEntry.role === "Fakemaker") {
        gameState.fakemakerName = gameState.playerName;
      }
    }

    // Save to Firebase
    console.log("Attempting to save role update to Firebase:", gameState.gameCode);
    await saveGameToFirebase();

    // Display role
    document.getElementById("playerRoleDisplay").textContent = roleEntry.role;

    // Set role instructions
    if (roleEntry.role === "Fakemaker") {
      document.getElementById("roleInstructions").textContent = 
        "Als Fakemaker zie je de juiste antwoorden. Probeer niet op te vallen tussen de Factcheckers!";
    } else {
      document.getElementById("roleInstructions").textContent = 
        "Als Factchecker probeer je te ontdekken wie de Fakemaker is door hun antwoorden te observeren.";
    }

    showScreen("roleConfirmationScreen");

  } catch (error) {
    console.error("Error submitting role code:", error);
    showError("roleErrorMessage", "Fout bij bevestigen van rol. Probeer het opnieuw.");
  } finally {
    // Reset button
    submitBtn.disabled = false;
    submitBtn.textContent = "Bevestigen";
  }
}

// Continue after role confirmation
function continueAfterRole() {
  const currentPlayer = gameState.players.find(p => p.name === gameState.playerName);
  if (currentPlayer && currentPlayer.isHost) {
    updatePlayerList();
    showScreen("hostGameScreen");
  } else {
    updateGameDisplay();
    showScreen("gameScreen");
  }
}

// Start game (host only)
async function startGame() {
  // Only the host can start the game
  const currentPlayer = gameState.players.find(p => p.name === gameState.playerName);
  if (!currentPlayer || !currentPlayer.isHost) {
    console.warn("startGame called by non-host or currentPlayer not found. PlayerName:", gameState.playerName, "Players:", gameState.players);
    alert("Alleen de host kan het spel starten.");
    return;
  }

  // Require at least 2 players (host + 1)
  if (gameState.players.length < 2) {
    alert("Er moeten minstens 2 spelers zijn om te starten.");
    return;
  }

  const startBtn = document.getElementById("startGameBtn");
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = "Spel starten...";
  }

  gameState.gameStarted = true;
  gameState.currentPlayerIndex = 0;
  gameState.currentQuestionIndex = 0;
  gameState.activeScreen = "gameScreen";

  try {
    console.log("Attempting to save game state to Firebase to start game...");
    await saveGameToFirebase(); // This will trigger listeners on all clients
    console.log("Game state saved to Firebase. Host will now transition to gameScreen.");
    // Host transitions locally. Other clients will transition via Firebase listener.
    showScreen("gameScreen"); 
    updateGameDisplay(); 
  } catch (error) {
    console.error("Error starting game (saving to Firebase):", error);
    alert("Fout bij het starten van het spel. Controleer de verbinding en probeer het opnieuw.");
    
    // Revert gameStarted state if save failed
    gameState.gameStarted = false;
    // Consider reverting activeScreen for the host if the save failed, e.g., back to "hostGameScreen"
    // gameState.activeScreen = "hostGameScreen";

    if (startBtn) {
      startBtn.disabled = gameState.players.length < 2; // Re-evaluate based on player count
      startBtn.textContent = "Spel Starten";
    }
  }
}

// Show current question
function showQuestion() {
  if (gameState.currentQuestionIndex >= gameState.questions.length) {
    alert("Alle vragen zijn beantwoord!");
    return;
  }

  const question = gameState.questions[gameState.currentQuestionIndex];
  
  // Update question display
  let questionTitle = `Vraag ${gameState.currentQuestionIndex + 1}`;
  document.getElementById("questionNumber").textContent = questionTitle;
  document.getElementById("questionContent").textContent = question.content;
  // Determine if it's this player's turn
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer && currentPlayer.name === gameState.playerName;

  // Handle media content (images, videos, PDFs)
  document.getElementById("imageContainer").classList.add("hidden");
  document.getElementById("videoContainer").classList.add("hidden");
  document.getElementById("externalActionContainer").classList.add("hidden");

  if (question.imagePath) {
    if (question.imagePath.endsWith(".pdf")) {
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
    
    if (question.videoUrl.includes("youtube.com") || question.videoUrl.includes("youtu.be")) {
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

  // Handle different question types
  if (question.type === "multiple_choice") {
    document.getElementById("trueFalseButtons").classList.add("hidden");
    document.getElementById("multipleChoiceButtons").classList.remove("hidden");
    question.options.forEach((option, index) => {
      const button = document.getElementById(`option${index}`);
      if (button) {
        button.textContent = option;
        button.style.display = isMyTurn ? "block" : "none"; // Only show buttons for current player
      }
    });
  } else if (question.type === "true_false") {
    document.getElementById("multipleChoiceButtons").classList.add("hidden");
    document.getElementById("trueFalseButtons").classList.remove("hidden");
    document.getElementById("trueBtn").style.display = isMyTurn ? "block" : "none";
    document.getElementById("falseBtn").style.display = isMyTurn ? "block" : "none";
  }

  // Optionally indicate if it's not your turn
  const yourTurnInfo = document.getElementById("yourTurnInfo");
  if (yourTurnInfo) {
    yourTurnInfo.style.display = isMyTurn ? "block" : "none";
  }

  showScreen("questionScreen");
}

// Submit answer for true/false questions
// Submit true/false answer
async function submitAnswer(answer) {
  const question = gameState.questions[gameState.currentQuestionIndex];
  const isCorrect = answer === question.answer;
  
  await processAnswer(isCorrect, answer);
}

// Submit multiple choice answer
async function submitMultipleChoiceAnswer(optionIndex) {
  const question = gameState.questions[gameState.currentQuestionIndex];
  const isCorrect = optionIndex === question.correctOption;
  
  await processAnswer(isCorrect, optionIndex);
}

// Process answer and update game state
async function processAnswer(isCorrect, playerAnswer) {
  try {
    // Update player steps
    const currentPlayer = gameState.players.find(p => p.name === gameState.playerName);
    if (currentPlayer) {
      // Ensure playerSteps object is initialized for the player
      if (gameState.playerSteps[gameState.playerName] === undefined) {
        gameState.playerSteps[gameState.playerName] = 0;
      }
      let stepsChange = 0;
      if (isCorrect) {
        // Player does not move if correct
        stepsChange = 0;
      } else {
        // Player goes back 1-5 steps if incorrect
        const stepsBack = Math.floor(Math.random() * 5) + 1;
        stepsChange = -stepsBack;
        currentPlayer.steps -= stepsBack;
        if (currentPlayer.steps < 0) {
          currentPlayer.steps = 0; // Ensure steps don't go below 0
        }
      }
      gameState.playerSteps[gameState.playerName] = currentPlayer.steps;
    }

    // Show result
    const resultTitle = isCorrect ? "Correct!" : "Fout!";
    const resultMessage = isCorrect ? "Je hebt het juiste antwoord gegeven!" : "Helaas, dat was niet het juiste antwoord.";

    gameState.lastResult = { // Store result in gameState for all players
        title: resultTitle,
        message: resultMessage,
        answeredPlayerName: gameState.playerName, // Store who answered
        wasCorrect: isCorrect, // Store if it was correct
        stepsAwarded: stepsChange // Store the actual change in steps
    };

    document.getElementById("resultTitle").textContent = resultTitle;
    document.getElementById("resultMessage").textContent = resultMessage;
    document.getElementById("stepsDisplayResult").textContent = gameState.playerSteps[gameState.playerName] || 0;
    const stepChange = stepsChange === 0 ? "Geen stappen verandering" : (stepsChange > 0 ? `+${stepsChange} stappen` : `${stepsChange} stappen`);
    document.getElementById("stepChange").textContent = stepChange;

    gameState.activeScreen = "resultScreen";
    await saveGameToFirebase();
    showScreen("resultScreen");

  } catch (error) {
    console.error("Error processing answer:", error);
    alert("Fout bij verwerken van antwoord. Probeer het opnieuw.");
  }
}

// Move to next turn
async function nextTurn() {
  // Only allow the current player to advance the game
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.name !== gameState.playerName) {
    alert("Alleen de huidige speler kan naar de volgende beurt gaan.");
    return;
  }

  try {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    gameState.currentQuestionIndex += 1;
    
    // Check for game end condition
    if (gameState.currentQuestionIndex >= gameState.questions.length) {
      gameState.activeScreen = "gameOverScreen"; // TODO: Implement gameOverScreen and its logic
      // For now, alert and go to a placeholder or end screen if available
      // alert("Game Over! All questions answered.");
    } else {
      gameState.activeScreen = "gameScreen"; // Transition all players to gameScreen for next question
    }
    
    await saveGameToFirebase();
  } catch (error) {
    console.error("Error moving to next turn:", error);
    alert("Fout bij volgende beurt. Probeer het opnieuw.");
  }
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
  const playerListDiv = document.getElementById("hostPlayerList");
  if (!playerListDiv) return;
  playerListDiv.innerHTML = "";
  gameState.players.forEach((player) => {
    const div = document.createElement("div");
    div.textContent = player.name + (player.isHost ? " (Host)" : "");
    playerListDiv.appendChild(div);
  });

  // Enable "Spel Starten" if at least 2 players
  const startBtn = document.getElementById("startGameBtn");
  if (startBtn) {
    // Disable if game has started or not enough players
    startBtn.disabled = gameState.gameStarted || gameState.players.length < 2;
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
    
    // Update current player name in the not-your-turn info
    const currentPlayerName = document.getElementById("currentPlayerName");
    if (currentPlayerName) {
      currentPlayerName.textContent = currentPlayer.name;
    }
  }

  // Show/hide turn info based on current player
  const yourTurnInfo = document.getElementById("yourTurnInfo");
  const notYourTurnInfo = document.getElementById("notYourTurnInfo");
  const nextTurnBtn = document.getElementById("nextTurnBtn");
  
  if (currentPlayer && currentPlayer.name === gameState.playerName) {
    // It's this player's turn
    if (yourTurnInfo) yourTurnInfo.style.display = "block";
    if (notYourTurnInfo) notYourTurnInfo.style.display = "none";
    if (nextTurnBtn) nextTurnBtn.style.display = "block";
  } else {
    // It's not this player's turn
    if (yourTurnInfo) yourTurnInfo.style.display = "none";
    if (notYourTurnInfo) notYourTurnInfo.style.display = "block";
    if (nextTurnBtn) nextTurnBtn.style.display = "none";
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

// Firebase functions
async function saveGameToFirebase() {
  if (!gameState.gameCode) return;
  
  try {
    await database.ref(`games/${gameState.gameCode}`).set({
      players: gameState.players,
      currentPlayerIndex: gameState.currentPlayerIndex,
      currentQuestionIndex: gameState.currentQuestionIndex,
      fakemakerName: gameState.fakemakerName,
      fakemakerUnmasked: gameState.fakemakerUnmasked,
      playerSteps: gameState.playerSteps,
      questions: gameState.questions,
      activeScreen: gameState.activeScreen,
      lastResult: gameState.lastResult,
      gameStarted: gameState.gameStarted,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    console.log("Game saved to Firebase successfully");
  } catch (error) {
    console.error("Error saving to Firebase:", error);
    throw error;
  }
}

async function loadGameFromFirebase(gameCode) {
  try {
    const snapshot = await database.ref(`games/${gameCode}`).once('value');
    return snapshot.val();
  } catch (error) {
    console.error("Error loading from Firebase:", error);
    return null;
  }
}

function startListeningForUpdates() {
  if (!gameState.gameCode) return;
  const gameRef = database.ref(`games/${gameState.gameCode}`);
  
  gameRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Update local game state
      Object.assign(gameState, {
        players: data.players || [],
        currentPlayerIndex: data.currentPlayerIndex || 0,
        currentQuestionIndex: data.currentQuestionIndex || 0,
        fakemakerName: data.fakemakerName || "",
        fakemakerUnmasked: data.fakemakerUnmasked || false,
        playerSteps: data.playerSteps || {},
        questions: data.questions || gameState.questions,
        lastResult: data.lastResult || { title: "", message: "" },
        gameStarted: data.gameStarted || false,
      });

      // Determine if the screen needs to be changed or re-rendered
      const currentVisibleScreen = document.querySelector('.screen.active');
      let screenChanged = false;
      if (data.activeScreen && (!currentVisibleScreen || currentVisibleScreen.id !== data.activeScreen)) {
        console.log(`Listener: Firebase screen (${data.activeScreen}) requires update. Current visible: ${currentVisibleScreen?.id}.`);
        showScreen(data.activeScreen);
        screenChanged = true;
      }

      // Call specific render functions based on the active screen
      if (gameState.activeScreen === "questionScreen") {
        showQuestion(); // This will render question content and set button states
      } else if (gameState.activeScreen === "resultScreen") {
        if (gameState.lastResult && gameState.lastResult.title) {
          document.getElementById("resultTitle").textContent = gameState.lastResult.title;
          document.getElementById("resultMessage").textContent = gameState.lastResult.message;
          
          const answeredPlayerName = gameState.lastResult.answeredPlayerName;
          if (answeredPlayerName && gameState.playerSteps[answeredPlayerName] !== undefined) {
            document.getElementById("stepsDisplayResult").textContent = gameState.playerSteps[answeredPlayerName];
          } else if (answeredPlayerName) {
             document.getElementById("stepsDisplayResult").textContent = "0"; // Default if steps not found
          }

          const stepChangeText = gameState.lastResult.wasCorrect ? `+${gameState.lastResult.stepsAwarded} stap` : "Geen stappen";
          document.getElementById("stepChange").textContent = `${stepChangeText} (voor ${answeredPlayerName || 'speler'})`;
        }
      } else if (gameState.activeScreen === "gameOverScreen") {
        // TODO: Implement logic to display game over screen
        // For now, it might just show a screen with ID "gameOverScreen"
        // You might want a function like displayGameOver() here.
        console.log("Game Over state reached.");
        // Example: document.getElementById("gameOverMessage").textContent = "Het spel is afgelopen!";
      }

      // Update displays
      updatePlayerList();
      updateGameDisplay();
      updateConnectionStatus(true);
    } else {
      // Game data not found or null (e.g., game ended and removed, or invalid code)
      console.warn("Firebase listener: No data found for game code", gameState.gameCode);
      updateConnectionStatus(false); // Indicate potential disconnection or issue
      // Optionally, redirect to start screen or show an error message
    }
  }, (error) => {
    console.error("Firebase listener error:", error);
    updateConnectionStatus(false);
  });
}

function updateConnectionStatus(connected) {
  const indicator = document.getElementById("connectionIndicator");
  const status = document.getElementById("connectionStatus");
  
  if (indicator && status) {
    if (connected) {
      indicator.className = "connection-indicator";
      status.textContent = "Verbonden";
    } else {
      indicator.className = "connection-indicator offline";
      status.textContent = "Verbinding verbroken";
    }
  }
}

// Modify showQuestion to save activeScreen state if called by current player's action
async function showQuestion() {
  if (gameState.currentQuestionIndex >= gameState.questions.length) {
    // This should ideally be caught by nextTurn leading to gameOverScreen
    // If reached, try to sync to a game over state
    if (gameState.activeScreen !== "gameOverScreen") {
        gameState.activeScreen = "gameOverScreen";
        // await saveGameToFirebase(); // Avoid save loops if listener calls this
    }
    showScreen("gameOverScreen"); // Ensure correct screen is shown
    return;
  }

  const question = gameState.questions[gameState.currentQuestionIndex];
  document.getElementById("questionNumber").textContent = `Vraag ${gameState.currentQuestionIndex + 1}`;
  document.getElementById("questionContent").textContent = question.content;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer && currentPlayer.name === gameState.playerName;

  if (question.type === "multiple_choice") {
    document.getElementById("trueFalseButtons").classList.add("hidden");
    document.getElementById("multipleChoiceButtons").classList.remove("hidden");
    question.options.forEach((option, index) => {
      const button = document.getElementById(`option${index}`);
      if (button) { button.textContent = option; button.style.display = "block"; button.disabled = !isMyTurn; }
    });
    for (let i = question.options.length; i < 4; i++) {
      const button = document.getElementById(`option${i}`);
      if (button) button.style.display = "none";
    }
  } else {
    document.getElementById("trueFalseButtons").classList.remove("hidden");
    document.getElementById("multipleChoiceButtons").classList.add("hidden");
    document.getElementById("trueBtn").disabled = !isMyTurn;
    document.getElementById("falseBtn").disabled = !isMyTurn;
  }
  document.getElementById("yourTurnInfo").style.display = isMyTurn ? "block" : "none";
  handleMediaContent(question);

  const previousScreenForSave = gameState.activeScreen;
  gameState.activeScreen = "questionScreen"; // Ensure internal state is updated

  // If this call is by the current player to reveal the question (transitioning from another screen)
  // then save this state change to Firebase.
  if (isMyTurn && previousScreenForSave !== "questionScreen") {
    try {
      await saveGameToFirebase();
    } catch (error) {
      console.error("Error saving game state after showing question:", error);
      gameState.activeScreen = previousScreenForSave; // Revert on error
      showScreen(previousScreenForSave);
      alert("Kon de vraag niet aan andere spelers tonen. Probeer opnieuw.");
    }
  } 
