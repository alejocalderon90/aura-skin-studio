import { supabase, isConfigured } from "../lib/supabaseClient";

/**
 * Mapea un cliente de la base de datos de Supabase al formato esperado por el frontend.
 */
function mapClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.full_name,
    email: row.email || "",
    phone: row.phone,
    lastTreatment: row.last_treatment || "-",
    visits: row.visit_count || 0,
    status: row.status || "Nuevo",
    observations: row.notes || ""
  };
}

/**
 * Obtiene todos los clientes registrados.
 */
export async function getClients() {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado. Revisá las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY." };
  }
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data.map(mapClient) };
  } catch (error) {
    console.error("Error en getClients:", error);
    return { success: false, error: error.message || "Error al obtener clientes." };
  }
}

/**
 * Realiza una búsqueda de clientes filtrando por nombre, teléfono o email.
 */
export async function searchClients(queryText) {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado." };
  }
  try {
    const cleanQuery = `%${queryText}%`;
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .or(`full_name.ilike.${cleanQuery},phone.ilike.${cleanQuery},email.ilike.${cleanQuery}`)
      .order("full_name", { ascending: true });

    if (error) throw error;
    return { success: true, data: data.map(mapClient) };
  } catch (error) {
    console.error(`Error en searchClients (${queryText}):`, error);
    return { success: false, error: error.message || "Error al buscar clientes." };
  }
}

/**
 * Registra un nuevo cliente en la base de datos.
 */
export async function createClient(payload) {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado." };
  }
  try {
    const { name, email, phone, observations } = payload;
    const { data, error } = await supabase
      .from("clients")
      .insert({
        full_name: name,
        email: email || null,
        phone: phone,
        notes: observations || null,
        status: "Nuevo",
        visit_count: 0,
        last_treatment: "-"
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: mapClient(data) };
  } catch (error) {
    console.error("Error en createClient:", error);
    return { success: false, error: error.message || "Error al registrar cliente." };
  }
}

/**
 * Actualiza los datos de un cliente existente.
 */
export async function updateClient(id, payload) {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado." };
  }
  try {
    const { name, email, phone, observations, status, lastTreatment, visits } = payload;
    
    // Mapear campos de frontend a base de datos
    const dbPayload = {};
    if (name !== undefined) dbPayload.full_name = name;
    if (email !== undefined) dbPayload.email = email;
    if (phone !== undefined) dbPayload.phone = phone;
    if (observations !== undefined) dbPayload.notes = observations;
    if (status !== undefined) dbPayload.status = status;
    if (lastTreatment !== undefined) dbPayload.last_treatment = lastTreatment;
    if (visits !== undefined) dbPayload.visit_count = visits;

    const { data, error } = await supabase
      .from("clients")
      .update(dbPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: mapClient(data) };
  } catch (error) {
    console.error(`Error en updateClient (${id}):`, error);
    return { success: false, error: error.message || "Error al actualizar cliente." };
  }
}
