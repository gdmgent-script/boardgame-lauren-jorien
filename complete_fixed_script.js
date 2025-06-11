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

// Camera state
let cameraStarted = false;
let arScene = null;

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

// Show a specific screen
function showScreen(screenId) {
  screens.forEach((screen) => {
    screen.classList.remove("active");
  });
  document.getElementById(screenId).classList.add("active");
  
  // Stop camera when leaving AR screen
  if (screenId !== "arScreen" && cameraStarted) {
    stopCamera();
  }
}

// Camera functions
function startCamera() {
  if (cameraStarted) return;
  
  const cameraContainer = document.getElementById("cameraContainer");
  const startBtn = document.getElementById("startCameraBtn");
  const stopBtn = document.getElementById("stopCameraBtn");
  
  // Show camera container
  cameraContainer.classList.remove("hidden");
  
  // Toggle buttons
  startBtn.classList.add("hidden");
  stopBtn.classList.remove("hidden");
  
  // Initialize AR scene
  arScene = document.getElementById("arScene");
  if (arScene) {
    // Force A-Frame to initialize the camera
    arScene.setAttribute("arjs", "sourceType: webcam; debugUIEnabled: false;");
  }
  
  cameraStarted = true;
}

function stopCamera() {
  if (!cameraStarted) return;
  
  const cameraContainer = document.getElementById("cameraContainer");
  const startBtn = document.getElementById("startCameraBtn");
  const stopBtn = document.getElementById("stopCameraBtn");
  
  // Hide camera container
  cameraContainer.classList.add("hidden");
  
  // Toggle buttons
  startBtn.classList.remove("hidden");
  stopBtn.classList.add("hidden");
  
  // Stop camera stream
  if (arScene) {
    // Stop the webcam stream
    const video = arScene.querySelector("video");
    if (video && video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  }
  
  cameraStarted = false;
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

  // Add event listener for the AR button
  document
    .getElementById("goToARBtn")
    .addEventListener("click", () => {
      showScreen("arScreen");
    });

  // Add event listeners for camera controls
  document
    .getElementById("startCameraBtn")
    .addEventListener("click", startCamera);
  document
    .getElementById("stopCameraBtn")
    .addEventListener("click", stopCamera);

  // Add event listeners for back buttons
  document
    .getElementById("backFromHostBtn")
    .addEventListener("click", () => showScreen("startScreen"));
  document
    .getElementById("backFromJoinBtn")
    .addEventListener("click", () => showScreen("startScreen"));
  document
    .getElementById("backFromARBtn")
    .addEventListener("click", () => showScreen("startScreen"));

  // Check for game code in URL
  checkForGameCodeInURL();

  // Start listening for updates immediately to check connection status
  startListeningForUpdates();
});

// Generate a random game code
function generateGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new game as host
async function createGame() {
  const hostName = document.getElementById("hostNameInput").value.trim();
  if (!hostName) {
    alert("Voer je naam in");
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
    // Save game to Firebase
    console.log("Attempting to save new game to Firebase:", gameState.gameCode);
    await saveGameToFirebase();

    // Start listening for updates (if not already started)
    startListeningForUpdates();

    // Display game code
    document.getElementById("gameCodeDisplay").textContent = gameState.gameCode;

    // Modified: Direct host to role code screen instead of host game screen
    showScreen("roleCodeScreen");
  } catch (error) {
    console.error("Error creating game:", error);
    alert("Kon geen spel aanmaken. Probeer het opnieuw.");
  } finally {
    // Reset button
    document.getElementById("createGameBtn").disabled = false;
    document.getElementById("createGameBtn").textContent = "Maak Spel";
  }
}

// Join an existing game
async function joinGame() {
  const playerName = document.getElementById("playerNameInput").value.trim();
  const gameCode = document
    .getElementById("gameCodeInput")
    .value.trim()
    .toUpperCase();

  if (!playerName || !gameCode) {
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

    // Show role code screen
    showScreen("roleCodeScreen");
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

    // Save to Firebase
    console.log("Attempting to save game start to Firebase:", gameState.gameCode);
    await saveGameToFirebase();

    // Update display
    updateGameDisplay();

    // Show game screen
    showScreen("gameScreen");
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
    updatePlayerList();
    showScreen("hostGameScreen");
  } else {
    // Check if game has already started
    if (gameState.gameStarted) {
      // Game already started, join immediately
      updateGameDisplay();
      showScreen("gameScreen");
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

  // Update current player display
  document.getElementById("currentPlayerDisplay").textContent = currentPlayer.name;

  // Update steps display
  const steps = gameState.playerSteps[gameState.playerName] || 0;
  document.getElementById("stepsDisplay").textContent = steps;

  // Hide role name for everyone
  document.getElementById("roleName").textContent = "Hidden";

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
  if (currentPlayer.name === gameState.playerName) {
    yourTurnInfo.style.display = "block";
  } else {
    yourTurnInfo.style.display = "none";
  }
}

// Show question
function showQuestion() {
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];

  document.getElementById("questionNumber").textContent = `Vraag ${gameState.currentQuestionIndex + 1}`;
  document.getElementById("questionContent").textContent = currentQuestion.content;

  // Hide all media containers first
  document.getElementById("imageContainer").classList.add("hidden");
  document.getElementById("videoContainer").classList.add("hidden");
  document.getElementById("externalActionContainer").classList.add("hidden");

  // Show appropriate media based on question type
  if (currentQuestion.type === "image" && currentQuestion.imageUrl) {
    document.getElementById("questionImage").src = currentQuestion.imageUrl;
    document.getElementById("imageContainer").classList.remove("hidden");
  } else if (currentQuestion.type === "video" && currentQuestion.videoUrl) {
    document.getElementById("videoSource").src = currentQuestion.videoUrl;
    document.getElementById("questionVideo").load();
    document.getElementById("videoContainer").classList.remove("hidden");
  } else if (currentQuestion.type === "external" && currentQuestion.externalPrompt) {
    document.getElementById("externalActionPrompt").textContent = currentQuestion.externalPrompt;
    document.getElementById("externalActionContainer").classList.remove("hidden");
  }

  // Show appropriate answer buttons
  if (currentQuestion.type === "multiple_choice") {
    document.getElementById("trueFalseButtons").classList.add("hidden");
    document.getElementById("multipleChoiceButtons").classList.remove("hidden");
    
    // Set up multiple choice options
    currentQuestion.options.forEach((option, index) => {
      const button = document.getElementById(`option${index}`);
      if (button) {
        button.textContent = option;
        button.onclick = () => submitAnswer(index);
      }
    });
  } else {
    document.getElementById("trueFalseButtons").classList.remove("hidden");
    document.getElementById("multipleChoiceButtons").classList.add("hidden");
  }

  showScreen("questionScreen");
}

// Submit answer
async function submitAnswer(answer) {
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  const isCorrect = answer === currentQuestion.answer;

  // Update player steps
  const currentPlayerName = gameState.players[gameState.currentPlayerIndex].name;
  
  if (isCorrect) {
    gameState.playerSteps[currentPlayerName] = (gameState.playerSteps[currentPlayerName] || 0) + 1;
  } else {
    gameState.playerSteps[currentPlayerName] = Math.max(0, (gameState.playerSteps[currentPlayerName] || 0) - 1);
  }

  // Save to Firebase
  await saveGameToFirebase();

  // Show result
  showResult(isCorrect, answer);
}

// Show result
function showResult(isCorrect, playerAnswer) {
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  const currentPlayerName = gameState.players[gameState.currentPlayerIndex].name;
  const steps = gameState.playerSteps[currentPlayerName] || 0;

  document.getElementById("resultTitle").textContent = isCorrect ? "Correct!" : "Incorrect!";
  
  let answerText;
  if (currentQuestion.type === "multiple_choice") {
    answerText = `Je antwoord: ${currentQuestion.options[playerAnswer]}`;
  } else {
    answerText = `Je antwoord: ${playerAnswer ? "Echt" : "Fake"}`;
  }
  
  document.getElementById("resultMessage").textContent = answerText;
  document.getElementById("stepsDisplayResult").textContent = steps;
  
  const stepChange = isCorrect ? "+1 stap" : "-1 stap";
  document.getElementById("stepChange").textContent = stepChange;
  document.getElementById("stepChange").style.color = isCorrect ? "#4CAF50" : "#f44336";

  showScreen("resultScreen");
}

// Next turn
async function nextTurn() {
  // Move to next player
  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  
  // Move to next question if all players have answered
  if (gameState.currentPlayerIndex === 0) {
    gameState.currentQuestionIndex++;
    
    // Check if game is over
    if (gameState.currentQuestionIndex >= gameState.questions.length) {
      // Game over - show final results
      showFinalResults();
      return;
    }
  }

  // Save to Firebase
  await saveGameToFirebase();

  // Update display and show game screen
  updateGameDisplay();
  showScreen("gameScreen");
}

// Show final results
function showFinalResults() {
  // Find winner (player with most steps)
  let winner = null;
  let maxSteps = -1;
  
  for (const [playerName, steps] of Object.entries(gameState.playerSteps)) {
    if (steps > maxSteps) {
      maxSteps = steps;
      winner = playerName;
    }
  }

  document.getElementById("resultTitle").textContent = "Game Over!";
  document.getElementById("resultMessage").textContent = `Winner: ${winner} with ${maxSteps} steps!`;
  document.getElementById("stepsDisplayResult").textContent = gameState.playerSteps[gameState.playerName] || 0;
  document.getElementById("stepChange").textContent = "Final Score";
  
  // Hide next turn button
  document.getElementById("nextTurnBtn").style.display = "none";
  
  showScreen("resultScreen");
}

// Reset game
function resetGame() {
  // Reset game state
  gameState.gameCode = "";
  gameState.players = [];
  gameState.currentPlayerIndex = 0;
  gameState.currentQuestionIndex = 0;
  gameState.fakemakerName = "";
  gameState.fakemakerUnmasked = false;
  gameState.playerName = "";
  gameState.playerRole = "";
  gameState.playerSteps = {};

  // Show start screen
  showScreen("startScreen");
  
  // Show next turn button again
  document.getElementById("nextTurnBtn").style.display = "block";
}

// Share game
async function shareGame() {
  const gameUrl = `${window.location.origin}${window.location.pathname}?game=${gameState.gameCode}`;
  
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Truth Seekers Game',
        text: `Join my Truth Seekers game with code: ${gameState.gameCode}`,
        url: gameUrl
      });
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(gameUrl);
      document.getElementById("shareSuccessMessage").textContent = "Game link copied to clipboard!";
      document.getElementById("shareSuccessMessage").classList.remove("hidden");
      
      setTimeout(() => {
        document.getElementById("shareSuccessMessage").classList.add("hidden");
      }, 3000);
    }
  } catch (error) {
    console.error("Error sharing:", error);
  }
}

// Copy to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Code copied to clipboard!");
  } catch (error) {
    console.error("Error copying to clipboard:", error);
    alert("Could not copy to clipboard");
  }
}

// Check for game code in URL
function checkForGameCodeInURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameCode = urlParams.get('game');
  
  if (gameCode) {
    document.getElementById("gameCodeInput").value = gameCode;
    showScreen("joinGameScreen");
  }
}

// Firebase functions
async function saveGameToFirebase() {
  try {
    const gameRef = database.ref(`games/${gameState.gameCode}`);
    await gameRef.set({
      players: gameState.players,
      currentPlayerIndex: gameState.currentPlayerIndex,
      currentQuestionIndex: gameState.currentQuestionIndex,
      fakemakerName: gameState.fakemakerName,
      fakemakerUnmasked: gameState.fakemakerUnmasked,
      playerSteps: gameState.playerSteps,
      questions: gameState.questions,
      gameStarted: gameState.gameStarted || false,
      lastUpdated: Date.now()
    });
    console.log("Game saved to Firebase successfully");
  } catch (error) {
    console.error("Error saving to Firebase:", error);
    throw error;
  }
}

async function loadGameFromFirebase(gameCode) {
  try {
    const gameRef = database.ref(`games/${gameCode}`);
    const snapshot = await gameRef.once('value');
    const gameData = snapshot.val();
    console.log("Game loaded from Firebase:", gameData);
    return gameData;
  } catch (error) {
    console.error("Error loading from Firebase:", error);
    return null;
  }
}

function startListeningForUpdates() {
  if (!gameState.gameCode) return;
  
  const gameRef = database.ref(`games/${gameState.gameCode}`);
  gameRef.on('value', (snapshot) => {
    const gameData = snapshot.val();
    if (!gameData) return;
    
    // Update connection status
    updateConnectionStatus(true);
    
    // Update game state
    gameState.players = gameData.players || [];
    gameState.currentPlayerIndex = gameData.currentPlayerIndex || 0;
    gameState.currentQuestionIndex = gameData.currentQuestionIndex || 0;
    gameState.fakemakerName = gameData.fakemakerName || "";
    gameState.fakemakerUnmasked = gameData.fakemakerUnmasked || false;
    gameState.playerSteps = gameData.playerSteps || {};
    gameState.questions = gameData.questions || [];
    gameState.gameStarted = gameData.gameStarted || false;
    
    // Update UI based on current screen
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen) {
      const screenId = currentScreen.id;
      
      if (screenId === 'hostGameScreen') {
        updatePlayerList();
      } else if (screenId === 'gameScreen') {
        updateGameDisplay();
      } else if (screenId === 'roleConfirmationScreen' && gameState.gameStarted) {
        // Auto-advance to game screen if game has started
        updateGameDisplay();
        showScreen('gameScreen');
      }
    }
  });
  
  // Handle connection status
  const connectedRef = database.ref('.info/connected');
  connectedRef.on('value', (snapshot) => {
    updateConnectionStatus(snapshot.val());
  });
}

function updateConnectionStatus(connected) {
  const indicator = document.getElementById('connectionIndicator');
  const status = document.getElementById('connectionStatus');
  
  if (connected) {
    indicator.className = 'connection-indicator';
    status.textContent = 'Verbonden';
  } else {
    indicator.className = 'connection-indicator offline';
    status.textContent = 'Offline';
  }
}

