import { supabase, isConfigured } from "../lib/supabaseClient";

/**
 * Obtiene todos los servicios estéticos activos ordenados por sort_order.
 */
export async function getActiveServices() {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado. Revisá las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY." };
  }
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error en getActiveServices:", error);
    return { success: false, error: error.message || "Error al obtener servicios activos." };
  }
}

/**
 * Obtiene los servicios destacados (featured = true) y activos.
 */
export async function getFeaturedServices() {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado. Revisá las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY." };
  }
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .eq("featured", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error en getFeaturedServices:", error);
    return { success: false, error: error.message || "Error al obtener servicios destacados." };
  }
}

/**
 * Obtiene un servicio específico por su UUID.
 */
export async function getServiceById(id) {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado. Revisá las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY." };
  }
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error(`Error en getServiceById (${id}):`, error);
    return { success: false, error: error.message || "Error al obtener el servicio." };
  }
}

/**
 * Actualiza el precio de un servicio específico.
 */
export async function updateServicePrice(id, price) {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado." };
  }
  try {
    const { data, error } = await supabase
      .from("services")
      .update({ price })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error(`Error en updateServicePrice (${id}):`, error);
    return { success: false, error: error.message || "Error al actualizar el precio." };
  }
}
