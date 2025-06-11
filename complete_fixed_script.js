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
  gameStarted: false, // New state to track if game has started
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
  // document.getElementById("newGameBtn").addEventListener("click", resetGame); // Removed as per request
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
    // Host does not go to roleCodeScreen immediately. They stay on hostGameScreen.
    // The role assignment will happen implicitly for the host or can be done later.
    gameState.activeScreen = "hostGameScreen"; // Host proceeds to host game screen

    // Save game to Firebase
    console.log("Attempting to save new game to Firebase:", gameState.gameCode);
    await saveGameToFirebase();

    // Start listening for updates (if not already started)
    startListeningForUpdates();
    // Display game code
    document.getElementById("gameCodeDisplay").textContent = gameState.gameCode;

    // Show the host game screen locally for the host
    showScreen("hostGameScreen");
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
  const roleCode = document.getElementById("playerRoleCodeInput").value.trim();

  if (!playerName || !gameCode || !roleCode) {
    showError("joinErrorMessage", "Voer je naam, spelcode en rolcode in");
    return;
  }

  playerName = sanitizeFirebaseKey(playerName);
  if (!playerName) {
    showError("joinErrorMessage", "Voer je naam, spelcode en rolcode in");
    return;
  }

  // Validate role code
  const roleEntry = roleCodes.find((r) => r.code === roleCode);
  if (!roleEntry) {
    showError("joinErrorMessage", "Ongeldige rolcode");
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
    gameState.playerRole = roleEntry.role;
    gameState.players = gameData.players || [];
    gameState.currentPlayerIndex = gameData.currentPlayerIndex || 0;
    gameState.currentQuestionIndex = gameData.currentQuestionIndex || 0;
    gameState.fakemakerName = gameData.fakemakerName || "";
    gameState.fakemakerUnmasked = gameData.fakemakerUnmasked || false;
    gameState.playerSteps = gameData.playerSteps || {};
    gameState.questions = gameData.questions || [];
    gameState.gameStarted = gameData.gameStarted || false;

    // Add new player with role already assigned
    const newPlayer = {
      name: playerName,
      role: roleEntry.role,
      isHost: false,
      steps: 0,
    };

    gameState.players.push(newPlayer);

    // Initialize player steps
    gameState.playerSteps[playerName] = 0;

    // If this is the Fakemaker, record their name
    if (roleEntry.role === "Fakemaker") {
      gameState.fakemakerName = playerName;
    }

    // Save updated game state
    console.log("Attempting to save updated game state to Firebase after join:", gameState.gameCode);
    
    // Don't change activeScreen globally - let each player manage their own screen state
    await saveGameToFirebase();

    // Start listening for updates
    startListeningForUpdates();

    // Display role
    document.getElementById("playerRoleDisplay").textContent = roleEntry.role;

    // Set role instructions
    if (roleEntry.role === "Fakemaker") {
      document.getElementById("roleInstructions").textContent = 
        "Als Fakemaker zie je de juiste antwoorden. Probeer niet op te vallen tussen de Factcheckers! Wacht tot de host het spel start.";
    } else {
      document.getElementById("roleInstructions").textContent = 
        "Als Factchecker probeer je te ontdekken wie de Fakemaker is door hun antwoorden te observeren. Wacht tot de host het spel start.";
    }
    
    // Players joining always go to roleConfirmationScreen (waiting screen)
    showScreen("roleConfirmationScreen");
    // Hide the continue button and show waiting message
    document.getElementById("continueAfterRoleBtn").style.display = "none";

  } catch (error) {
    console.error("Error joining game:", error);
    showError("joinErrorMessage", "Fout bij deelnemen aan spel. Probeer het opnieuw.");
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

    // Don't show role information to host until game starts, just show if role is assigned
    const roleSpan = document.createElement("span");
    roleSpan.className = "player-role";
    roleSpan.textContent = player.role ? "Rol toegewezen" : "Wacht op rol";

    playerItem.appendChild(nameSpan);
    playerItem.appendChild(roleSpan);
    playerListElement.appendChild(playerItem);
  });

  // Enable start button if there are at least 2 players and all players have roles assigned
  document.getElementById("startGameBtn").disabled = gameState.players.length < 2 || gameState.players.some((p) => !p.role);
}

// Start game (host only)
async function startGame() {
  // Only host can start the game
  const currentPlayer = gameState.players.find(p => p.name === gameState.playerName);
  if (!currentPlayer || !currentPlayer.isHost) {
    alert("Alleen de host kan het spel starten.");
    return;
  }

  // Check that all players have roles assigned
  if (gameState.players.some((player) => !player.role)) {
    alert("Alle spelers moeten eerst rollen toegewezen krijgen.");
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
    document.getElementById("startGameBtn").textContent = "Start Spel";
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

    // After role confirmation, host goes to hostGameScreen, others wait on roleConfirmationScreen
    const currentPlayer = gameState.players.find(p => p.name === gameState.playerName);
    if (currentPlayer && currentPlayer.isHost) {
      showScreen("hostGameScreen");
    } else {
      showScreen("roleConfirmationScreen");
      document.getElementById("continueAfterRoleBtn").style.display = "none"; // Hide continue button for non-hosts
    }

  } catch (error) {
    console.error("Error submitting role:", error);
    showError("roleErrorMessage", "Fout bij bevestigen rol. Probeer het opnieuw.");
  } finally {
    // Reset button
    document.getElementById("submitRoleBtn").disabled = false;
    document.getElementById("submitRoleBtn").textContent = "Bevestigen";
  }
}

// Continue after role assignment (only for host)
function continueAfterRole() {
  // This function should only be called by the host after their role is confirmed
  const currentPlayer = gameState.players.find(p => p.name === gameState.playerName);
  if (currentPlayer && currentPlayer.isHost) {
    showScreen("hostGameScreen");
  } else {
    // This button should be hidden for non-hosts, but as a fallback
    console.warn("Non-host tried to use continueAfterRole button.");
  }
}

// Show question
async function showQuestion() {
  // Only the current player can show the question
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (gameState.playerName !== currentPlayer.name) {
    alert("Het is niet jouw beurt om een vraag te tonen.");
    return;
  }

  if (gameState.currentQuestionIndex >= gameState.questions.length) {
    alert("Alle vragen zijn beantwoord!");
    // Optionally, end the game or loop back to first question
    return;
  }

  const question = gameState.questions[gameState.currentQuestionIndex];

  // Update question details in Firebase
  try {
    await database.ref(`games/${gameState.gameCode}`).update({
      currentQuestion: question,
      activeScreen: "questionScreen", // Transition all players to question screen
    });
  } catch (error) {
    console.error("Error updating question in Firebase:", error);
    alert("Fout bij het laden van de vraag. Probeer opnieuw.");
  }
}

// Submit answer
async function submitAnswer(answer) {
  // Only the current player can submit an answer
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (gameState.playerName !== currentPlayer.name) {
    alert("Het is niet jouw beurt om te antwoorden.");
    return;
  }

  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  const isCorrect = answer === currentQuestion.answer;

  let stepsChange = 0;
  let resultTitle = "";
  let resultMessage = "";

  if (isCorrect) {
    stepsChange = 1;
    resultTitle = "Correct!";
    resultMessage = "Je hebt de vraag correct beantwoord.";
  } else {
    stepsChange = -1;
    resultTitle = "Fout!";
    resultMessage = "Je hebt de vraag fout beantwoord.";
  }

  // Update player steps locally
  gameState.playerSteps[gameState.playerName] = 
    (gameState.playerSteps[gameState.playerName] || 0) + stepsChange;

  // Update game state in Firebase
  try {
    await database.ref(`games/${gameState.gameCode}`).update({
      playerSteps: gameState.playerSteps,
      lastResult: { title: resultTitle, message: resultMessage, stepsChange: stepsChange },
      activeScreen: "resultScreen", // Transition all players to result screen
    });
  } catch (error) {
    console.error("Error submitting answer to Firebase:", error);
    alert("Fout bij het indienen van antwoord. Probeer opnieuw.");
  }
}

// Next turn
async function nextTurn() {
  // Only the current player (or host) can advance the turn
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHost = gameState.players.find(p => p.name === gameState.playerName)?.isHost;

  if (gameState.playerName !== currentPlayer.name && !isHost) {
    alert("Alleen de huidige speler of de host kan de beurt doorgeven.");
    return;
  }

  // Increment current player index
  let nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  let nextQuestionIndex = gameState.currentQuestionIndex + 1;

  // If all questions are answered, reset question index or end game
  if (nextQuestionIndex >= gameState.questions.length) {
    nextQuestionIndex = 0; // Loop questions for now
    // Or implement game end logic here
  }

  try {
    await database.ref(`games/${gameState.gameCode}`).update({
      currentPlayerIndex: nextPlayerIndex,
      currentQuestionIndex: nextQuestionIndex,
      activeScreen: "gameScreen", // Transition all players back to game screen
    });
  } catch (error) {
    console.error("Error advancing turn in Firebase:", error);
    alert("Fout bij het doorgeven van de beurt. Probeer opnieuw.");
  }
}

// Reset game (only host can do this, and it's removed from UI)
async function resetGame() {
  // This function is no longer triggered by a UI button, but kept for potential future use or debugging
  const currentPlayer = gameState.players.find(p => p.name === gameState.playerName);
  if (!currentPlayer || !currentPlayer.isHost) {
    alert("Alleen de host kan het spel resetten.");
    return;
  }

  if (confirm("Weet je zeker dat je het spel wilt resetten? Alle voortgang gaat verloren.")) {
    try {
      await database.ref(`games/${gameState.gameCode}`).remove();
      // Reset local game state
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
      showScreen("startScreen");
      alert("Spel gereset!");
    } catch (error) {
      console.error("Error resetting game:", error);
      alert("Fout bij het resetten van het spel. Probeer opnieuw.");
    }
  }
}

// Save game state to Firebase
async function saveGameToFirebase() {
  if (!gameState.gameCode) {
    console.error("Cannot save to Firebase: gameCode is not set.");
    return;
  }
  try {
    const gameRef = database.ref(`games/${gameState.gameCode}`);
    await gameRef.set({
      players: gameState.players,
      currentPlayerIndex: gameState.currentPlayerIndex,
      currentQuestionIndex: gameState.currentQuestionIndex,
      fakemakerName: gameState.fakemakerName,
      fakemakerUnmasked: gameState.fakemakerUnmasked,
      playerSteps: gameState.playerSteps,
      activeScreen: gameState.activeScreen, // Save active screen to Firebase
      lastResult: gameState.lastResult,
      gameStarted: gameState.gameStarted,
      questions: gameState.questions, // Save questions to Firebase
    });
    console.log("Game state saved to Firebase.");
  } catch (error) {
    console.error("Error saving game state to Firebase:", error);
    throw error; // Re-throw to be caught by calling function
  }
}

// Load game state from Firebase
async function loadGameFromFirebase(gameCode) {
  try {
    const snapshot = await database.ref(`games/${gameCode}`).once("value");
    return snapshot.val();
  } catch (error) {
    console.error("Error loading game state from Firebase:", error);
    return null;
  }
}

// Start listening for Firebase updates
function startListeningForUpdates() {
  if (!gameState.gameCode) {
    console.warn("Cannot listen for updates: gameCode is not set.");
    return;
  }

  const gameRef = database.ref(`games/${gameState.gameCode}`);

  gameRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data) {
      console.log("Firebase data updated:", data);

      // Update local gameState with Firebase data
      gameState.players = data.players || [];
      gameState.currentPlayerIndex = data.currentPlayerIndex || 0;
      gameState.currentQuestionIndex = data.currentQuestionIndex || 0;
      gameState.fakemakerName = data.fakemakerName || "";
      gameState.fakemakerUnmasked = data.fakemakerUnmasked || false;
      gameState.playerSteps = data.playerSteps || {};
      gameState.gameStarted = data.gameStarted || false;
      gameState.questions = data.questions || [];

      // Update UI based on new state
      updatePlayerList(); // For host screen

      // Handle screen transitions based on activeScreen from Firebase
      if (data.activeScreen && data.activeScreen !== gameState.activeScreen) {
        gameState.activeScreen = data.activeScreen;
        showScreen(gameState.activeScreen);
      }

      // Update game screen elements
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer) {
        document.getElementById("currentPlayerDisplay").textContent = currentPlayer.name;

        // Show/hide your turn info
        if (gameState.playerName === currentPlayer.name) {
          document.getElementById("yourTurnInfo").classList.remove("hidden");
        } else {
          document.getElementById("yourTurnInfo").classList.add("hidden");
        }
      }

      // Update question screen if active
      if (gameState.activeScreen === "questionScreen" && data.currentQuestion) {
        const question = data.currentQuestion;
        document.getElementById("questionNumber").textContent = `Vraag ${question.id}`;
        document.getElementById("questionContent").textContent = question.content;

        // Hide all media containers first
        document.getElementById("imageContainer").classList.add("hidden");
        document.getElementById("videoContainer").classList.add("hidden");
        document.getElementById("externalActionContainer").classList.add("hidden");

        // Show relevant media
        if (question.imageUrl) {
          document.getElementById("questionImage").src = question.imageUrl;
          document.getElementById("imageContainer").classList.remove("hidden");
        } else if (question.videoUrl) {
          document.getElementById("videoSource").src = question.videoUrl;
          document.getElementById("questionVideo").load(); // Load the new video source
          document.getElementById("videoContainer").classList.remove("hidden");
        } else if (question.externalAction) {
          document.getElementById("externalActionPrompt").textContent = question.externalAction;
          document.getElementById("externalActionContainer").classList.remove("hidden");
        }

        // Show/hide answer buttons based on question type
        document.getElementById("trueFalseButtons").classList.add("hidden");
        document.getElementById("multipleChoiceButtons").classList.add("hidden");

        if (question.type === "trueFalse") {
          document.getElementById("trueFalseButtons").classList.remove("hidden");
        } else if (question.type === "multipleChoice") {
          document.getElementById("multipleChoiceButtons").classList.remove("hidden");
          question.options.forEach((option, index) => {
            document.getElementById(`option${index}`).textContent = option;
          });
        }

        // Enable/disable answer buttons based on current player
        const isMyTurn = gameState.playerName === currentPlayer.name;
        document.querySelectorAll(".answer-button").forEach(button => {
          button.disabled = !isMyTurn;
          if (!isMyTurn) {
            button.style.opacity = "0.5";
            button.style.cursor = "not-allowed";
          } else {
            button.style.opacity = "1";
            button.style.cursor = "pointer";
          }
        });

      }

      // Update result screen if active
      if (gameState.activeScreen === "resultScreen" && data.lastResult) {
        document.getElementById("resultTitle").textContent = data.lastResult.title;
        document.getElementById("resultMessage").textContent = data.lastResult.message;
        document.getElementById("stepsDisplayResult").textContent = gameState.playerSteps[gameState.playerName] || 0;
        document.getElementById("stepChange").textContent = 
          data.lastResult.stepsChange > 0 ? `+${data.lastResult.stepsChange} stap` : `${data.lastResult.stepsChange} stap`;
        
        // Enable/disable next turn button based on current player or host
        const isCurrentPlayer = gameState.playerName === currentPlayer.name;
        const isHost = gameState.players.find(p => p.name === gameState.playerName)?.isHost;
        const nextTurnBtn = document.getElementById("nextTurnBtn");
        
        if (isCurrentPlayer || isHost) {
          nextTurnBtn.disabled = false;
          nextTurnBtn.style.opacity = "1";
        } else {
          nextTurnBtn.disabled = true;
          nextTurnBtn.style.opacity = "0.5";
        }
      }

    } else {
      // Game no longer exists in Firebase, reset local state and go to start screen
      console.log("Game removed from Firebase, resetting local state.");
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
      showScreen("startScreen");
    }
  });

  // Monitor connection status
  database.ref(".info/connected").on("value", (snapshot) => {
    const connected = snapshot.val();
    const indicator = document.getElementById("connectionIndicator");
    const statusText = document.getElementById("connectionStatus");

    if (connected) {
      indicator.classList.remove("offline", "connecting");
      indicator.classList.add("online");
      statusText.textContent = "Verbonden";
    } else {
      indicator.classList.remove("online");
      indicator.classList.add("offline");
      statusText.textContent = "Verbinding verbroken";
    }
  });
}

// Copy game code to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(
    () => {
      const shareSuccessMessage = document.getElementById("shareSuccessMessage");
      shareSuccessMessage.textContent = "Spelcode gekopieerd!";
      shareSuccessMessage.classList.remove("hidden");
      setTimeout(() => {
        shareSuccessMessage.classList.add("hidden");
      }, 2000);
    },
    (err) => {
      console.error("Could not copy text: ", err);
      alert("Kon spelcode niet kopiëren. Kopieer handmatig: " + text);
    }
  );
}

// Share game link
function shareGame() {
  if (navigator.share) {
    navigator.share({
      title: "Truth Seekers Game",
      text: `Doe mee met mijn Truth Seekers spel! Spelcode: ${gameState.gameCode}`,
      url: window.location.origin + window.location.pathname + `?gameCode=${gameState.gameCode}`,
    })
    .then(() => console.log("Successful share"))
    .catch((error) => console.log("Error sharing", error));
  } else {
    // Fallback for browsers that do not support Web Share API
    const shareSuccessMessage = document.getElementById("shareSuccessMessage");
    shareSuccessMessage.textContent = "Deel deze link handmatig: " + window.location.origin + window.location.pathname + `?gameCode=${gameState.gameCode}`;
    shareSuccessMessage.classList.remove("hidden");
    setTimeout(() => {
      shareSuccessMessage.classList.add("hidden");
    }, 5000);
  }
}

// Check for game code in URL on page load
function checkForGameCodeInURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameCode = urlParams.get("gameCode");
  if (gameCode) {
    document.getElementById("gameCodeInput").value = gameCode;
    showScreen("joinGameScreen");
  }
}

// AR functionality (placeholder for now)
const arViewContainer = document.getElementById("arViewContainer");
const globalScanHiroBtn = document.getElementById("globalScanHiroBtn");

// Function to toggle AR view (currently just shows/hides a div)
function toggleARView() {
    if (arViewContainer.classList.contains('hidden')) {
        arViewContainer.classList.remove('hidden');
        // Dynamically create A-Frame scene if not already present
        if (!arViewContainer.querySelector('a-scene')) {
            const aScene = document.createElement('a-scene');
            aScene.setAttribute('embedded', '');
            aScene.setAttribute('arjs', 'sourceType: webcam; detectionMode: mono; maxDetectionRate: 60; canvasWidth: 1280; canvasHeight: 960;');
            aScene.innerHTML = `
                <a-marker preset="hiro">
                    <a-box position="0 0.5 0" material="color: yellow;"></a-box>
                </a-marker>
                <a-entity camera></a-entity>
            `;
            arViewContainer.appendChild(aScene);
        }
    } else {
        arViewContainer.classList.add('hidden');
    }
}

// Event listener for the global scan Hiro button
// globalScanHiroBtn.addEventListener('click', toggleARView); // This button is removed from HTML as per request

// Event listener for the new scan Hiro button in result screen
document.addEventListener('DOMContentLoaded', () => {
  const scanHiroGameBtn = document.getElementById('scanHiroGameBtn');
  if (scanHiroGameBtn) {
    scanHiroGameBtn.addEventListener('click', toggleARView);
  }
  
  const scanHiroResultBtn = document.getElementById('scanHiroResultBtn');
  if (scanHiroResultBtn) {
    scanHiroResultBtn.addEventListener('click', toggleARView);
  }
});


