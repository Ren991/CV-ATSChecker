// ===============================
// CONFIG
// ===============================
const API_ENDPOINT = "/api/analyzeCV";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

// ===============================
// DOM
// ===============================
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileNameDisplay = document.getElementById("fileNameDisplay");
const results = document.getElementById("results");
const feedbackList = document.getElementById("feedbackList");

// ===============================
// EVENTS
// ===============================
dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

// ===============================
// FILE HANDLING
// ===============================
function handleFile(file) {
  if (file.type !== "application/pdf") {
    Swal.fire("Error", "Solo se permiten archivos PDF", "error");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    Swal.fire("Error", "El archivo supera los 5MB", "error");
    return;
  }

  fileNameDisplay.innerText = file.name;
  extractTextFromPDF(file);
}

// ===============================
// PDF → TEXT
// ===============================
async function extractTextFromPDF(file) {
  Swal.fire({
    title: "Procesando CV",
    text: "Extrayendo texto del PDF...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  const reader = new FileReader();

  reader.onload = async function () {
    try {
      const pdf = await pdfjsLib
        .getDocument(new Uint8Array(this.result))
        .promise;

      let text = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(i => i.str).join(" ") + "\n";
      }

      Swal.close();
      analyzeCV(text);
    } catch {
      Swal.fire("Error", "No se pudo leer el PDF", "error");
    }
  };

  reader.readAsArrayBuffer(file);
}

// ===============================
// BACKEND CALL
// ===============================
async function analyzeCV(cvText) {
  Swal.fire({
    title: "Analizando CV",
    text: "Evaluando compatibilidad ATS...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cvText }),
    });

    if (!res.ok) throw new Error("Error al analizar el CV");

    const data = await res.json();

    Swal.close();
    renderResults(data);
  } catch (err) {
    Swal.fire("Error", err.message, "error");
  }
}

// ===============================
// RENDER
// ===============================
function renderResults(data) {
  results.style.display = "block";

  renderGauge(data.score);
  renderCategory(data);
  renderFeedback(data.improvements);
}

// ===============================
// GAUGE
// ===============================
function renderGauge(score) {
  const canvas = document.getElementById("scoreCanvas");
  const ctx = canvas.getContext("2d");
  const value = document.getElementById("scoreValue");

  const r = canvas.width / 2 - 10;
  const c = canvas.width / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 10;
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.stroke();

  const colors = score >= 80 ? "#10b981" : score >= 60 ? "#6366f1" : "#ef4444";
  const end = (Math.PI * 2 * score) / 100;

  ctx.beginPath();
  ctx.strokeStyle = colors;
  ctx.lineWidth = 10;
  ctx.arc(c, c, r, 0, end);
  ctx.stroke();

  value.innerText = `${score}%`;
  value.style.color = colors;
}

// ===============================
// CATEGORY
// ===============================
function renderCategory(data) {
  document.getElementById("categoryBadge").innerText = data.category;
  document.getElementById("categoryTitle").innerText = data.category;
  document.getElementById("categoryDesc").innerText = data.summary;
}

// ===============================
// FEEDBACK
// ===============================
function renderFeedback(list) {
  feedbackList.innerHTML = "";

  if (!Array.isArray(list)) return;

  list.forEach(item => {
    const li = document.createElement("li");
    li.className = "feedback-item";
    li.innerText = item;
    feedbackList.appendChild(li);
  });
}
