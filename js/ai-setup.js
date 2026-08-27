// js/ai-setup.js
// Handles the AI syllabus upload flow — supports PDF, JPG, PNG, WEBP

let syllabusText = "";
let detectedTopics = [];
let detectedUnits = [];
let selectedTopic = "";
let selectedUnitText = "";
let isGenerating = false;
let isUploading = false;

const uploadMessages = [
  "Uploading...",
  "Analyzing document...",
  "Extracting syllabus...",
  "Generating topics...",
  "Preparing your Viva...",
];

const generateMessages = [
  "Preparing your personalized viva...",
  "Professor is reading your syllabus...",
  "Crafting questions to destroy you...",
  "Loading nightmare questions...",
  "Professor adjusting glasses judgmentally...",
  "Almost ready to ruin your day...",
];

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

// ── Screen Management ──────────────────────────────────────────

function showAISetupScreen() {
  playClickSound();
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("ai-setup-screen").classList.add("active");
  resetAISetup();
}

function backToStart() {
  playClickSound();
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("start-screen").classList.add("active");
}

function resetAISetup() {
  syllabusText = "";
  detectedTopics = [];
  detectedUnits = [];
  selectedTopic = "";
  selectedUnitText = "";
  isGenerating = false;
  isUploading = false;

  document.getElementById("ai-step2").style.display = "none";
  document.getElementById("ai-step3").style.display = "none";
  document.getElementById("ai-step4").style.display = "none";
  document.getElementById("ai-error").style.display = "none";
  document.getElementById("ai-upload-loading").style.display = "none";
  document.getElementById("ai-loading").style.display = "none";

  const input = document.getElementById("ai-upload-input");
  if (input) input.value = "";

  setUploadAreaState("idle");
}

// ── Upload Area State ──────────────────────────────────────────

function setUploadAreaState(state, filename) {
  const icon = document.getElementById("ai-upload-icon");
  const label = document.getElementById("ai-upload-label");
  const hint = document.getElementById("ai-upload-hint");
  const area = document.getElementById("ai-upload-area");

  area.classList.remove("uploading", "success", "error");

  if (state === "idle") {
    icon.textContent = "📎";
    label.textContent = "Upload Syllabus";
    hint.textContent = "PDF · JPG · JPEG · PNG · WEBP · Max 10MB";
    area.style.cursor = "pointer";
  } else if (state === "uploading") {
    area.classList.add("uploading");
    icon.textContent = "⏳";
    label.textContent = "Reading document...";
    hint.textContent = "Please wait";
    area.style.cursor = "default";
  } else if (state === "success") {
    area.classList.add("success");
    icon.textContent = "✅";
    label.textContent = filename || "File uploaded";
    hint.textContent = "Click to upload a different file";
    area.style.cursor = "pointer";
  } else if (state === "error") {
    area.classList.add("error");
    icon.textContent = "❌";
    label.textContent = "Upload failed";
    hint.textContent = "Click to try again";
    area.style.cursor = "pointer";
  }
}

// ── File Validation ────────────────────────────────────────────

function validateFile(file) {
  if (!file) return "No file selected.";

  const ext = "." + file.name.split(".").pop().toLowerCase();
  const isValidExt = ACCEPTED_EXTENSIONS.includes(ext);
  const isValidType = ACCEPTED_TYPES.includes(file.type) || isValidExt;

  if (!isValidType) {
    return "Unsupported file type. Please upload a PDF, JPG, PNG, or WEBP file.";
  }
  if (file.size > 10 * 1024 * 1024) {
    return "File too large. Maximum size is 10MB.";
  }
  if (file.size < 100) {
    return "File appears to be empty. Please upload a valid document.";
  }
  return null;
}

// ── Drag and Drop ──────────────────────────────────────────────

function initUploadDragDrop() {
  const area = document.getElementById("ai-upload-area");
  if (!area) return;

  area.addEventListener("dragover", e => {
    e.preventDefault();
    if (!isUploading) area.classList.add("drag-over");
  });

  area.addEventListener("dragleave", e => {
    area.classList.remove("drag-over");
  });

  area.addEventListener("drop", e => {
    e.preventDefault();
    area.classList.remove("drag-over");
    const file = e.dataTransfer && e.dataTransfer.files[0];
    if (file) processFile(file);
  });
}

// ── Upload Handler ─────────────────────────────────────────────

async function handleSyllabusUpload(input) {
  const file = input.files[0];
  if (!file) return;
  processFile(file);
}

async function processFile(file) {
  if (isUploading) return;

  const validationError = validateFile(file);
  if (validationError) {
    showAIError(validationError);
    setUploadAreaState("error");
    return;
  }

  isUploading = true;

  document.getElementById("ai-step2").style.display = "none";
  document.getElementById("ai-step3").style.display = "none";
  document.getElementById("ai-step4").style.display = "none";
  document.getElementById("ai-error").style.display = "none";

  setUploadAreaState("uploading");

  const uploadLoadingEl = document.getElementById("ai-upload-loading");
  const uploadLoadingText = document.getElementById("ai-upload-loading-text");
  uploadLoadingEl.style.display = "flex";
  uploadLoadingText.textContent = uploadMessages[0];

  let msgIndex = 0;
  const msgInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % uploadMessages.length;
    uploadLoadingText.textContent = uploadMessages[msgIndex];
  }, 1800);

  const formData = new FormData();
  formData.append("syllabus", file);

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    clearInterval(msgInterval);
    uploadLoadingEl.style.display = "none";

    if (!res.ok) {
      showAIError(data.error || "Upload failed. Please try again.");
      setUploadAreaState("error");
      isUploading = false;
      return;
    }

    syllabusText = data.syllabusText || "";
    detectedTopics = data.topics || [];
    detectedUnits = Array.isArray(data.units) ? data.units : [];

    setUploadAreaState("success", file.name);
    if (detectedUnits.length >= 2) {
      showUnits(detectedUnits);
    } else {
      showTopics(detectedTopics);
    }

  } catch (err) {
    clearInterval(msgInterval);
    uploadLoadingEl.style.display = "none";
    showAIError("Network error. Please check your connection and try again.");
    setUploadAreaState("error");
  }

  isUploading = false;
}

// ── Units / Topics ─────────────────────────────────────────────

function showUnits(units) {
  const step2 = document.getElementById("ai-step2");
  const topicsContainer = document.getElementById("ai-topics");
  step2.style.display = "block";
  topicsContainer.innerHTML = "";
  selectedTopic = "";
  selectedUnitText = "";

  units.forEach(unit => {
    const btn = document.createElement("button");
    btn.className = "ai-topic-btn";
    btn.textContent = unit.label || unit.id;
    btn.onclick = () => selectUnit(unit, btn);
    topicsContainer.appendChild(btn);
  });

  document.getElementById("ai-step3").style.display = "none";
  document.getElementById("ai-step4").style.display = "none";
  step2.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function selectUnit(unit, btn) {
  playClickSound();
  selectedTopic = unit.title || unit.id;
  selectedUnitText = unit.text || "";
  document.querySelectorAll(".ai-topic-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const step3 = document.getElementById("ai-step3");
  step3.style.display = "block";
  document.getElementById("ai-step4").style.display = "none";
  step3.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showTopics(topics) {
  if (!topics || topics.length === 0) {
    showAIError("No topics detected. Please try a different document.");
    return;
  }

  const step2 = document.getElementById("ai-step2");
  const topicsContainer = document.getElementById("ai-topics");
  step2.style.display = "block";
  topicsContainer.innerHTML = "";
  selectedTopic = "";

  topics.forEach(topic => {
    const btn = document.createElement("button");
    btn.className = "ai-topic-btn";
    btn.textContent = topic;
    btn.onclick = () => selectTopic(topic, btn);
    topicsContainer.appendChild(btn);
  });

  document.getElementById("ai-step3").style.display = "none";
  document.getElementById("ai-step4").style.display = "none";
  step2.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function selectTopic(topic, btn) {
  playClickSound();
  selectedTopic = topic;
  selectedUnitText = "";
  document.querySelectorAll(".ai-topic-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const step3 = document.getElementById("ai-step3");
  step3.style.display = "block";
  document.getElementById("ai-step4").style.display = "none";
  step3.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ── Difficulty ─────────────────────────────────────────────────

function selectAIDifficulty(diff, el) {
  playClickSound();
  gameState.difficulty = diff;
  document.querySelectorAll(".ai-diff-btn").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  const step4 = document.getElementById("ai-step4");
  step4.style.display = "block";
  step4.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ── Generate & Start ───────────────────────────────────────────

async function generateAndStart() {
  if (isGenerating) return;
  if (!selectedTopic) { showAIError("Please select a topic first."); return; }
  if (!syllabusText) { showAIError("Please upload a syllabus first."); return; }

  isGenerating = true;
  const btn = document.getElementById("ai-generate-btn");
  btn.disabled = true;

  document.getElementById("ai-error").style.display = "none";

  const loadingEl = document.getElementById("ai-loading");
  const loadingText = document.getElementById("ai-loading-text");
  const loadingFill = document.getElementById("ai-loading-fill");
  loadingEl.style.display = "flex";
  loadingText.textContent = generateMessages[0];
  if (loadingFill) loadingFill.style.width = "6%";

  let msgIndex = 0;
  const msgInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % generateMessages.length;
    loadingText.textContent = generateMessages[msgIndex];
    // step the bar forward with each message, capped short of 100% so it
    // only completes once the request actually finishes
    if (loadingFill) {
      const pct = Math.min(92, Math.round(((msgIndex + 1) / generateMessages.length) * 92));
      loadingFill.style.width = pct + "%";
    }
  }, 2000);

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: selectedTopic,
        difficulty: gameState.difficulty,
        syllabusText: (selectedUnitText && selectedUnitText.length > 40) ? selectedUnitText : syllabusText
      })
    });

    const data = await res.json();
    clearInterval(msgInterval);

    if (!res.ok) {
      showAIError(data.error || "Generation failed. Please try again.");
      loadingEl.style.display = "none";
      btn.disabled = false;
      isGenerating = false;
      return;
    }

    window.AI_QUESTIONS = data.questions;

    loadingText.textContent = "✅ Your Viva is Ready!";
    if (loadingFill) loadingFill.style.width = "100%";

    setTimeout(() => {
      isGenerating = false;
      loadingEl.style.display = "none";
      document.getElementById("ai-setup-screen").classList.remove("active");
      startGame();
    }, 900);

  } catch (err) {
    clearInterval(msgInterval);
    showAIError("Network error. Please check your connection and try again.");
    loadingEl.style.display = "none";
    btn.disabled = false;
    isGenerating = false;
  }
}

// ── Error ──────────────────────────────────────────────────────

function showAIError(msg) {
  const el = document.getElementById("ai-error");
  el.textContent = "⚠️ " + msg;
  el.style.display = "block";
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ── Init ───────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initUploadDragDrop();
});
