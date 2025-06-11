/* Truth Seekers Game - script.js with fixed AR camera control */

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

// AR View Logic - FIXED VERSION
let arComponentsInitialized = false;
let arSceneCreated = false;
const arModels = [
    { primitive: "box", color: "red", scale: "1 1 1" },
    { primitive: "sphere", color: "blue", scale: "1 1 1" },
    { primitive: "cone", color: "green", scale: "1 1 1" }
];
let arCurrentIndex = 0;
let arDynamicObject; // Will be assigned when AR is initialized

const arSceneInnerHtml = `
    <a-marker preset="hiro">
        <a-entity id="dynamicObject" position="0 0 0" scale="0.5 0.5 0.5"></a-entity>
    </a-marker>
    <a-entity camera></a-entity>
`;

function initializeArComponents() {
    if (arComponentsInitialized) return;

    arDynamicObject = document.getElementById("dynamicObject");
    // Ensure querySelector is specific enough if multiple markers exist on the page
    const marker = document.querySelector("#arViewContainer a-marker[preset='hiro']");

    if (!arDynamicObject || !marker) {
        console.error("AR components (dynamicObject or marker) not found for initialization.");
        // Retry initialization if elements weren't ready
        setTimeout(initializeArComponents, 500);
        return;
    }

    marker.addEventListener("markerFound", () => {
        console.log("Marker found, changing AR model.");
        if (!arDynamicObject) return;
        const model = arModels[arCurrentIndex];
        arDynamicObject.setAttribute("geometry", `primitive: ${model.primitive}`);
        arDynamicObject.setAttribute("material", `color: ${model.color}`);
        arDynamicObject.setAttribute("scale", model.scale); // Use model-specific scale
        arCurrentIndex = (arCurrentIndex + 1) % arModels.length;
    });

    arComponentsInitialized = true;
    console.log("AR Components Initialized");
}

function showArView() {
    const arViewContainer = document.getElementById("arViewContainer");
    if (!arViewContainer) {
        console.error("AR View Container not found.");
        return;
    }

    // Show the AR container first
    arViewContainer.classList.add("active");

    // Only create and start AR scene if it hasn't been created yet
    if (!arSceneCreated) {
        createArScene();
    } else {
        // If scene exists but was paused, restart it
        const scene = arViewContainer.querySelector('a-scene');
        if (scene) {
            if (scene.hasLoaded && !scene.isPlaying) {
                scene.play();
        