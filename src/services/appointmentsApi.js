import { supabase, isConfigured } from "../lib/supabaseClient";

/**
 * Mapea un turno de la base de datos (Supabase) al formato esperado por el frontend React.
 */
function mapAppointment(row) {
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.client_id || "",
    clientName: row.customer_name || (row.clients ? row.clients.full_name : "Cliente General"),
    treatmentId: row.service_id || "",
    treatmentName: row.services ? row.services.name : "Servicio General",
    date: row.appointment_date,
    time: row.appointment_time ? row.appointment_time.substring(0, 5) : "", // "17:30:00" -> "17:30"
    professional: row.professionals ? row.professionals.full_name : "Por asignar",
    status: row.status,
    comments: row.notes || "",
    duration_minutes: row.duration_minutes,
    price: row.price,
    customer_phone: row.customer_phone || (row.clients ? row.clients.phone : ""),
    customer_email: row.customer_email || (row.clients ? row.clients.email : "")
  };
}

/**
 * Obtiene todos los turnos con detalles de servicios, profesionales y clientes.
 */
export async function getAppointments() {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado. Revisá las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY." };
  }
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        services (name, category),
        professionals (full_name),
        clients (full_name, phone, email)
      `)
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false });

    if (error) throw error;
    return { success: true, data: data.map(mapAppointment) };
  } catch (error) {
    console.error("Error en getAppointments:", error);
    return { success: false, error: error.message || "Error al obtener turnos." };
  }
}

/**
 * Obtiene los turnos agendados para el día de hoy.
 */
export async function getTodayAppointments() {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado." };
  }
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        services (name, category),
        professionals (full_name),
        clients (full_name, phone)
      `)
      .eq("appointment_date", todayStr)
      .order("appointment_time", { ascending: true });

    if (error) throw error;
    return { success: true, data: data.map(mapAppointment) };
  } catch (error) {
    console.error("Error en getTodayAppointments:", error);
    return { success: false, error: error.message || "Error al obtener turnos de hoy." };
  }
}

/**
 * Obtiene los próximos turnos (fecha >= hoy) que no estén cancelados ni disponibles (es decir, reservados: Pendiente, Confirmado).
 */
export async function getUpcomingAppointments() {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado." };
  }
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        services (name, category),
        professionals (full_name),
        clients (full_name, phone)
      `)
      .gte("appointment_date", todayStr)
      .in("status", ["Pendiente", "Confirmado"])
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (error) throw error;
    return { success: true, data: data.map(mapAppointment) };
  } catch (error) {
    console.error("Error en getUpcomingAppointments:", error);
    return { success: false, error: error.message || "Error al obtener próximos turnos." };
  }
}

/**
 * Obtiene turnos libres ('Disponible') que coincidan con filtros opcionales (fecha, servicio, profesional).
 */
export async function getAvailableAppointments(filters = {}) {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado." };
  }
  try {
    let query = supabase
      .from("appointments")
      .select(`
        *,
        services (name, category),
        professionals (full_name),
        clients (full_name, phone)
      `)
      .eq("status", "Disponible")
      .gte("appointment_date", new Date().toISOString().split("T")[0]);

    if (filters.service_id) {
      query = query.eq("service_id", filters.service_id);
    }
    if (filters.professional_id) {
      query = query.eq("professional_id", filters.professional_id);
    }
    if (filters.appointment_date) {
      query = query.eq("appointment_date", filters.appointment_date);
    }
    if (filters.date) {
      query = query.eq("appointment_date", filters.date);
    }

    const { data, error } = await query
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (error) throw error;

    let result = data.map(mapAppointment);

    // Filtro adicional en memoria por nombre del tratamiento si se requiere
    if (filters.treatmentName) {
      result = result.filter(
        a => a.treatmentName.toLowerCase() === filters.treatmentName.toLowerCase()
      );
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Error en getAvailableAppointments:", error);
    return { success: false, error: error.message || "Error al obtener disponibilidad." };
  }
}

/**
 * Obtiene el detalle de un turno por su UUID.
 */
export async function getAppointmentById(id) {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado." };
  }
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        services (name, category),
        professionals (full_name),
        clients (full_name, phone, email)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return { success: true, data: mapAppointment(data) };
  } catch (error) {
    console.error(`Error en getAppointmentById (${id}):`, error);
    return { success: false, error: error.message || "Error al obtener detalle del turno." };
  }
}

/**
 * Registra una reserva sobre un turno disponible.
 * Busca o crea al cliente según su teléfono y actualiza el turno a 'Pendiente'.
 */
export async function bookAppointment(payload) {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado." };
  }
  const { appointment_id, customer_name, customer_phone, customer_email, notes } = payload;

  try {
    // 1. Validar que el turno exista y esté Disponible
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("*, services (name)")
      .eq("id", appointment_id)
      .single();

    if (fetchError || !appointment) {
      return { success: false, error: "El turno seleccionado no existe." };
    }

    if (appointment.status !== "Disponible") {
      return { success: false, error: "Ese turno ya no está disponible. Elegí otra opción." };
    }

    // 2. Buscar o crear el cliente por número de teléfono
    let client_id = null;
    const cleanPhone = customer_phone.trim();

    const { data: existingClients, error: clientSearchError } = await supabase
      .from("clients")
      .select("*")
      .eq("phone", cleanPhone)
      .limit(1);

    if (clientSearchError) throw clientSearchError;

    const treatmentName = appointment.services ? appointment.services.name : "Tratamiento";

    if (existingClients && existingClients.length > 0) {
      const client = existingClients[0];
      client_id = client.id;

      // Actualizar contador de visitas e historial del cliente existente
      const nextVisits = (client.visit_count || 0) + 1;

      // Combinar notas: conservar las anteriores y agregar el nuevo comentario si existe
      let updatedNotes = client.notes || null;
      if (notes && notes.trim()) {
        if (updatedNotes) {
          updatedNotes = `${updatedNotes}\n\n## Nueva consulta desde formulario\n${notes.trim()}`;
        } else {
          updatedNotes = notes.trim();
        }
      }

      await supabase
        .from("clients")
        .update({
          visit_count: nextVisits,
          status: "Activo",
          last_treatment: treatmentName,
          ...(updatedNotes !== null ? { notes: updatedNotes } : {})
        })
        .eq("id", client_id);
    } else {
      // Crear un nuevo cliente en la base de datos
      const { data: newClient, error: createClientError } = await supabase
        .from("clients")
        .insert({
          full_name: customer_name,
          phone: cleanPhone,
          email: customer_email || null,
          status: "Nuevo",
          visit_count: 1,
          last_treatment: treatmentName,
          notes: notes && notes.trim() ? notes.trim() : null
        })
        .select()
        .single();

      if (createClientError) throw createClientError;
      client_id = newClient.id;
    }

    // 3. Actualizar el registro del turno asignándole el cliente y cambiando el estado a 'Pendiente'
    const { data: updatedAppointment, error: updateError } = await supabase
      .from("appointments")
      .update({
        client_id,
        customer_name,
        customer_phone: cleanPhone,
        customer_email: customer_email || null,
        status: "Pendiente",
        notes: notes || null
      })
      .eq("id", appointment_id)
      .select(`
        *,
        services (name, category),
        professionals (full_name),
        clients (full_name, phone, email)
      `)
      .single();

    if (updateError) throw updateError;

    // 4. Crear un registro de pago pendiente asociado
    await supabase
      .from("payments")
      .insert({
        appointment_id: appointment_id,
        client_id: client_id,
        concept: treatmentName,
        amount: appointment.price,
        status: "Pendiente"
      });

    return { success: true, data: mapAppointment(updatedAppointment) };
  } catch (error) {
    console.error("Error en bookAppointment:", error);
    return { success: false, error: error.message || "Error al registrar la reserva del turno." };
  }
}

/**
 * Actualiza el estado de un turno (ej: Confirmado, Cancelado, Finalizado).
 */
export async function updateAppointmentStatus(id, status, notes = null) {
  if (!isConfigured) {
    return { success: false, error: "Supabase no está configurado." };
  }
  try {
    const updateData = { status };
    if (notes !== null) {
      updateData.notes = notes;
    }

    const { data, error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        services (name, category),
        professionals (full_name),
        clients (full_name, phone, email)
      `)
      .single();

    if (error) throw error;

    // Si el turno se cancela, actualizamos también el pago correspondiente a 'Cancelado' o similar,
    // o si se finaliza podemos registrar que está listo. Para esta versión, dejamos la sincronización básica.
    if (status === "Cancelado") {
      await supabase
        .from("payments")
        .update({ status: "Pendiente" }) // Opcional: mantener pendiente o actualizar estado
        .eq("appointment_id", id);
    }

    return { success: true, data: mapAppointment(data) };
  } catch (error) {
    console.error(`Error en updateAppointmentStatus (${id}, ${status}):`, error);
    return { success: false, error: error.message || "Error al actualizar el estado del turno." };
  }
}
