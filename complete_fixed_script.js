// Conceptual code for loading and selecting questions from a JSON file

/**
 * Asynchronously loads questions from a given file path.
 * @param {string} filePath - The path to the JSON file.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of question objects.
 */
async function loadAllQuestions(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for path: ${filePath}`);
    }
    const questions = await response.json();
    return questions;
  } catch (error) {
    console.error("Could not load questions:", error);
    return []; // Return an empty array in case of an error
  }
}

/**
 * Selects a question from an array of questions.
 * @param {Array<Object>} questionsArray - The array of question objects.
 * @param {string} [strategy=\'random\'] - The selection strategy (\'random\', \'sequential\', etc.).
 * @returns {Object|null} A question object or null if the array is empty.
 */
function getNextQuestion(questionsArray, strategy = \'random\') {
  if (!questionsArray || questionsArray.length === 0) {
    return null;
  }

  if (strategy === \'random\') {
    const randomIndex = Math.floor(Math.random() * questionsArray.length);
    return questionsArray[randomIndex];
  }
  // Implement other strategies (e.g., sequential) as needed
  // Defaulting to random for simplicity if strategy is unknown
  const randomIndex = Math.floor(Math.random() * questionsArray.length);
  return questionsArray[randomIndex];
}

// --- Example Usage ---
// This part demonstrates how you might use the functions.
// Ensure the filePath is correct and accessible from where this script runs.
/*
async function initializeAndDisplayQuestion() {
  const filePath = \'/Users/laurenmoreels/Desktop/bordspel-beste tot nu toe/questions.json\';
  const allQuestions = await loadAllQuestions(filePath);

  if (allQuestions.length > 0) {
    const currentQuestion = getNextQuestion(allQuestions, \'random\');
    if (currentQuestion) {
      console.log("Selected Question:", currentQuestion);
      // Here, you would add logic to display the question in your application
    } else {
      console.log("No question could be selected.");
    }
  } else {
    console.log("No questions were loaded. Check the file path and content.");
  }
}

// To run the example:
// initializeAndDisplayQuestion();
*/
// Voorbeeld voor backFromHostBtn
const backFromHostBtn = document.getElementById(\'backFromHostBtn\');
if (backFromHostBtn) {
    backFromHostBtn.addEventListener(\'click\', function() {
        showScreen(\'startScreen\');
    });
}

// Voorbeeld voor backFromJoinBtn
const backFromJoinBtn = document.getElementById(\'backFromJoinBtn\');
if (backFromJoinBtn) {
    backFromJoinBtn.addEventListener(\'click\', function() {
        showScreen(\'startScreen\');
    });
}

// Voorbeeld voor copyCodeBtn
const copyCodeBtn = document.getElementById(\'copyCodeBtn\');
if (copyCodeBtn) {
    copyCodeBtn.addEventListener(\'click\', function() {
        const gameCode = document.getElementById(\'gameCodeDisplay\').textContent;
        copyToClipboard(gameCode); // Ervan uitgaande dat copyToClipboard een globale functie is
    });
}

// Zorg ervoor dat je showScreen en copyToClipboard functies correct gedefinieerd zijn.
/* Truth Seekers Game - script.js with enhanced Firebase debugging */

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
  activeScreen: "startScreen", // To control which screen is globally active
  lastResult: { title: "", message: "" }, // To store result message for all players
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

// Hiro Scanner Functions
function openHiroScanner() {
  const scannerContainer = document.getElementById(\'scannerContainer\');
  scannerContainer.classList.remove(\'hidden\');
  
  // Create AR scene
  let arScene = document.createElement(\'a-scene\');
  arScene.setAttribute(\'embedded\', \'\');
  arScene.setAttribute(\'arjs\', \'\');

  let marker = document.createElement(\'a-marker\');
  marker.setAttribute(\'preset\', \'hiro\');

  let box = document.createElement(\'a-box\');
  box.setAttribute(\'position\', \'0 0.5 0\');
  box.setAttribute(\'material\', \'color: blue\');

  marker.appendChild(box);
  arScene.appendChild(marker);

  let camera = document.createElement(\'a-entity\');
  camera.setAttribute(\'camera\', \'\');
  arScene.appendChild(camera);

  document.getElementById(\'arSceneContainer\').appendChild(arScene);
}

function closeHiroScanner() {
  // Clear the AR scene container
  const arSceneContainer = document.getElementById(\'arSceneContainer\');
  arSceneContainer.innerHTML = \'\';
  
  // Hide the scanner overlay
  const scannerContainer = document.getElementById(\'scannerContainer\');
  scannerContainer.classList.add(\'hidden\');
}

// Shuffle questions
function shuffleQuestions() {
  // Simple Fisher-Yates shuffle
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
  try {
    const response = await fetch("questions.json");
    if (!response.ok) {
      console.error("Questions file not found or could not be loaded.");
      gameState.questions = [];
    } else {
      gameState.questions = await response.json();
    }
  } catch (error) {
    console.error("Error loading questions:", error);
    gameState.questions = [];
  }

  // Set up event listeners
  setupEventListeners();

  // Check for game code in URL
  checkForGameCodeInURL();

  // Start listening for updates immediately to check connection status
  startListeningForUpdates();
});

// Setup all event listeners
function setupEventListeners() {
  document
    .getElementById("hostGameBtn")
    .addEventListener("click", () => showScreen("hostSetupScreen"));
  document
    .getElementById("goToJoinBtn")
    .addEventListener("click", () => showScreen("joinGameScreen"));
  document
    .getElementById("createGameBtn")
    .addEventListener("click", createGame);
  document
    .getElementById("submitJoinBtn")
    .addEventListener("click", joinGame);
  document
    .getElementById("submitRoleBtn")
    .addEventListener("click", submitRoleCode);
  document
    .getElementById("continueAfterRoleBtn")
    .addEventListener("click", continueAfterRole);
  document
    .getElementById("startGameBtn")
    .addEventListener("click", startGame);
  document
    .getElementById("showQuestionBtn")
    .addEventListener("click", showQuestion);
  document
    .getElementById("trueBtn")
    .addEventListener("click", () => submitAnswer(true));
  document
    .getElementById("falseBtn")
    .addEventListener("click", () => submitAnswer(false));
  document
    .getElementById("nextTurnBtn")
    .addEventListener("click", nextTurn);
  document
    .getElementById("newGameBtn")
    .addEventListener("click", resetGame);
  document
    .getElementById("shareGameBtn")
    .addEventListener("click", shareGame);
  
  // Hiro scanner buttons
  document.getElementById("closeScanner")?.addEventListener("click", closeHiroScanner);
}

// Show a specific screen
function showScreen(screenId) {
  screens.forEach((screen) => {
    screen.classList.remove("active");
  });
  document.getElementById(screenId).classList.add("active");

  // Escape-knop alleen tonen tijdens het spel, niet op startScreen
  const escapeBtn = document.getElementById("escapeBtn");
  if (
      screenId === "gameScreen" ||
      screenId === "questionScreen" ||
      screenId === "resultScreen"
  ) {
      escapeBtn.style.display = "block";
  } else {
      escapeBtn.style.display = "none";
  }

  // Ontmaskerd-knop alleen tonen voor Fakemaker tijdens het spel
  const unmaskBtn = document.getElementById("unmaskBtn");
  if (
      (screenId === "gameScreen" || screenId === "questionScreen" || screenId === "resultScreen") &&
      gameState.playerRole === "Fakemaker" &&
      !gameState.fakemakerUnmasked
  ) {
      unmaskBtn.style.display = "block";
  } else {
      unmaskBtn.style.display = "none";
  }
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
  // Replace forbidden characters with an underscore
  let sanitizedKey = key.replace(/[.#$[\]]/g, "_");
  // Ensure the key is not empty after sanitization (e.g. if name was just ".")
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
  document.getElementById("createGameBtn").disabled = true;
  document.getElementById("createGameBtn").textContent = "Spel aanmaken...";

  gameState.playerName = hostName;
  gameState.gameCode = generateGameCode();
  gameState.players = [
    {
      name: hostName,
      role: "",
      isHost: true,
      steps: 0, // Voeg deze regel toe
    },
  ];

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
  } catch (error) {
    console.error("Error creating game:", error);
    gameState.activeScreen = "startScreen"; // Revert on error
    alert("Kon geen spel aanmaken. Probeer het opnieuw.");
  } finally {
    // Reset button
    document.getElementById("createGameBtn").disabled = false;
    document.getElementById("createGameBtn").textContent = "Maak Spel";
  }
}

// Join an existing game
async function joinGame() {
  let playerName = document.getElementById("playerNameInput").value.trim();
  const gameCode = document
    .getElementById("gameCodeInput")
    .value.trim()
    .toUpperCase();

  if (!playerName || !gameCode) {
    showError("joinErrorMessage", "Voer je naam en spelcode in");
    return;
  }

  playerName = sanitizeFirebaseKey(playerName);
  if (!playerName) {
    // The showError function handles hiding the message after a timeout.
    showError("joinErrorMessage", "Voer je naam en spelcode in");
    return;
  }

  // Capture the joining player\'s current screen state before modifications for potential error recovery.
  const originalJoiningPlayerScreen = gameState.activeScreen;

  // Show loading indicator
  document.getElementById("submitJoinBtn").disabled = true;
  document.getElementById("submitJoinBtn").textContent = "Deelnemen...";

  try {
    // Try to load game from Firebase
    console.log("Attempting to load game from Firebase:", gameCode);
    const gameData = await loadGameFromFirebase(gameCode);

    if (!gameData) {
      showError(
        "joinErrorMessage",
        "Spel niet gevonden. Controleer de code en probeer opnieuw."
      );
      // Restore original screen state if game not found
      gameState.activeScreen = originalJoiningPlayerScreen;
      return;
    }

    // Check if name is already taken
    if (gameData.players && gameData.players.some((p) => p.name === playerName)) {
      showError(
        "joinErrorMessage",
        "Naam is al in gebruik. Kies een andere naam."
      );
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
    gameState.questions = gameData.questions || [];
    gameState.gameStarted = gameData.gameStarted || false;

    // Add new player
    const newPlayer = {
      name: playerName,
      role: "",
      isHost: false,
      steps: 0,
    };

    gameState.players.push(newPlayer);

    // Determine the activeScreen that should be persisted in Firebase.
    // This should be the screen the game was on before this player joined (e.g., hostGameScreen).
    const screenToPersistInFirebase = gameData.activeScreen || "hostGameScreen";

    // Temporarily set gameState.activeScreen to the value that needs to be saved to Firebase.
    // This prevents the joining player\'s local screen (e.g., "startScreen") from being saved.
    gameState.activeScreen = screenToPersistInFirebase;

    console.log("Attempting to save updated game state to Firebase after join:", gameState.gameCode);
    await saveGameToFirebase(); // Saves with activeScreen = screenToPersistInFirebase

    // After successful save, set the joining player\'s local activeScreen for their next step.
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
    document.getElementById("submitJoinBtn").disabled = false;
    document.getElementById("submitJoinBtn").textContent = "Deelnemen";
  }
}

// Show error message
function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  errorElement.textContent = message;
  errorElement.classList.remove("hidden");

  // Hide after 3 seconds
  setTimeout(() => {
    errorElement.classList.add("hidden");
  }, 3000);
}

// Update player list in host screen
function updatePlayerList() {
  const playerListElement = document.getElementById("hostPlayerList");
  playerListElement.innerHTML = "";

  gameState.players.forEach((player) => {
    const playerItem = document.createElement("div");
    playerItem.className = "player-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "player-name";
    nameSpan.textContent = player.name;

    // Don\'t show role information
    const roleSpan = document.createElement("span");
    roleSpan.className = "player-role";
    roleSpan.textContent = player.role ? "Role assigned" : "No role yet";

    playerItem.appendChild(nameSpan);
    playerItem.appendChild(roleSpan);
    playerListElement.appendChild(playerItem);
  });

  // Enable start button if there are at least 2 players and at least one has a role
  document.getElementById("startGameBtn").disabled = gameState.players.length < 2 || !gameState.players.some((p) => p.role);
}

// Start game (host only)
async function startGame() {
  // No longer require a Fakemaker to be in the game
  // Just check that players have roles assigned
  if (!gameState.players.some((player) => player.role)) {
    alert("Spelers moeten eerst rollen toegewezen krijgen.");
    showScreen("roleCodeScreen");
    return;
  }

  // Check if questions are loaded
  if (!gameState.questions || gameState.questions.length === 0) {
    alert("Geen vragen geladen. Kan het spel niet starten.");
    console.error("Attempted to start game with no questions loaded.");
    // Optionally, try to reload or


