const reservationWebhookUrl = import.meta.env.VITE_N8N_RESERVATION_WEBHOOK_URL;

export const isReservationNotificationConfigured = !!(
  reservationWebhookUrl &&
  reservationWebhookUrl.trim() !== "" &&
  reservationWebhookUrl !== "https://TU-N8N/webhook/reserva-aura-skin"
);

export async function notifyReservation(payload) {
  if (!isReservationNotificationConfigured) {
    console.warn("Webhook de notificación de reserva no configurado.");
    return {
      success: false,
      error: "Webhook de notificación de reserva no configurado."
    };
  }

  try {
    const response = await fetch(reservationWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Error notificando reserva: ${response.status} ${response.statusText}`);
    }

    const data = await response.json().catch(() => ({}));

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error("Error en notifyReservation:", error);
    return {
      success: false,
      error: error.message || "No se pudo notificar la reserva."
    };
  }
}