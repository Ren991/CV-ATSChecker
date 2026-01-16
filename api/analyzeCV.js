const {GoogleGenerativeAI} = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const {cvText} = req.body;

    if (!cvText) {
      res.status(400).json({error: "cvText es requerido"});
      return;
    }

    const model = genAI.getGenerativeModel({model: "gemini-2.5-computer-use-preview-10-2025"});

    const prompt = `Eres un reclutador experto IT. Analiza este CV y
devuelve un JSON válido con esta estructura exacta:
{"score": 0-100, "category": "ELITE/SÓLIDO/MEJORABLE/CRÍTICO",
"categoryDesc": "descripción breve", "feedback": ["sugerencia1", "sugerencia2", "sugerencia3"]}

CV: ${cvText}`;

    const result = await model.generateContent({
      contents: [{parts: [{text: prompt}]}],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    const aiResult = JSON.parse(responseText);

    res.status(200).json(aiResult);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: error.message || "Error al analizar el CV",
    });
  }
}
