import { supabase, isConfigured } from "../lib/supabaseClient";

const DB_TO_FRONTEND_KEYS = {
  nombre_centro: "name",
  telefono_contacto: "phone",
  email_contacto: "email",
  direccion: "address",
  horario_atencion: "hours",
  mensaje_automatico: "autoMessage",
  whatsapp: "whatsapp",
  instagram: "instagram"
};

const FRONTEND_TO_DB_KEYS = {
  name: "nombre_centro",
  phone: "telefono_contacto",
  email: "email_contacto",
  address: "direccion",
  hours: "horario_atencion",
  autoMessage: "mensaje_automatico",
  whatsapp: "whatsapp",
  instagram: "instagram"
};

/**
 * Obtiene todos los ajustes de configuración de la base de datos y los mapea a un objeto simple.
 */
export async function getBusinessSettings() {
  if (!isConfigured) {
    return {
      success: false,
      error: "Supabase no está configurado. Se usarán valores por defecto.",
      data: {
        name: "Aura Skin Studio",
        phone: "+54 9 11 5555-5555",
        email: "contacto@auraskin.com",
        address: "Palermo, Ciudad Autónoma de Buenos Aires",
        hours: "Lunes a viernes de 10:00 a 19:00",
        autoMessage: "Hola, tu turno en Aura Skin Studio ha sido confirmado. Te esperamos.",
        whatsapp: "+5491155555555",
        instagram: "@auraskinstudio"
      }
    };
  }
  try {
    const { data, error } = await supabase
      .from("business_settings")
      .select("key, value");

    if (error) throw error;

    // Valores por defecto
    const settings = {
      name: "Aura Skin Studio",
      phone: "+54 9 11 5555-5555",
      email: "contacto@auraskin.com",
      address: "Palermo, Ciudad Autónoma de Buenos Aires",
      hours: "Lunes a viernes de 10:00 a 19:00",
      autoMessage: "Hola, tu turno en Aura Skin Studio ha sido confirmado. Te esperamos.",
      whatsapp: "+5491155555555",
      instagram: "@auraskinstudio"
    };

    // Sobrescribir con datos de Supabase si existen
    data.forEach(row => {
      const feKey = DB_TO_FRONTEND_KEYS[row.key];
      if (feKey) {
        settings[feKey] = row.value;
      }
    });

    return { success: true, data: settings };
  } catch (error) {
    console.error("Error en getBusinessSettings:", error);
    return { success: false, error: error.message || "Error al obtener la configuración." };
  }
}

/**
 * Actualiza la configuración en la base de datos realizando un upsert para cada clave.
 */
export async function updateBusinessSettings(settings) {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado." };
  }
  try {
    const upserts = Object.entries(settings).map(([feKey, value]) => {
      const dbKey = FRONTEND_TO_DB_KEYS[feKey];
      if (!dbKey) return null;
      return {
        key: dbKey,
        value: value !== null && value !== undefined ? String(value) : ""
      };
    }).filter(Boolean);

    if (upserts.length === 0) {
      return { success: true, data: settings };
    }

    const { error } = await supabase
      .from("business_settings")
      .upsert(upserts, { onConflict: "key" });

    if (error) throw error;
    return { success: true, data: settings };
  } catch (error) {
    console.error("Error en updateBusinessSettings:", error);
    return { success: false, error: error.message || "Error al guardar la configuración." };
  }
}
