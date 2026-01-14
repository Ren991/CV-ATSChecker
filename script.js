// Configuración de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// --- CONFIGURACIÓN BASADA EN TU LISTA ---
const GEMINI_API_KEY = "REPLACE_ME_WITH_GEMINI_KEY"; 
// Usamos el modelo gemini-3-flash-preview de tu lista
const MODEL_NAME = "gemini-3-flash-preview";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const loader = document.getElementById('loader');
const results = document.getElementById('results');
const scoreValueText = document.getElementById('scoreValue');
const feedbackList = document.getElementById('feedbackList');

// Eventos de carga
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
        alert('Por favor, sube un archivo PDF válido.');
        return;
    }

    document.getElementById('fileNameDisplay').innerText = `Analizando: ${file.name}`;
    dropZone.style.display = 'none';
    loader.style.display = 'block';

    try {
        const text = await extractText(file);
        await analyzeWithAI(text);
    } catch (error) {
        console.error("Error:", error);
        alert('Error en el proceso: ' + error.message);
        location.reload();
    }
}

async function extractText(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    fullText += content.items.map(item => item.str).join(' ');
                }
                resolve(fullText);
            } catch (e) { reject(e); }
        };
        reader.readAsArrayBuffer(file);
    });
}

async function analyzeWithAI(cvText) {
    const promptText = `Eres un reclutador experto IT. Analiza este CV, incluyendo si pasaría todos los filtros ATS y devuelve un JSON.
    JSON format: { "score": 0-100, "category": "ELITE/SÓLIDO/MEJORABLE/CRÍTICO", "categoryDesc": "string", "feedback": ["string"] }
    CV TEXT: ${cvText}`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: {
                    response_mime_type: "application/json"
                }
            })
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error.message);

        // Con Gemini 3 Flash y response_mime_type, el JSON viene directo
        const aiResult = JSON.parse(data.candidates[0].content.parts[0].text);
        displayResults(aiResult);

    } catch (error) {
        console.error("Error IA:", error);
        throw new Error("La IA no pudo procesar el CV. Verifica el contenido.");
    }
}

function displayResults(data) {
    loader.style.display = 'none';
    results.style.display = 'block';

    const badge = document.getElementById('categoryBadge');
    badge.innerText = data.category;
    badge.style.background = getCategoryColor(data.category);
    
    document.getElementById('categoryTitle').innerText = "Análisis IA Completado";
    document.getElementById('categoryDesc').innerText = data.categoryDesc;

    animateGauge(data.score);

    feedbackList.innerHTML = data.feedback
        .map(f => `<li class="feedback-item">🤖 ${f}</li>`).join('');
}

function getCategoryColor(cat) {
    const colors = { 'ELITE': '#10b981', 'SÓLIDO': '#22d3ee', 'MEJORABLE': '#f59e0b', 'CRÍTICO': '#ef4444' };
    return colors[cat] || '#6366f1';
}

function animateGauge(target) {
    const canvas = document.getElementById('scoreCanvas');
    const ctx = canvas.getContext('2d');
    let current = 0;

    function draw() {
        ctx.clearRect(0, 0, 120, 120);
        ctx.beginPath();
        ctx.arc(60, 60, 54, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 10;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(60, 60, 54, 0, (current / 100) * 2 * Math.PI);
        ctx.strokeStyle = current > 75 ? '#10b981' : (current > 45 ? '#22d3ee' : '#ef4444');
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.stroke();

        scoreValueText.innerText = `${Math.round(current)}%`;

        if (current < target) {
            current += 1;
            requestAnimationFrame(draw);
        }
    }
    draw();
}
