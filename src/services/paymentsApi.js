import { supabase, isConfigured } from "../lib/supabaseClient";

/**
 * Mapea un pago de la base de datos de Supabase al formato esperado por el frontend.
 */
function mapPayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    clientName: row.clients ? row.clients.full_name : "Cliente General",
    concept: row.concept,
    amount: Number(row.amount),
    method: row.payment_method || "-",
    status: row.status || "Pendiente",
    date: row.payment_date || (row.created_at ? row.created_at.split("T")[0] : "-")
  };
}

/**
 * Obtiene todos los registros de pagos.
 */
export async function getPayments() {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado. Revisá las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY." };
  }
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        clients (full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data.map(mapPayment) };
  } catch (error) {
    console.error("Error en getPayments:", error);
    return { success: false, error: error.message || "Error al obtener pagos." };
  }
}

/**
 * Obtiene un resumen de montos acumulados por estado de pago (Pagado, Pendiente, Señado).
 */
export async function getPaymentsSummary() {
  if (!isConfigured) {
    return { success: false, data: { pagado: 0, pendiente: 0, señado: 0 } };
  }
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("status, amount");

    if (error) throw error;

    const summary = {
      pagado: 0,
      pendiente: 0,
      señado: 0
    };

    data.forEach(p => {
      const status = p.status ? p.status.toLowerCase() : "";
      const amount = Number(p.amount) || 0;
      if (status === "pagado") {
        summary.pagado += amount;
      } else if (status === "pendiente") {
        summary.pendiente += amount;
      } else if (status === "señado") {
        summary.señado += amount;
      }
    });

    return { success: true, data: summary };
  } catch (error) {
    console.error("Error en getPaymentsSummary:", error);
    return { success: false, error: error.message || "Error al calcular el resumen de pagos." };
  }
}

/**
 * Obtiene los pagos filtrados por estado.
 */
export async function getPaymentsByStatus(status) {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado." };
  }
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        clients (full_name)
      `)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data.map(mapPayment) };
  } catch (error) {
    console.error(`Error en getPaymentsByStatus (${status}):`, error);
    return { success: false, error: error.message || "Error al filtrar pagos." };
  }
}
