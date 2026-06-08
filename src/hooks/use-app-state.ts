import { useState, useCallback, useEffect } from 'react';
import { Treatment, Client, Appointment, Payment, Config } from '../lib/types';
import { initialTreatments, initialAppointments, initialClients, initialPayments, initialConfig } from '../lib/data';
import { isConfigured } from '../lib/supabaseClient';
import { getActiveServices, updateServicePrice } from '../services/servicesApi';
import { getAppointments, bookAppointment, updateAppointmentStatus } from '../services/appointmentsApi';
import { getClients, createClient } from '../services/clientsApi';
import { getPayments } from '../services/paymentsApi';
import { getBusinessSettings, updateBusinessSettings } from '../services/settingsApi';

export type ViewState = 'landing' | 'login' | 'dashboard';

export function useAppState() {
  const [view, setView] = useState<ViewState>('landing');
  const [activeSection, setActiveSection] = useState('Dashboard');

  const [treatments, setTreatments] = useState<Treatment[]>(initialTreatments);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [config, setConfig] = useState<Config>(initialConfig);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Carga inicial de datos desde Supabase (si está configurado)
  useEffect(() => {
    if (!isConfigured) {
      console.log("Supabase no configurado, utilizando datos mockup locales.");
      return;
    }

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [servicesRes, appointmentsRes, clientsRes, paymentsRes, settingsRes] = await Promise.all([
          getActiveServices(),
          getAppointments(),
          getClients(),
          getPayments(),
          getBusinessSettings()
        ]);

        if (servicesRes.success && servicesRes.data) {
          // Mapear campos para compatibilidad si es necesario
          const mappedServices = servicesRes.data.map((s: any) => ({
            id: s.id,
            name: s.name,
            duration: `${s.duration_minutes} min`,
            price: Number(s.price),
            category: s.category as 'Facial' | 'Corporal' | 'Dermatológico',
            status: (s.active ? 'Activo' : 'Inactivo') as 'Activo' | 'Inactivo',
            description: s.description || ""
          }) as Treatment);
          setTreatments(mappedServices);
        }

        if (appointmentsRes.success && appointmentsRes.data) {
          setAppointments(appointmentsRes.data as Appointment[]);
        }

        if (clientsRes.success && clientsRes.data) {
          setClients(clientsRes.data as Client[]);
        }

        if (paymentsRes.success && paymentsRes.data) {
          setPayments(paymentsRes.data as Payment[]);
        }

        if (settingsRes.success && settingsRes.data) {
          setConfig(settingsRes.data as Config);
        }
      } catch (err: any) {
        console.error("Error cargando datos de Supabase:", err);
        setError(err.message || "Error al conectar con Supabase.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [refreshTrigger]);

  const addAppointmentFallback = useCallback((app: Omit<Appointment, 'id' | 'status'>) => {
    const newApp: Appointment = {
      ...app,
      id: Math.random().toString(36).substr(2, 9),
      status: 'Pendiente',
    };
    setAppointments(prev => [newApp, ...prev]);
  }, []);

  const handleBookAppointment = useCallback(async (payload: {
    appointment_id: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    notes?: string;
  }) => {
    if (!isConfigured) {
      // Simular reserva localmente
      setAppointments(prev => prev.map(a => a.id === payload.appointment_id ? {
        ...a,
        clientName: payload.customer_name,
        status: 'Pendiente',
        comments: payload.notes
      } : a));
      return { success: true };
    }
    const res = await bookAppointment(payload);
    if (res.success) {
      refreshData();
    }
    return res;
  }, [refreshData]);

  const handleUpdateAppointmentStatus = useCallback(async (id: string, status: Appointment['status']) => {
    if (!isConfigured) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      return { success: true };
    }
    const res = await updateAppointmentStatus(id, status);
    if (res.success) {
      refreshData();
    }
    return res;
  }, [refreshData]);

  const handleAddClient = useCallback(async (client: Omit<Client, 'id' | 'visits' | 'lastTreatment' | 'status'>) => {
    if (!isConfigured) {
      const newClient: Client = {
        ...client,
        id: Math.random().toString(36).substr(2, 9),
        visits: 0,
        lastTreatment: '-',
        status: 'Nuevo'
      };
      setClients(prev => [newClient, ...prev]);
      return { success: true, data: newClient };
    }
    const res = await createClient(client);
    if (res.success) {
      refreshData();
    }
    return res;
  }, [refreshData]);

  const handleUpdateTreatmentPrice = useCallback(async (id: string, price: number) => {
    if (!isConfigured) {
      setTreatments(prev => prev.map(t => t.id === id ? { ...t, price } : t));
      return { success: true };
    }
    const res = await updateServicePrice(id, price);
    if (res.success) {
      refreshData();
    }
    return res;
  }, [refreshData]);

  const handleSetConfig = useCallback(async (newConfig: Config) => {
    if (!isConfigured) {
      setConfig(newConfig);
      return { success: true };
    }
    const res = await updateBusinessSettings(newConfig);
    if (res.success) {
      refreshData();
    }
    return res;
  }, [refreshData]);

  return {
    view, setView,
    activeSection, setActiveSection,
    treatments, setTreatments, updateTreatmentPrice: handleUpdateTreatmentPrice,
    appointments, addAppointment: addAppointmentFallback, bookAppointment: handleBookAppointment, updateAppointmentStatus: handleUpdateAppointmentStatus,
    clients, addClient: handleAddClient,
    payments,
    config, setConfig: handleSetConfig,
    loading, error, isConfigured, refreshData
  };
}
