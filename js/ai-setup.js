// js/ai-setup.js
// Handles the AI syllabus upload flow before the game starts

let syllabusText = "";
let detectedTopics = [];
let selectedTopic = "";
let isGenerating = false;

const loadingMessages = [
  "Preparing your personalized viva...",
  "Professor is reading your syllabus...",
  "Crafting questions to destroy you...",
  "Loading nightmare questions...",
  "Professor adjusting glasses judgmentally...",
  "Almost ready to ruin your day...",
];

function showAISetupScreen() {
  playClickSound();
  document.getElementById('start-screen').classList.remove('active');
  document.getElementById('ai-setup-screen').classList.add('active');
  // Reset state
  syllabusText = "";
  detectedTopics = [];
  selectedTopic = "";
  document.getElementById('ai-step2').style.display = 'none';
  document.getElementById('ai-step3').style.display = 'none';
  document.getElementById('ai-step4').style.display = 'none';
  document.getElementById('ai-error').style.display = 'none';
  document.getElementById('ai-upload-input').value = '';
  document.getElementById('ai-upload-label').textContent = '📄 Click to upload syllabus PDF';
}

function backToStart() {
  playClickSound();
  document.getElementById('ai-setup-screen').classList.remove('active');
  document.getElementById('start-screen').classList.add('active');
}

async function handleSyllabusUpload(input) {
  const file = input.files[0];
  if (!file) return;

  // Validate
  if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
    showAIError('Please upload a PDF file only.');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showAIError('File too large. Maximum size is 5MB.');
    return;
  }

  document.getElementById('ai-upload-label').textContent = '⏳ Reading ' + file.name + '...';
  document.getElementById('ai-step2').style.display = 'none';
  document.getElementById('ai-step3').style.display = 'none';
  document.getElementById('ai-step4').style.display = 'none';
  document.getElementById('ai-error').style.display = 'none';

  const formData = new FormData();
  formData.append('syllabus', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      showAIError(data.error || 'Upload failed. Please try again.');
      document.getElementById('ai-upload-label').textContent = '📄 Click to upload syllabus PDF';
      return;
    }

    syllabusText = data.syllabusText;
    detectedTopics = data.topics;

    document.getElementById('ai-upload-label').textContent = '✅ ' + file.name;
    showTopics(detectedTopics);

  } catch (err) {
    showAIError('Network error. Please check your connection and try again.');
    document.getElementById('ai-upload-label').textContent = '📄 Click to upload syllabus PDF';
  }
}

function showTopics(topics) {
  const step2 = document.getElementById('ai-step2');
  const topicsContainer = document.getElementById('ai-topics');
  step2.style.display = 'block';
  topicsContainer.innerHTML = '';
  selectedTopic = '';

  topics.forEach(topic => {
    const btn = document.createElement('button');
    btn.className = 'ai-topic-btn';
    btn.textContent = topic;
    btn.onclick = () => selectTopic(topic, btn);
    topicsContainer.appendChild(btn);
  });

  document.getElementById('ai-step3').style.display = 'none';
  document.getElementById('ai-step4').style.display = 'none';
}

function selectTopic(topic, btn) {
  playClickSound();
  selectedTopic = topic;
  document.querySelectorAll('.ai-topic-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ai-step3').style.display = 'block';
  document.getElementById('ai-step4').style.display = 'none';
}

function selectAIDifficulty(diff, el) {
  playClickSound();
  gameState.difficulty = diff;
  document.querySelectorAll('.ai-diff-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('ai-step4').style.display = 'block';
}

async function generateAndStart() {
  if (isGenerating) return;
  if (!selectedTopic) { showAIError('Please select a topic first.'); return; }
  if (!syllabusText) { showAIError('Please upload a syllabus first.'); return; }

  isGenerating = true;
  const btn = document.getElementById('ai-generate-btn');
  btn.disabled = true;

  const loadingEl = document.getElementById('ai-loading');
  const loadingText = document.getElementById('ai-loading-text');
  loadingEl.style.display = 'block';
  document.getElementById('ai-error').style.display = 'none';

  // Cycle loading messages
  let msgIndex = 0;
  loadingText.textContent = loadingMessages[0];
  const msgInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[msgIndex];
  }, 2000);

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: selectedTopic,
        difficulty: gameState.difficulty,
        syllabusText: syllabusText
      })
    });

    const data = await res.json();
    clearInterval(msgInterval);

    if (!res.ok) {
      showAIError(data.error || 'Generation failed. Please try again.');
      loadingEl.style.display = 'none';
      btn.disabled = false;
      isGenerating = false;
      return;
    }

    // Inject AI questions into the game
    window.AI_QUESTIONS = data.questions;

    loadingEl.style.display = 'none';
    loadingText.textContent = '✅ Your Viva is Ready!';
    loadingEl.style.display = 'block';

    setTimeout(() => {
      isGenerating = false;
      document.getElementById('ai-setup-screen').classList.remove('active');
      startGame();
    }, 1000);

  } catch (err) {
    clearInterval(msgInterval);
    showAIError('Network error. Please check your connection and try again.');
    loadingEl.style.display = 'none';
    btn.disabled = false;
    isGenerating = false;
  }
}

function showAIError(msg) {
  const el = document.getElementById('ai-error');
  el.textContent = '⚠️ ' + msg;
  el.style.display = 'block';
}
