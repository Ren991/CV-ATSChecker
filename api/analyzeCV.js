const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

    if (!cvText) {
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
  "score": number (0 a 100),
  "category": "ELITE" | "SÓLIDO" | "MEJORABLE" | "CRÍTICO",
  "summary": string,
  "strengths": [
    string,
    string
  ],
  "improvements": [
    string,
    string,
    string
  ],
  "atsObservations": [
    string,
    string
  ]
}

REGLAS PARA EL SCORE Y CATEGORÍA (NO VIOLAR):
- 90 a 100 → "ELITE"
- 75 a 89 → "SÓLIDO"
- 55 a 74 → "MEJORABLE"
- 0 a 54 → "CRÍTICO"

REGLAS DE CONTENIDO:
- "summary": resumen profesional del CV en 1 o 2 frases, basado SOLO en la información presente.
- "strengths": aspectos fuertes explícitos del CV (tecnologías, experiencia, claridad, logros).
- "improvements": mejoras concretas y accionables detectadas a partir de carencias, ambigüedades o falta de información en el CV.
- "atsObservations": observaciones técnicas sobre keywords, estructura, formato y legibilidad para ATS.

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

    const responseText = result.response.text().trim();

    // 🔒 Parseo seguro
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("La IA no devolvió un JSON válido");
    }

    const aiResult = JSON.parse(jsonMatch[0]);

    res.status(200).json(aiResult);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: error.message || "Error al analizar el CV",
    });
  }
};
