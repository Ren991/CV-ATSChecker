const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ===============================
// UTILS
// ===============================
function normalizeCategory(score) {
  if (score >= 90) return "ELITE";
  if (score >= 75) return "SÓLIDO";
  if (score >= 55) return "MEJORABLE";
  return "CRÍTICO";
}

function containsEnglish(text) {
  const englishWords = [
    "experience",
    "with",
    "provide",
    "include",
    "project",
    "development",
    "performance",
    "skills",
    "tools"
  ];
  return englishWords.some(word =>
    text.toLowerCase().includes(word)
  );
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

    if (!cvText || cvText.length < 200) {
      return res.status(400).json({
        error: "El texto del CV es insuficiente para analizar"
      });
    }

    const model = genAI.getGenerativeModel({
      model: "gemma-3-1b-it",
    });

    const prompt = `
Actúa como un analista senior de CVs IT especializado en ATS y empleabilidad real.

INSTRUCCIONES OBLIGATORIAS:
- Responde EXCLUSIVAMENTE en ESPAÑOL.
- Devuelve ÚNICAMENTE un JSON válido.
- No agregues texto fuera del JSON.
- Analiza SOLO la información presente en el CV.
- No inventes experiencia ni tecnologías.
- No uses inglés bajo ningún concepto.

FORMATO EXACTO DE RESPUESTA:

{
  "score": 0-100,
  "category": "ELITE | SÓLIDO | MEJORABLE | CRÍTICO",
  "summary": "resumen profesional breve",
  "strengths": ["fortaleza 1", "fortaleza 2"],
  "improvements": ["mejora 1", "mejora 2", "mejora 3"],
  "atsObservations": ["observación 1", "observación 2"]
}

REGLAS DE SCORE:
- 90–100 → ELITE
- 75–89 → SÓLIDO
- 55–74 → MEJORABLE
- 0–54 → CRÍTICO

CV A ANALIZAR:
"""
${cvText}
"""
`;

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
    });

    const rawText = result.response.text().trim();

    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("La IA no devolvió JSON válido");

    let aiResult = JSON.parse(match[0]);

    // ===============================
    // NORMALIZACIÓN FUERTE
    // ===============================
    aiResult.score = Number(aiResult.score);

    if (aiResult.score < 40 && cvText.length > 500) {
      aiResult.score = 55;
    }

    aiResult.category = normalizeCategory(aiResult.score);

    aiResult.summary =
      typeof aiResult.summary === "string"
        ? aiResult.summary
        : "Perfil técnico con experiencia en desarrollo de software.";

    aiResult.strengths = Array.isArray(aiResult.strengths)
      ? aiResult.strengths
      : [];

    aiResult.improvements = Array.isArray(aiResult.improvements)
      ? aiResult.improvements
      : [];

    aiResult.atsObservations = Array.isArray(aiResult.atsObservations)
      ? aiResult.atsObservations
      : [];

    if (aiResult.strengths.length === 0) {
      aiResult.strengths.push(
        "El CV presenta experiencia técnica relevante en el área IT."
      );
    }

    if (aiResult.improvements.length === 0) {
      aiResult.improvements.push(
        "Se recomienda detallar logros y resultados concretos obtenidos."
      );
    }

    if (aiResult.atsObservations.length === 0) {
      aiResult.atsObservations.push(
        "El CV es compatible con ATS, pero puede optimizarse con más palabras clave específicas."
      );
    }

    // 🔒 Bloqueo de inglés
    if (containsEnglish(JSON.stringify(aiResult))) {
      throw new Error("Respuesta inválida: contenido en inglés detectado");
    }

    res.status(200).json(aiResult);
  } catch (error) {
    console.error("AnalyzeCV Error:", error);
    res.status(500).json({
      error: error.message || "Error al analizar el CV",
    });
  }
};
