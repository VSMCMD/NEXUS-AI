
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "A chave GEMINI_API_KEY não foi configurada."
    });
  }

  try {
    const messages = req.body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Nenhuma mensagem recebida."
      });
    }

    const contents = messages
      .filter(m =>
        ["user", "assistant", "model"].includes(m.role) &&
        typeof (m.content || m.text) === "string"
      )
      .slice(-20)
      .map(m => ({
        role: m.role === "assistant" || m.role === "model"
          ? "model"
          : "user",
        parts: [{
          text: (m.content || m.text).slice(0, 12000)
        }]
      }));

    if (!contents.length || contents.at(-1).role !== "user") {
      return res.status(400).json({
        error: "A última mensagem precisa ser do usuário."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "Você é a NEXUS AI, uma assistente inteligente, amigável e prestativa. Responda em português quando o usuário falar português."
            }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: data.error?.message || "Falha na API Gemini."
      });
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("");

    if (!reply) {
      return res.status(502).json({
        error: "O Gemini não retornou uma resposta."
      });
    }

    return res.status(200).json({
      reply,
      text: reply,
      message: reply,
      content: reply
    });

  } catch (error) {
    return res.status(500).json({
      error: "Erro interno ao conversar com a NEXUS AI."
    });
  }
};

