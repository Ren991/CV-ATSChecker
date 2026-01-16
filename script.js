// ===============================
// CONFIG
// ===============================
const API_ENDPOINT = "/api/analyzeCV";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

// ===============================
// ELEMENTOS DOM
// ===============================
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileNameDisplay = document.getElementById("fileNameDisplay");
const loader = document.getElementById("loader");
const results = document.getElementById("results");
const feedbackList = document.getElementById("feedbackList");

// ===============================
// EVENTOS UPLOAD
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
// MANEJO DE ARCHIVO
// ===============================
function handleFile(file) {
  if (file.type !== "application/pdf") {
    Swal.fire({
      icon: "error",
      title: "Formato inválido",
      text: "Solo se permiten archivos PDF",
    });
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    Swal.fire({
      icon: "error",
      title: "Archivo muy grande",
      text: "El archivo no puede superar los 5MB",
    });
    return;
  }

  fileNameDisplay.innerText = file.name;
  extractTextFromPDF(file);
}

// ===============================
// PDF → TEXTO
// ===============================
async function extractTextFromPDF(file) {
  Swal.fire({
    title: "Leyendo CV",
    text: "Extrayendo texto del PDF...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  const reader = new FileReader();

  reader.onload = async function () {
    try {
      const typedArray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;

      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        fullText += strings.join(" ") + "\n";
      }

      Swal.close();
      analyzeCV(fullText);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo leer el PDF",
      });
    }
  };

  reader.readAsArrayBuffer(file);
}

// ===============================
// ENVÍO AL BACKEND
// ===============================
async function analyzeCV(cvText) {
  Swal.fire({
    title: "Analizando CV",
    text: "Evaluando estructura y keywords ATS...",
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
    Swal.fire({
      icon: "error",
      title: "Error",
      text: err.message || "Falló el análisis del CV",
    });
  }
}

// ===============================
// RENDER RESULTADOS
// ===============================
function renderResults(data) {
  results.style.display = "block";

  renderGauge(data.score);
  renderCategory(data);
  renderFeedback(data.feedback);
}

// ===============================
// GAUGE SCORE
// ===============================
function renderGauge(score) {
  const canvas = document.getElementById("scoreCanvas");
  const ctx = canvas.getContext("2d");
  const valueText = document.getElementById("scoreValue");

  const radius = canvas.width / 2 - 10;
  const center = canvas.width / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fondo
  ctx.beginPath();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 10;
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Color según score
  const color =
    score >= 80
      ? "#10b981"
      : score >= 60
      ? "#6366f1"
      : score >= 40
      ? "#f59e0b"
      : "#ef4444";

  // Progreso
  const endAngle = (Math.PI * 2 * score) / 100;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.arc(center, center, radius, 0, endAngle);
  ctx.stroke();

  valueText.innerText = `${score}%`;
  valueText.style.color = color;
}

// ===============================
// CATEGORÍA
// ===============================
function renderCategory(data) {
  const badge = document.getElementById("categoryBadge");
  const title = document.getElementById("categoryTitle");
  const desc = document.getElementById("categoryDesc");

  badge.innerText = data.category;
  title.innerText = data.category;
  desc.innerText = data.categoryDesc;

  badge.style.background =
    data.category === "ELITE"
      ? "var(--success)"
      : data.category === "SÓLIDO"
      ? "var(--primary)"
      : data.category === "MEJORABLE"
      ? "var(--warning)"
      : "var(--danger)";
}

// ===============================
// FEEDBACK
// ===============================
function renderFeedback(feedback) {
  feedbackList.innerHTML = "";

  feedback.forEach(text => {
    const li = document.createElement("li");
    li.className = "feedback-item";
    li.innerText = text;
    feedbackList.appendChild(li);
  });
}
