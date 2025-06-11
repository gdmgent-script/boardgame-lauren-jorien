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
  playerSteps: {},
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
  // Load questions
  try {
    const response = await fetch("questions.json");
    if (!response.ok) {
      // Instead of throwing an error, create a default question with VIDEO1.mp4
      console.log("Questions file not found, creating default video question");
      gameState.questions = [];
    } else {
      gameState.questions = await response.json();
    }

    // Add video question (replacing the image question)
    gameState.questions = [
      {
        id: 1,
        type: "video",
        content: "Is deze video echt of nep?",
        answer: false, // "fake" is false
        videoUrl: "VIDEO1.mp4",
      },
    ];

    // No need to shuffle with just one question
  } catch (error) {
    console.error("Error loading questions:", error);
    // Remove the alert that was causing startup error
    gameState.questions = [
      {
        id: 1,
        type: "video",
        content: "Is deze video echt of nep?",
        answer: false, // "fake" is false
        videoUrl: "VIDEO1.mp4",
      },
    ];
  }

  // Set up event listeners
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

  // Check for game code in URL
  checkForGameCodeInURL();

  // Start listening for updates immediately to check connection status
  startListeningForUpdates();
});

// Show a specific screen
function showScreen(screenId) {
  screens.forEach((screen) => {
    screen.classList.remove("active");
  });
  document.getElementById(screenId).classList.add("active");
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
      steps: 0,
    },
  ];

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
      return;
    }

    // Check if name is already taken
    if (gameData.players && gameData.players.some((p) => p.name === playerName)) {
      showError(
        "joinErrorMessage",
        "Naam is al in gebruik. Kies een andere naam."
      );
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

    // Initialize player steps
    gameState.playerSteps[playerName] = 0;

    // Save updated game state
    console.log("Attempting to save updated game state to Firebase after join:", gameState.gameCode);
    await saveGameToFirebase();

    // Start listening for updates
    startListeningForUpdates();

    gameState.activeScreen = "roleCodeScreen";
    // Show role code screen
    showScreen("roleCodeScreen");
  } catch (error) {
    console.error("Error joining game:", error);
    showError("joinErrorMessage", "Fout bij deelnemen aan spel. Probeer het opnieuw.");
  } finally {
    // Reset button
    // gameState.activeScreen might need reset if join failed before Firebase save
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

    // Don't show role information
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

  // Show loading indicator
  document.getElementById("startGameBtn").disabled = true;
  document.getElementById("startGameBtn").textContent = "Starting...";

  try {
    // Update game state
    gameState.gameStarted = true;
    gameState.activeScreen = "gameScreen"; // Transition all players to the game screen

    // Save to Firebase
    console.log("Attempting to save game start to Firebase:", gameState.gameCode);
    await saveGameToFirebase();
    // Firebase listener will handle showing the screen and updating display

  } catch (error) {
    console.error("Error starting game:", error);
    alert("Failed to start game. Please try again.");
  } finally {
    // Reset button
    document.getElementById("startGameBtn").disabled = false;
    document.getElementById("startGameBtn").textContent = "Start Game";
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
  document.getElementById("submitRoleBtn").disabled = true;
  document.getElementById("submitRoleBtn").textContent = "Bevestigen...";

  try {
    // Update player role
    gameState.playerRole = roleEntry.role;

    // Update player in game state
    const playerIndex = gameState.players.findIndex(
      (p) => p.name === gameState.playerName
    );
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

    gameState.activeScreen = "roleConfirmationScreen";
    // Show role confirmation screen
    showScreen("roleConfirmationScreen");
  } catch (error) {
    console.error("Error submitting role:", error);
    showError("roleErrorMessage", "Fout bij bevestigen rol. Probeer het opnieuw.");
  } finally {
    // Reset button
    document.getElementById("submitRoleBtn").disabled = false;
    document.getElementById("submitRoleBtn").textContent = "Bevestigen";
  }
}

// Continue after role assignment
function continueAfterRole() {
  // If player is host, go to host screen
  const isHost = gameState.players.find(
    (p) => p.name === gameState.playerName
  )?.isHost;

  if (isHost) {
    gameState.activeScreen = "hostGameScreen";
    // updatePlayerList(); // This will be handled by Firebase listener
    // showScreen("hostGameScreen"); // This will be handled by Firebase listener
    saveGameToFirebase(); // Ensure state change is saved
  } else {
    // Check if game has already started
    if (gameState.gameStarted) {
      // Game already started, join immediately
      gameState.activeScreen = "gameScreen";
      // updateGameDisplay(); // Firebase listener
      // showScreen("gameScreen"); // Firebase listener
      saveGameToFirebase(); // Ensure state change is saved
    } else {
      // Show waiting screen with clear message
      document.getElementById("roleInstructions").textContent = 
        "Waiting for the host to start the game. You will automatically join when the game begins.";
      // Keep on role confirmation screen but update the UI to show waiting status
      document.getElementById("continueAfterRoleBtn").style.display = "none";
    }
  }
}

// Update game display
function updateGameDisplay() {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  if (!currentPlayer) return;

  // Update current player display
  document.getElementById("currentPlayerDisplay").textContent = currentPlayer.name;

  const isMyTurn = currentPlayer.name === gameState.playerName;
  document.getElementById("showQuestionBtn").disabled = !isMyTurn;
  // Show answer if player is Fakemaker and not unmasked
  if (gameState.playerRole === "Fakemaker" && !gameState.fakemakerUnmasked) {
    document.getElementById("answerInfo").classList.remove("hidden");
    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
    document.getElementById("correctAnswer").textContent = currentQuestion.answer ? "Echt" : "Fake";
  } else {
    document.getElementById("answerInfo").classList.add("hidden");
  }

  // Show/hide turn info based on whether it's the player's turn
  const yourTurnInfo = document.getElementById("yourTurnInfo");
  if (isMyTurn) {
    yourTurnInfo.style.display = "block";
  } else {
    yourTurnInfo.style.display = "none";
  }
}

// Show question
async function showQuestion() {
  // This function is now triggered by the current player clicking "Show Question" button
  // It sets the activeScreen to "questionScreen" for all players
  gameState.activeScreen = "questionScreen";
  await saveGameToFirebase();
  // The actual rendering will be done by renderQuestionContentAndButtonStates via Firebase listener
}

function renderQuestionContentAndButtonStates() {
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];

  document.getElementById("questionNumber").textContent = `Vraag ${gameState.currentQuestionIndex + 1}`;
  document.getElementById("questionContent").textContent = currentQuestion.content;

  // Hide all media containers first
  document.getElementById("imageContainer").classList.add("hidden");
  document.getElementById("videoContainer").classList.add("hidden");
  document.getElementById("externalActionContainer").classList.add("hidden");

  // Show appropriate media based on question type
  if (currentQuestion.type === "image") {
    document.getElementById("questionImage").src = currentQuestion.imagePath;
    document.getElementById("imageContainer").classList.remove("hidden");
  } else if (currentQuestion.type === "video" && currentQuestion.videoUrl) {
    document.getElementById("questionVideo").src = currentQuestion.videoUrl;
    document.getElementById("videoContainer").classList.remove("hidden");
  } else if (
    currentQuestion.type === "external_action" &&
    currentQuestion.externalActionPrompt
  ) {
    document.getElementById("externalActionPrompt").textContent = currentQuestion.externalActionPrompt;
    document.getElementById("externalActionContainer").classList.remove("hidden");
  }

  // Enable/disable answer buttons based on whose turn it is
  const isCurrentPlayerAnswering = gameState.players[gameState.currentPlayerIndex]?.name === gameState.playerName;
  document.getElementById("trueBtn").disabled = !isCurrentPlayerAnswering;
  document.getElementById("falseBtn").disabled = !isCurrentPlayerAnswering;
  // Add for multiple choice if any:
  // document.querySelectorAll('.answer-button.option').forEach(btn => btn.disabled = !isCurrentPlayerAnswering);

  // Show answer info for Fakemaker (already in updateGameDisplay, but good to have here too for question screen context)
  if (gameState.playerRole === "Fakemaker" && !gameState.fakemakerUnmasked) {
    document.getElementById("answerInfo").classList.remove("hidden");
    document.getElementById("correctAnswer").textContent = currentQuestion.answer ? "Echt" : "Fake";
  } else {
    document.getElementById("answerInfo").classList.add("hidden");
  }
}

// Submit answer
async function submitAnswer(answer) {
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  const isCorrect = answer === currentQuestion.answer;

  let resultMessage = "";
  let stepChange = 0;

  if (isCorrect) {
    document.getElementById("resultTitle").textContent = "Correct!";
    stepChange = 1;
    resultMessage = `${gameState.playerName} gaat 1 stap vooruit.`;
  } else {
    document.getElementById("resultTitle").textContent = "Wrong!";
    stepChange = -Math.floor(Math.random() * 5) - 1; // -1 to -5 steps
    resultMessage = `${gameState.playerName} gaat ${Math.abs(stepChange)} stap(pen) achteruit.`;
  }

  // Update player steps
  gameState.playerSteps[gameState.playerName] = (
    gameState.playerSteps[gameState.playerName] || 0
  ) + stepChange;
  if (gameState.playerSteps[gameState.playerName] < 0) {
    gameState.playerSteps[gameState.playerName] = 0;
  }

  // Update player in players array
  const playerIndex = gameState.players.findIndex(
    (p) => p.name === gameState.playerName
  );
  if (playerIndex !== -1) {
    gameState.players[playerIndex].steps = gameState.playerSteps[gameState.playerName];
  }

  // Display result
  document.getElementById("resultMessage").textContent = resultMessage;
  document.getElementById("stepsDisplayResult").textContent = gameState.playerSteps[gameState.playerName];
  
  gameState.lastResult = { title: isCorrect ? "Correct!" : "Wrong!", message: resultMessage };
  gameState.activeScreen = "resultScreen";

  // Save to Firebase
  try {
    console.log("Attempting to save answer to Firebase:", gameState.gameCode);
    await saveGameToFirebase();
    // Firebase listener will show the result screen for all players
  } catch (error) {
    console.error("Error saving answer:", error);
    alert("Error saving your answer. Please try again.");
  }
}

// Next turn
async function nextTurn() {
  // Move to next player
  gameState.currentPlayerIndex = (
    gameState.currentPlayerIndex + 1
  ) % gameState.players.length;

  // Move to next question if we've gone through all players
  if (gameState.currentPlayerIndex === 0) {
    gameState.currentQuestionIndex++;
    // LOOPING QUESTIONS: If out of questions, loop back to the first one.
    if (gameState.currentQuestionIndex >= gameState.questions.length) {
      gameState.currentQuestionIndex = 0; 
      // Note: An actual win condition (e.g. score, unmasking) would call endGame()
      // and potentially override this loop. For now, we always loop.
    }
  }

  gameState.activeScreen = "gameScreen"; // Transition to game screen for next turn

  // Save to Firebase
  try {
    console.log("Attempting to save next turn to Firebase:", gameState.gameCode);
    await saveGameToFirebase();
    // Firebase listener will handle UI updates for all clients

  } catch (error) {
    console.error("Error updating turn:", error);
    alert("Error updating turn. Please try again.");
  }
}

// End game
async function endGame() {
  // This function should be called when a definitive win/loss condition is met
  // (e.g., Fakemaker unmasked, or a player reaches a target score).
  // For "Keep the game going", this function is called less, as questions loop.

  // Find winner (player with most steps)
  let maxSteps = -1;
  let winners = [];

  Object.entries(gameState.playerSteps).forEach(([name, steps]) => {
    if (steps > maxSteps) {
      maxSteps = steps;
      winners = [name];
    } else if (steps === maxSteps) {
      winners.push(name);
    }
  });

  let resultTitle = "Game Over!";
  let resultMessageText = "";
  
  if (winners.length === 1) {
    resultMessageText = `${winners[0]} wins with ${maxSteps} steps!`;
  } else if (winners.length > 1) {
    resultMessageText = `It's a tie between ${winners.join(" and ")} with ${maxSteps} steps!`;
    // Per "game does not end when there's a tie", if we reach here due to a tie,
    // we might want to *not* end, but continue.
    // However, if endGame() is called due to an explicit win condition check that results in a tie,
    // it's a design decision whether that specific tie ends the game or forces continuation.
    // For now, if endGame() is called, it concludes. Looping questions prevents ending *just* due to ties from running out of questions.
  } else {
    resultMessageText = "No winner could be determined.";
  }

  gameState.lastResult = { title: resultTitle, message: resultMessageText };
  gameState.activeScreen = "resultScreen"; // Show final results
  gameState.gameEnded = true; // Add a flag to indicate the game has truly ended

  await saveGameToFirebase();
  // Firebase listener will update UI. On resultScreen, newGameBtn will be primary.
  // The renderResultScreenContent function might hide nextTurnBtn if gameState.gameEnded is true.
  document.getElementById("nextTurnBtn").style.display = "none";
  document.getElementById("newGameBtn").textContent = "Back to Start";
}

// Reset game
function resetGame() {
  // Clear game state
  gameState.gameCode = "";
  gameState.players = [];
  gameState.currentPlayerIndex = 0;
  gameState.currentQuestionIndex = 0;
  gameState.fakemakerName = "";
  gameState.fakemakerUnmasked = false;
  gameState.playerName = "";
  gameState.playerRole = "";
  gameState.playerSteps = {};
  gameState.gameStarted = false;
  gameState.activeScreen = "startScreen";
  gameState.lastResult = { title: "", message: "" };
  gameState.gameEnded = false;

  // Stop listening for updates
  stopListeningForUpdates();

  // No need to save to Firebase, as this is a local reset to main menu.
  showScreen("startScreen");
}

// Save game to Firebase
async function saveGameToFirebase() {
  if (!gameState.gameCode) return;

  const gameRef = database.ref(`games/${gameState.gameCode}`);

  // Create a sanitized copy of the game state to ensure no undefined values
  const sanitizedGameState = {
    players: gameState.players || [],
    currentPlayerIndex: gameState.currentPlayerIndex || 0,
    currentQuestionIndex: gameState.currentQuestionIndex || 0,
    fakemakerName: gameState.fakemakerName || "",
    fakemakerUnmasked: gameState.fakemakerUnmasked === true,
    playerSteps: gameState.playerSteps || {},
    questions: gameState.questions || [],
    gameStarted: gameState.gameStarted === true,
    activeScreen: gameState.activeScreen || "gameScreen",
    lastResult: gameState.lastResult || { title: "", message: "" },
    lastUpdated: firebase.database.ServerValue.TIMESTAMP,
    gameEnded: gameState.gameEnded === true,
  };

  try {
    await gameRef.set(sanitizedGameState);
    console.log("Game state saved to Firebase successfully.", sanitizedGameState);
  } catch (error) {
    console.error("Error saving game state to Firebase:", error);
    throw error; // Re-throw to be caught by calling function
  }
}

// Load game from Firebase
async function loadGameFromFirebase(gameCode) {
  if (!gameCode) return null;

  const gameRef = database.ref(`games/${gameCode}`);

  try {
    const snapshot = await gameRef.once("value");
    const gameData = snapshot.val();
    console.log("Game data loaded from Firebase:", gameData);
    return gameData;
  } catch (error) {
    console.error("Error loading game from Firebase:", error);
    return null;
  }
}

// Start listening for updates
function startListeningForUpdates() {
  if (!gameState.gameCode) return;

  const gameRef = database.ref(`games/${gameState.gameCode}`);

  // Listen for game updates
  gameRef.on("value", (snapshot) => {
    const data = snapshot.val();
    console.log("Firebase real-time update received:", data);
    if (!data) {
      console.warn("No data received from Firebase snapshot.");
      return;
    }

    // Update local game state
    gameState.players = data.players || gameState.players;
    gameState.currentPlayerIndex = data.currentPlayerIndex !== undefined ? data.currentPlayerIndex : gameState.currentPlayerIndex;
    gameState.currentQuestionIndex = data.currentQuestionIndex !== undefined ? data.currentQuestionIndex : gameState.currentQuestionIndex;
    gameState.fakemakerName = data.fakemakerName || gameState.fakemakerName;
    gameState.fakemakerUnmasked = data.fakemakerUnmasked !== undefined ? data.fakemakerUnmasked : gameState.fakemakerUnmasked;
    gameState.playerSteps = data.playerSteps || gameState.playerSteps;
    gameState.questions = data.questions || gameState.questions;
    gameState.gameStarted = data.gameStarted !== undefined ? data.gameStarted : gameState.gameStarted;
    gameState.activeScreen = data.activeScreen || gameState.activeScreen; // Keep local if not in Firebase yet
    gameState.lastResult = data.lastResult || gameState.lastResult;
    gameState.gameEnded = data.gameEnded !== undefined ? data.gameEnded : gameState.gameEnded;

    // Update UI based on game state
    if (gameState.activeScreen && document.getElementById(gameState.activeScreen)) {
      showScreen(gameState.activeScreen); // This just makes the screen div visible

      // Now, specific rendering/logic for each screen
      switch (gameState.activeScreen) {
        case "gameScreen":
          updateGameDisplay();
          break;
        case "questionScreen":
          renderQuestionContentAndButtonStates();
          break;
        case "resultScreen":
          document.getElementById("resultTitle").textContent = gameState.lastResult.title || "Resultaat";
          document.getElementById("resultMessage").textContent = gameState.lastResult.message || "";
          // Update steps display for the current player viewing the screen, or for the player who last answered.
          // For simplicity, let's show the viewing player's steps.
          document.getElementById("stepsDisplayResult").textContent = gameState.playerSteps[gameState.playerName] || 0;
          
          if (gameState.gameEnded) {
            document.getElementById("nextTurnBtn").style.display = "none";
            document.getElementById("newGameBtn").textContent = "Back to Start";
            document.getElementById("newGameBtn").style.display = "block";
          } else {
            document.getElementById("nextTurnBtn").style.display = "block";
            document.getElementById("newGameBtn").style.display = "block"; // Or "End Game"
            document.getElementById("newGameBtn").textContent = "New Game"; // Or appropriate text
          }
          break;
        case "hostGameScreen":
          updatePlayerList();
          break;
        case "roleConfirmationScreen":
          // If game has started (by host action) and this player is not host,
          // and they are on role confirm, they should have been moved to gameScreen.
          // The continueAfterRole() function handles this by setting gameState.activeScreen.
          break;
      }
    }
  }, (error) => {
    console.error("Firebase real-time listener error:", error);
    updateConnectionStatus("offline");
  });

  // Update connection status
  const connectedRef = database.ref(".info/connected");
  connectedRef.on("value", (snap) => {
    if (snap.val() === true) {
      console.log("Firebase connection status: Connected");
      updateConnectionStatus("connected");
    } else {
      console.log("Firebase connection status: Disconnected/Connecting");
      updateConnectionStatus("connecting");
    }
  }, (error) => {
    console.error("Firebase connection listener error:", error);
    updateConnectionStatus("offline");
  });
}

// Stop listening for updates
function stopListeningForUpdates() {
  if (!gameState.gameCode) return;

  const gameRef = database.ref(`games/${gameState.gameCode}`);
  gameRef.off();
  console.log("Stopped listening for Firebase game updates.");

  const connectedRef = database.ref(".info/connected");
  connectedRef.off();
  console.log("Stopped listening for Firebase connection status.");
}

// Check for game code in URL
function checkForGameCodeInURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameCode = urlParams.get("game");

  if (gameCode) {
    document.getElementById("gameCodeInput").value = gameCode;
    showScreen("joinGameScreen");
  }
}

// Share game link
function shareGame() {
  if (!gameState.gameCode) return;

  const gameUrl = `${window.location.origin}${window.location.pathname}?game=${gameState.gameCode}`;

  if (navigator.share) {
    navigator.share({
      title: "Join my Truth Seekers game!",
      text: `Join my game with code: ${gameState.gameCode}`,
      url: gameUrl,
    })
    .then(() => {
      document.getElementById("shareSuccessMessage").textContent = "Game link shared successfully!";
      document.getElementById("shareSuccessMessage").classList.remove("hidden");

      setTimeout(() => {
        document.getElementById("shareSuccessMessage").classList.add("hidden");
      }, 3000);
    })
    .catch((error) => {
      console.error("Error sharing:", error);
    });
  } else {
    copyToClipboard(gameUrl);
    document.getElementById("shareSuccessMessage").textContent = "Game link copied to clipboard!";
    document.getElementById("shareSuccessMessage").classList.remove("hidden");

    setTimeout(() => {
      document.getElementById("shareSuccessMessage").classList.add("hidden");
    }, 3000);
  }
}

// Copy to clipboard
function copyToClipboard(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

// Update connection status indicator
function updateConnectionStatus(status) {
  const indicator = document.getElementById("connectionIndicator");
  const statusText = document.getElementById("connectionStatus");

  if (!indicator || !statusText) return;

  indicator.classList.remove("connected", "connecting", "offline");

  switch (status) {
    case "connected":
      indicator.classList.add("connected");
      statusText.textContent = "Verbonden";
      break;
    case "connecting":
      indicator.classList.add("connecting");
      statusText.textContent = "Verbinden...";
      break;
    case "offline":
      indicator.classList.add("offline");
      statusText.textContent = "Offline";
      break;
    default:
      indicator.classList.add("offline");
      statusText.textContent = "Onbekend";
  }
}





// AR Functionality
let arCurrentIndex = 0;
const arModels = [
  { primitive: "box", color: "red", scale: "1 1 1" },
  { primitive: "sphere", color: "blue", scale: "1 1 1" },
  { primitive: "cone", color: "green", scale: "1 1 1" }
];

function changeArModel() {
  const arObject = document.getElementById("dynamicObject");
  if (arObject) { // Check if the AR object exists on the current screen
    const model = arModels[arCurrentIndex];
    arObject.setAttribute("geometry", `primitive: ${model.primitive}`);
    arObject.setAttribute("material", `color: ${model.color}`);
    arObject.setAttribute("scale", model.scale);
    arCurrentIndex = (arCurrentIndex + 1) % arModels.length;
  }
}

// Function to toggle AR camera container
function toggleARCamera() {
    const arContainer = document.getElementById("arContainer");
    const arToggleBtn = document.getElementById("arCameraToggleBtn");
    
    if (arContainer.classList.contains("hidden")) {
        // Show AR container
        arContainer.classList.remove("hidden");
        arToggleBtn.textContent = "✕";
        arToggleBtn.style.backgroundColor = "#f44336";
        
        // Initialize AR when showing for the first time
        initializeARContainer();
    } else {
        // Hide AR container
        arContainer.classList.add("hidden");
        arToggleBtn.textContent = "📷";
        arToggleBtn.style.backgroundColor = "#4CAF50";
    }
}

// Function to initialize AR in the small container
function initializeARContainer() {
    const marker = document.querySelector("#arContainer a-marker");
    if (marker) {
        marker.addEventListener("markerFound", () => {
            console.log("Marker found in AR container, changing AR model.");
            changeArModel();
        });
    } else {
        console.log("AR Marker not found in container.");
    }
}
