const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

export const isAgentConfigured = !!(
  n8nWebhookUrl &&
  n8nWebhookUrl !== "https://TU-N8N/webhook/agente-aura-skin" &&
  n8nWebhookUrl.trim() !== ""
);

/**
 * Envía un mensaje al webhook de n8n para interactuar con el agente de IA.
 * 
 * @param {Object} payload 
 * @param {string} payload.message - El mensaje de texto del usuario.
 * @param {string} payload.sessionId - Identificador de sesión para el historial de chat.
 * @returns {Promise<Object>} Respuesta estructurada del agente.
 */
export async function sendMessageToAgent(payload) {
  if (!isAgentConfigured) {
    return {
      success: false,
      error: "El webhook de n8n no está configurado. Revisá la variable VITE_N8N_WEBHOOK_URL."
    };
  }

  const { message, sessionId } = payload;

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: message,
        sessionId: sessionId || "default-session",
        source: "web_chat",
        client: "Aura Skin Studio"
      })
    });

    if (!response.ok) {
      throw new Error(`Error del servidor n8n: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Validar formato de respuesta
    return {
      success: true,
      data: {
        reply: data.reply || "No obtuve una respuesta clara del asistente.",
        intent: data.intent || "otro",
        success: data.success !== undefined ? data.success : true
      }
    };
  } catch (error) {
    console.error("Error en sendMessageToAgent:", error);
    return {
      success: false,
      error: error.message || "No se pudo conectar con el agente en este momento."
    };
  }
}
