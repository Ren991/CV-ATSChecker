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
Eres un reclutador experto IT.

RESPONDE ÚNICAMENTE CON UN JSON VÁLIDO.
NO agregues texto extra.
NO markdown.
NO explicaciones.

Estructura EXACTA:
{
  "score": 0-100,
  "category": "ELITE|SÓLIDO|MEJORABLE|CRÍTICO",
  "categoryDesc": "descripción breve",
  "feedback": [
    "sugerencia 1",
    "sugerencia 2",
    "sugerencia 3"
  ]
}

CV:
${cvText}
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
