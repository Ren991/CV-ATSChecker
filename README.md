# 🚀 CV ATS-Checker AI
**Optimiza tu currículum**

![Status](https://img.shields.io/badge/Status-Live-success)
![AI](https://img.shields.io/badge/AI-Google%20Gemini%203-blue)
![Tech](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20JS-orange)

¿Tu CV está listo para superar los filtros automáticos (ATS)? Esta herramienta utiliza inteligencia artificial de última generación para analizar la estructura, el contenido y las palabras clave de tu currículum, entregándote un puntaje profesional y consejos específicos de mejora.



---

## ✨ Características Principales
* 🧠 **Análisis Semántico:** No solo busca palabras clave, entiende tus logros y experiencia.
* 📊 **Score de Compatibilidad:** Calificación del 0 al 100 basada en estándares de reclutamiento IT.
* 🤖 **Feedback Inteligente:** Consejos técnicos personalizados generados por IA.
* 🔒 **Seguridad Pro:** Implementación de inyección de API Keys mediante GitHub Actions para proteger credenciales.

---

## 🛠️ Stack Tecnológico
* **Frontend:** HTML5, CSS3 (Modern UI), Vanilla JavaScript.
* **PDF Processing:** [PDF.js](https://mozilla.github.io/pdf.js/) para extracción de texto en el cliente.
* **IA Engine:** [Google Gemini 3 Flash API](https://ai.google.dev/).
* **CI/CD:** GitHub Actions para el despliegue automático y protección de secretos.

---

## 🚀 Cómo funciona
1.  **Extracción:** El archivo PDF se procesa localmente en el navegador para extraer el texto plano.
2.  **Prompt Engineering:** Se envía un prompt optimizado a Gemini indicándole que actúe como un reclutador senior.
3.  **JSON Parsing:** La IA devuelve un análisis estructurado que se renderiza dinámicamente en una interfaz limpia y animada.

---

## 🛡️ Instalación y Seguridad
Si deseas clonar este proyecto, recuerda configurar tus secretos:
1. Crea un secreto en GitHub llamado `GEMINI_API_KEY`.
2. El flujo de **CI/CD** inyectará automáticamente la llave en el archivo `script.js` durante el despliegue, manteniéndola oculta en el código fuente público.

---

Desarrollado con ❤️ para procesos de selección de alto nivel.
