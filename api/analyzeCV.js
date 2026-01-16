const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ===============================
// UTILIDADES
// ===============================
function normalizeCategory(score) {
  if (score >= 90) return "ELITE";
  if (score >= 75) return "SÓLIDO";
  if (score >= 55) return "MEJORABLE";
  return "CRÍTICO";
}

function ensureArray(value, minLength = 0) {
  if (!Array.isArray(value)) return [];
  if (value.length < minLength) return value;
  return value;
}

// ===============================
// HANDLER
// ===============================
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { cvText } = req.body;

    if (!cvText || typeof cvText !== "string") {
      return res.status(400).json({ error: "cvText es requerido" });
    }

    const model = genAI.getGenerativeModel({
      model: "gemma-3-1b-it",
    });

    const prompt = `
Actúa como un analista senior de CVs para procesos de selección IT, con experiencia en ATS, reclutamiento técnico y evaluación de empleabilidad real.

INSTRUCCIONES OBLIGATORIAS:
- Responde EXCLUSIVAMENTE en ESPAÑOL.
- Devuelve ÚNICAMENTE un JSON válido.
- No incluyas texto explicativo fuera del JSON.
- No traduzcas ni inventes información que no esté explícita en el CV.
- Analiza solo el contenido presente en el CV proporcionado.
- No emitas opiniones personales ni suposiciones.
- No utilices inglés bajo ningún concepto.

OBJETIVO:
Evaluar la calidad profesional del CV, su claridad, estructura, impacto y compatibilidad con procesos de selección automatizados (ATS), y proponer mejoras concretas basadas únicamente en lo que el CV contiene o no contiene.

ESTRUCTURA DE RESPUESTA (OBLIGATORIA Y EXACTA):

{
  "score": number,
  "category": "ELITE" | "SÓLIDO" | "MEJORABLE" | "CRÍTICO",
  "summary": string,
  "strengths": [string, string],
  "improvements": [string, string, string],
  "atsObservations": [string, string]
}

REGLAS PARA EL SCORE Y CATEGORÍA:
- 90 a 100 → "ELITE"
- 75 a 89 → "SÓLIDO"
- 55 a 74 → "MEJORABLE"
- 0 a 54 → "CRÍTICO"

RESTRICCIONES CLAVE:
- No repitas frases del CV literalmente.
- No hagas sugerencias genéricas.
- No inventes experiencia, tecnologías o logros.
- Si falta información relevante, indícalo como mejora.
- Cada mejora debe ser clara, específica y aplicable.

CV A ANALIZAR:
"""
${cvText}
"""
`;

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
    });

    const responseText = result.response.text();

    // ===============================
    // PARSEO ULTRA DEFENSIVO
    // ===============================
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("La IA no devolvió un JSON reconocible");
    }

    let aiResult;
    try {
      aiResult = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error("JSON inválido generado por la IA");
    }

    // ===============================
    // NORMALIZACIONES
    // ===============================
    aiResult.score = Number(aiResult.score);

    if (
      Number.isNaN(aiResult.score) ||
      aiResult.score < 0 ||
      aiResult.score > 100
    ) {
      throw new Error("Score inválido generado por la IA");
    }

    aiResult.category = normalizeCategory(aiResult.score);

    aiResult.summary = typeof aiResult.summary === "string" ? aiResult.summary : "";

    aiResult.strengths = ensureArray(aiResult.strengths, 1);
    aiResult.improvements = ensureArray(aiResult.improvements, 1);
    aiResult.atsObservations = ensureArray(aiResult.atsObservations, 1);

    // ===============================
    // RESPUESTA FINAL
    // ===============================
    return res.status(200).json(aiResult);
  } catch (error) {
    console.error("Error analyzeCV:", error.message);

    return res.status(500).json({
      error: "No se pudo analizar el CV. Intenta nuevamente.",
    });
  }
};
