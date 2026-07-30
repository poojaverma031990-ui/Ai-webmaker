var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var ai = new import_genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== "string") return res.status(400).send("URL required");
    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8"
        },
        redirect: "follow"
      });
      const headers = new Headers(response.headers);
      headers.delete("x-frame-options");
      headers.delete("content-security-policy");
      headers.delete("content-security-policy-report-only");
      headers.delete("x-xss-protection");
      const resHeaders = {};
      headers.forEach((value, key) => {
        if (key !== "content-encoding" && key !== "content-length" && key !== "transfer-encoding") {
          resHeaders[key] = value;
        }
      });
      const contentType = headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        let html = await response.text();
        const basePath = new URL(response.url).href;
        const interceptScript = `<script>
    window.open = function(url) {
      if (url) {
        const fullUrl = new URL(url, window.location.href).href;
        window.parent.postMessage({ type: "EXTERNAL_LINK", url: fullUrl }, "*");
      }
      return null;
    };
    document.addEventListener("click", function(e) {
      const a = e.target.closest("a");
      if (a && a.href) {
        e.preventDefault();
        e.stopPropagation();
        const fullUrl = new URL(a.href, window.location.href).href;
        window.parent.postMessage({ type: "EXTERNAL_LINK", url: fullUrl }, "*");
      }
    }, true);
    document.addEventListener("submit", function(e) {
      if (e.target && e.target.action) {
        e.preventDefault();
        e.stopPropagation();
        let url = new URL(e.target.action);
        const formData = new FormData(e.target);
        if (e.target.method.toLowerCase() === 'get') {
          const params = new URLSearchParams(formData);
          url.search = params.toString();
        }
        window.parent.postMessage({ type: "EXTERNAL_LINK", url: url.href }, "*");
      }
    }, true);
  </script>`;
        const baseTag = `<base href="${basePath}">${interceptScript}`;
        if (html.match(/<head[^>]*>/i)) {
          html = html.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
        } else {
          html = `<head>${baseTag}</head>` + html;
        }
        res.set(resHeaders);
        res.send(html);
      } else {
        res.set(resHeaders);
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      }
    } catch (e) {
      console.error("Proxy Error:", e);
      res.status(500).send("Proxy Error");
    }
  });
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, history = [] } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }
      const formattedHistory = history.map((msg) => ({
        role: msg.role === "ai" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));
      formattedHistory.push({
        role: "user",
        parts: [{ text: prompt }]
      });
      const responseSchema = {
        type: import_genai.Type.OBJECT,
        properties: {
          reply: {
            type: import_genai.Type.STRING,
            description: "Your conversational reply to the user. Explain what you built, or simply chat back if no website was requested."
          },
          files: {
            type: import_genai.Type.ARRAY,
            description: "A list of source code files for the website. Only generate if the user asked to build a website or application. Leave empty for general chat.",
            items: {
              type: import_genai.Type.OBJECT,
              properties: {
                name: { type: import_genai.Type.STRING, description: "The file name, e.g., index.html, styles.css, script.js" },
                language: { type: import_genai.Type.STRING, description: "The language, e.g., html, css, javascript" },
                content: { type: import_genai.Type.STRING, description: "The complete file contents." }
              },
              required: ["name", "language", "content"]
            }
          }
        },
        required: ["reply", "files"]
      };
      const generateWithRetry = async (retries = 5, delay = 2e3) => {
        try {
          return await ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: formattedHistory,
            config: {
              systemInstruction: `You are Harsh Website Builder, an expert full-stack web developer AI. Use emojis in your replies to be friendly.
          
CRITICAL INSTRUCTIONS:
- You have memory of the conversation. Use it to perform tweaks on the user's previously generated website.
- If the user is just chatting or asking a normal question, reply conversationally in the 'reply' field using emojis and leave the 'files' array empty.
- If the user asks to build a website or tweak an existing one, generate a fully functional, complete, and styled application EXACTLY as requested.
- THE USER WANTS EXTREMELY DETAILED, PRODUCTION-GRADE CODE. DO NOT output simple pages. You MUST generate massive, highly sophisticated web applications with beautiful modern UI, complex layouts, animations, and massive Javascript functionality.
- ABSOLUTELY NO PLACEHOLDERS. DO NOT use comments like "// logic here" or "// add more items". You MUST write out the FULL complete code.
- EVERY SINGLE BUTTON AND INTERACTIVE ELEMENT MUST WORK. You must attach real Javascript event listeners to every button, form, and clickable element so that it performs a tangible, visible action on the screen (e.g. showing modals, updating UI state, animations, playing sounds, creating elements).
- Do NOT assume a backend exists. Use client-side JavaScript (localStorage, JS variables, DOM manipulation) to simulate all logic (like adding to cart, saving settings, sending messages, etc).
- Provide the complete source code using HTML, CSS, and vanilla JS. 
- Ensure the website is fully working and responsive. Don't use external frameworks like React, just standard web technologies. 
- Structure the app into multiple files like index.html, styles.css, script.js.`,
              responseMimeType: "application/json",
              responseSchema
            }
          });
        } catch (error) {
          const status = error?.status || error?.code || 500;
          if (retries > 0 && (status === 503 || status === 429 || status === 500 || status === 504 || error.message?.includes("429") || error.message?.includes("503"))) {
            console.log(`AI generation failed with ${status}, retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return generateWithRetry(retries - 1, delay * 1.5);
          }
          throw error;
        }
      };
      const aiResponse = await generateWithRetry();
      const responseText = aiResponse.text;
      if (!responseText) {
        throw new Error("Empty response from AI");
      }
      const result = JSON.parse(responseText);
      res.json(result);
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "Failed to generate website", details: error.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
