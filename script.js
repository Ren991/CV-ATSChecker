// Configuración de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// --- API ENDPOINT DE VERCEL (Seguro, sin API key expuesta) ---
const ANALYZE_API = "/api/analyzeCV";

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
        //alert('Por favor, sube un archivo PDF válido.');
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
    try {
        const response = await fetch(ANALYZE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cvText: cvText })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const aiResult = await response.json();
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
