const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ===============================
// UTILS
// ===============================
function normalizeCategory(score) {
  if (score >= 9) return "EXCELENTE";
  if (score >= 8) return "MUY BUENO";
  if (score >= 7) return "BUENO";
  if (score >= 5) return "MEJORABLE";
  return "CRÍTICO";
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
Actuás como un evaluador profesional senior de currículums IT.

Vas a recibir el TEXTO EXTRAÍDO DE UN CV.
El CV puede estar escrito en ESPAÑOL, INGLÉS o una combinación de ambos.

INSTRUCCIONES OBLIGATORIAS:
- Analizá exclusivamente la información presente en el CV.
- NO inventes datos.
- NO traduzcas el CV.
- Interpretá correctamente términos técnicos en inglés.
- La RESPUESTA DEBE SER SIEMPRE EN ESPAÑOL.
- Usá un lenguaje profesional, claro y directo.
- No incluyas frases genéricas ni motivacionales.
- No repitas frases textuales del CV.

DEVOLVÉ ÚNICAMENTE un JSON VÁLIDO con la siguiente estructura EXACTA:

{
  "score": number (1 a 10),
  "category": "CRÍTICO" | "MEJORABLE" | "BUENO" | "MUY BUENO" | "EXCELENTE",
  "summary": string,
  "strengths": string[],
  "improvements": string[],
  "atsObservations": string[]
}

CRITERIOS:
- El score debe ser coherente con el análisis real.
- CRÍTICO: 1–4
- MEJORABLE: 5–6
- BUENO: 7
- MUY BUENO: 8–9
- EXCELENTE: 10

NO agregues texto fuera del JSON. DEVOLVER SOLAMENTE EN ESPAÑOL.

CV A ANALIZAR:
"""
${cvText}
"""
`;

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
    });

    const rawText = result.response.text().trim();

    // ===============================
    // EXTRACCIÓN SEGURA DE JSON
    // ===============================
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("La IA no devolvió un JSON válido");
    }

    let aiResult = JSON.parse(match[0]);

    // ===============================
    // VALIDACIÓN + NORMALIZACIÓN
    // ===============================
    aiResult.score = Number(aiResult.score);

    if (Number.isNaN(aiResult.score)) {
      throw new Error("Score inválido");
    }

    aiResult.score = aiResult.score * 10;

    aiResult.category = normalizeCategory(aiResult.score / 10);

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

    // Fallbacks defensivos
    if (aiResult.strengths.length === 0) {
      aiResult.strengths.push(
        "El CV presenta una base técnica relevante para el sector IT."
      );
    }

    if (aiResult.improvements.length === 0) {
      aiResult.improvements.push(
        "Se recomienda detallar logros concretos y resultados medibles."
      );
    }

    if (aiResult.atsObservations.length === 0) {
      aiResult.atsObservations.push(
        "El CV es legible por ATS, pero podría optimizarse con más palabras clave específicas."
      );
    }

    res.status(200).json(aiResult);

  } catch (error) {
    console.error("AnalyzeCV Error:", error);
    res.status(500).json({
      error: error.message || "Error al analizar el CV",
    });
  }
};
