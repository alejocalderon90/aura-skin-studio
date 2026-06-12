import { useState, useRef, useEffect, useCallback } from "react";
import { useAppState } from "@/hooks/use-app-state";
import { Appointment, Client, Treatment, Payment } from "@/lib/types";
import {
  Sparkles, Star, Clock, Phone, Mail, MapPin, Menu, X, ChevronRight,
  Bell, Calendar, Users, CreditCard, Settings, LayoutDashboard, Scissors,
  CheckCircle, XCircle, Eye, Plus, Search, Send, Mic, LogOut, Edit2, Save,
  TrendingUp, AlertCircle, Activity
} from "lucide-react";
import { isConfigured } from "@/lib/supabaseClient";
import { getAvailableAppointments } from "@/services/appointmentsApi";
import { sendMessageToAgent } from "@/services/agentApi";


// ─── UTILITIES ──────────────────────────────────────────────────────────────

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatPrice(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

async function notifyReservation(payload: {
  appointment_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  treatment: string;
  date: string;
  time: string;
  professional: string;
  price?: number | string;
  notes?: string;
  status: string;
  source: string;
}) {
  const webhookUrl = (import.meta as any).env?.VITE_N8N_RESERVATION_WEBHOOK_URL;

  if (!webhookUrl || String(webhookUrl).trim() === "") {
    console.warn("Webhook de notificación de reserva no configurado.");
    return { success: false };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Error notificando reserva: ${response.status} ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.warn("La reserva fue registrada, pero no se pudo enviar la notificación por mail:", error);
    return { success: false };
  }
}

// ─── BADGE ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Confirmado: "bg-emerald-100 text-emerald-700",
    Pendiente: "bg-amber-100 text-amber-700",
    Cancelado: "bg-red-100 text-red-700",
    Finalizado: "bg-gray-200 text-gray-600",
    Pagado: "bg-emerald-100 text-emerald-700",
    Señado: "bg-blue-100 text-blue-700",
    Activo: "bg-emerald-100 text-emerald-700",
    Nuevo: "bg-primary/15 text-primary",
    Inactivo: "bg-gray-200 text-gray-500",
  };
  return (
    <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full", map[status] ?? "bg-gray-100 text-gray-600")}>
      {status}
    </span>
  );
}

// ─── MODAL ───────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-serif font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors" aria-label="Cerrar modal">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── CHAT WIDGET ─────────────────────────────────────────────────────────────

type ChatMessage = { role: "user" | "assistant"; text: string };

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hola, soy el asistente de Aura Skin Studio. Puedo ayudarte a consultar turnos, tratamientos, precios o pagos." },
    { role: "user", text: "Quiero saber qué turnos hay disponibles." },
    { role: "assistant", text: "Perfecto. Puedo ayudarte a revisar disponibilidad y registrar una solicitud." },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function sendMessage() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", text }]);
    setTyping(true);

    let sessionId = sessionStorage.getItem("aura_chat_session");
    if (!sessionId) {
      sessionId = "session-" + Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem("aura_chat_session", sessionId);
    }

    try {
      const res: any = await sendMessageToAgent({
        message: text,
        sessionId: sessionId
      });
      if (res.success && res.data) {
        setMessages(m => [...m, { role: "assistant", text: res.data.reply }]);
      } else {
        setMessages(m => [...m, { role: "assistant", text: res.error || "No recibí respuesta del asistente." }]);
      }
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "No pude conectarme con el asistente en este momento. Probá nuevamente en unos minutos." }]);
    } finally {
      setTyping(false);
    }
  }

  function handleAudio() {
    setMessages(m => [...m, { role: "assistant", text: "La función de audio estará disponible en la próxima versión." }]);
  }

  return (
    <>
      <button
        aria-label="Abrir chat"
        data-testid="button-chat-toggle"
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center text-2xl hover:scale-105 transition-transform"
      >
        {open ? <X className="w-6 h-6" /> : <span>💬</span>}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 bg-primary text-white">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-serif font-bold text-sm">AI</div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Asistente Aura</p>
              <p className="text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" /> En línea</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar chat" className="p-1 rounded-lg hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-72 bg-background">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] text-sm rounded-2xl px-3.5 py-2.5 leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-white rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                )}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground text-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5 italic">
                  Escribiendo…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex items-center gap-2 bg-card">
            <input
              data-testid="input-chat"
              className="flex-1 text-sm bg-muted rounded-xl px-3.5 py-2 outline-none placeholder:text-muted-foreground"
              placeholder="Escribí tu consulta…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
            />
            <button onClick={handleAudio} aria-label="Enviar audio" data-testid="button-chat-audio"
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
              <Mic className="w-4 h-4" />
            </button>
            <button onClick={sendMessage} aria-label="Enviar mensaje" data-testid="button-chat-send"
              className="p-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── LANDING: HEADER ─────────────────────────────────────────────────────────

function Header({ onNavClick }: { onNavClick: (s: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = ["Inicio", "Tratamientos", "Beneficios", "Reservar turno", "Panel"];

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <button onClick={() => onNavClick("Inicio")} className="font-serif text-xl font-semibold text-foreground tracking-wide">
          Aura Skin Studio
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map(item => (
            <button key={item} onClick={() => onNavClick(item)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              {item}
            </button>
          ))}
        </nav>

        <div className="hidden md:block">
          <button onClick={() => onNavClick("Reservar turno")} data-testid="button-agendar"
            className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
            Agendar consulta
          </button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2" onClick={() => setMenuOpen(o => !o)} aria-label="Menú">
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-1">
          {navItems.map(item => (
            <button key={item} onClick={() => { onNavClick(item); setMenuOpen(false); }}
              className="text-left text-sm py-2.5 text-foreground border-b border-border/50 last:border-0 font-medium">
              {item}
            </button>
          ))}
          <button onClick={() => { onNavClick("Reservar turno"); setMenuOpen(false); }}
            className="mt-2 bg-primary text-white text-sm font-medium px-4 py-2.5 rounded-xl text-center">
            Agendar consulta
          </button>
        </div>
      )}
    </header>
  );
}

// ─── LANDING: HERO ───────────────────────────────────────────────────────────

function Hero({ onReservar, onTratamientos }: { onReservar: () => void; onTratamientos: () => void }) {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
      <div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full mb-5">
          <Star className="w-3 h-3" /> Centro de dermocosmética premium
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-foreground leading-tight mb-5">
          Cuidado facial profesional con seguimiento personalizado
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed mb-8">
          Tratamientos estéticos, faciales y corporales diseñados para mejorar la salud y apariencia de tu piel con atención cercana, tecnología y criterio profesional.
        </p>
        <div className="flex flex-wrap gap-3 mb-10">
          <button onClick={onReservar} data-testid="button-reservar-hero"
            className="bg-primary text-white font-medium px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
            Reservar turno
          </button>
          <button onClick={onTratamientos} data-testid="button-tratamientos-hero"
            className="border border-border bg-card text-foreground font-medium px-5 py-2.5 rounded-xl hover:bg-muted transition-colors">
            Ver tratamientos
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
          {["+1.200 turnos gestionados", "98% de satisfacción", "Atención personalizada"].map(b => (
            <span key={b} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <CheckCircle className="w-3.5 h-3.5 text-primary" /> {b}
            </span>
          ))}
        </div>
      </div>

      {/* Side card */}
      <div className="flex justify-center">
        <div className="bg-card border border-border rounded-2xl shadow-md p-6 w-full max-w-sm space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Próximo turno</span>
          </div>
          <div>
            <p className="font-serif text-xl font-semibold text-foreground">Limpieza facial profunda</p>
            <p className="text-sm text-muted-foreground mt-1">Cliente: <span className="text-foreground font-medium">Martina López</span></p>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" /> Hoy 17:30
            </span>
            <StatusBadge status="Confirmado" />
          </div>
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="w-4 h-4 text-primary" />
              <span>Dra. Silva — Consultorio 1</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── LANDING: TRATAMIENTOS ────────────────────────────────────────────────────

const TREATMENT_ICONS: Record<string, React.ReactNode> = {
  "Limpieza facial profunda": <Sparkles className="w-6 h-6" />,
  "Peeling químico": <Star className="w-6 h-6" />,
  "Dermaplaning": <Scissors className="w-6 h-6" />,
  "Radiofrecuencia facial": <Activity className="w-6 h-6" />,
  "Mesoterapia": <TrendingUp className="w-6 h-6" />,
  "Tratamiento antiacné": <CheckCircle className="w-6 h-6" />,
};

function TratamientosSection({ treatments, onSolicitar }: { treatments: Treatment[]; onSolicitar: () => void }) {
  return (
    <section id="tratamientos" className="bg-muted/40 py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-foreground mb-3">Tratamientos disponibles</h2>
          <p className="text-muted-foreground text-base">Protocolos diseñados para cada tipo de piel y objetivo.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {treatments.map(t => (
            <div key={t.id} data-testid={`card-treatment-${t.id}`}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                {TREATMENT_ICONS[t.name] ?? <Sparkles className="w-6 h-6" />}
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground mb-1">{t.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3" /> {t.duration}
                </span>
                <span className="text-sm font-semibold text-primary">{formatPrice(t.price)}</span>
              </div>
              <button onClick={onSolicitar} data-testid={`button-solicitar-${t.id}`}
                className="w-full text-sm font-medium border border-primary/30 text-primary py-2 rounded-xl hover:bg-primary hover:text-white transition-colors">
                Solicitar turno
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── LANDING: BENEFICIOS ──────────────────────────────────────────────────────

function BeneficiosSection() {
  const items = [
    { icon: <Bell className="w-6 h-6" />, title: "Recordatorios automáticos", desc: "Enviamos notificaciones antes de cada turno para que ninguna clienta lo pierda." },
    { icon: <Calendar className="w-6 h-6" />, title: "Historial de tratamientos", desc: "Cada cliente tiene su ficha completa con todos los procedimientos realizados." },
    { icon: <CreditCard className="w-6 h-6" />, title: "Seguimiento de pagos y señas", desc: "Control total de cobros, pagos pendientes y señas registradas." },
    { icon: <Sparkles className="w-6 h-6" />, title: "Asistente virtual integrado", desc: "Comunicación directa 24/7 para consultas y reservas online." },
  ];

  return (
    <section id="beneficios" className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-foreground mb-3">Una experiencia pensada para tus pacientes</h2>
          <p className="text-muted-foreground">Todo lo que necesitás para gestionar tu centro con profesionalismo.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map(item => (
            <div key={item.title} className="bg-card border border-border rounded-2xl p-6 shadow-sm text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                {item.icon}
              </div>
              <h3 className="font-serif font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── LANDING: RESERVA ─────────────────────────────────────────────────────────

function ReservaSection({ onBookAppointment, treatments }: { 
  onBookAppointment: (payload: { appointment_id: string; customer_name: string; customer_phone: string; customer_email?: string; notes?: string }) => Promise<{ success: boolean; error?: string }>;
  treatments: Treatment[];
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", treatment: "", date: "", comments: "" });
  const [allTreatmentSlots, setAllTreatmentSlots] = useState<Appointment[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Appointment[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);

  // Fechas únicas disponibles para el tratamiento seleccionado
  const availableDates = Array.from(new Set(allTreatmentSlots.map(s => s.date))).sort();

  // Al cambiar el tratamiento, consultar todos los turnos disponibles para ese tratamiento
  useEffect(() => {
    setAllTreatmentSlots([]);
    setAvailableSlots([]);
    setSelectedSlotId("");
    setForm(f => ({ ...f, date: "" }));

    if (!form.treatment) return;

    if (!isConfigured) {
      // Fallback de demo si Supabase no está configurado
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const simulatedSlots: Appointment[] = [
        { id: "slot-1", clientId: "", clientName: "", treatmentId: "1", treatmentName: form.treatment, date: today, time: "10:00", professional: "Camila Fernández", status: "Disponible" as any },
        { id: "slot-2", clientId: "", clientName: "", treatmentId: "2", treatmentName: form.treatment, date: today, time: "14:30", professional: "Valentina Gómez", status: "Disponible" as any },
        { id: "slot-3", clientId: "", clientName: "", treatmentId: "3", treatmentName: form.treatment, date: tomorrow, time: "17:00", professional: "Florencia Medina", status: "Disponible" as any },
      ];
      setAllTreatmentSlots(simulatedSlots);
      const firstDate = simulatedSlots[0].date;
      setForm(f => ({ ...f, date: firstDate }));
      setAvailableSlots(simulatedSlots.filter(s => s.date === firstDate));
      return;
    }

    let active = true;
    async function fetchAllSlots() {
      setLoadingSlots(true);
      try {
        const res = await getAvailableAppointments({ treatmentName: form.treatment });
        if (active) {
          if (res.success && res.data && res.data.length > 0) {
            const slots = res.data as Appointment[];
            setAllTreatmentSlots(slots);
            const firstDate = slots[0].date;
            setForm(f => ({ ...f, date: firstDate }));
            setAvailableSlots(slots.filter(s => s.date === firstDate));
          } else {
            setAllTreatmentSlots([]);
            setAvailableSlots([]);
          }
          setSelectedSlotId("");
        }
      } catch (err) {
        console.error("Error al buscar turnos:", err);
        if (active) { setAllTreatmentSlots([]); setAvailableSlots([]); }
      } finally {
        if (active) setLoadingSlots(false);
      }
    }
    fetchAllSlots();
    return () => { active = false; };
  }, [form.treatment]);

  // Al cambiar la fecha, filtrar los slots disponibles para esa fecha
  function handleDateChange(date: string) {
    setForm(f => ({ ...f, date }));
    setSelectedSlotId("");
    setAvailableSlots(allTreatmentSlots.filter(s => s.date === date));
  }

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  if (!selectedSlotId) {
    setBookingError("Por favor, seleccioná un turno de los horarios disponibles.");
    return;
  }

  setBookingLoading(true);
  setBookingError("");

  try {
    const selectedSlot = availableSlots.find(s => s.id === selectedSlotId);

    const res = await onBookAppointment({
      appointment_id: selectedSlotId,
      customer_name: form.name,
      customer_phone: form.phone,
      customer_email: form.email,
      notes: form.comments
    });

    if (res.success) {
      await notifyReservation({
        appointment_id: selectedSlotId,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: form.email || "",
        treatment: form.treatment,
        date: form.date,
        time: selectedSlot ? selectedSlot.time : "",
        professional: selectedSlot ? selectedSlot.professional : "",
        price: selectedSlot ? (selectedSlot as any).price || "" : "",
        notes: form.comments || "",
        status: "Pendiente",
        source: "formulario_web"
      });

      setSolicitudes(s => [
        {
          name: form.name,
          treatment: form.treatment,
          date: form.date,
          time: selectedSlot ? selectedSlot.time : ""
        },
        ...s
      ]);

      setForm({ name: "", email: "", phone: "", treatment: "", date: "", comments: "" });
      setSelectedSlotId("");
      setAvailableSlots([]);
      setAllTreatmentSlots([]);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    } else {
      setBookingError(res.error || "Ese turno ya no está disponible. Elegí otra opción.");
    }
  } catch (err: any) {
    setBookingError(err.message || "Error al registrar la reserva.");
  } finally {
    setBookingLoading(false);
  }
}

  // Formatear fecha para mostrar al usuario (YYYY-MM-DD → DD/MM/YYYY)
  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  const inputCls = "w-full bg-muted border border-input rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground";

  return (
    <section id="reservar" className="bg-muted/40 py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-foreground mb-3">Reservar turno</h2>
          <p className="text-muted-foreground">Elegí un tratamiento y te mostraremos la próxima disponibilidad real. La solicitud queda pendiente hasta que el equipo la confirme.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
          {submitted && (
            <div className="mb-6 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Tu solicitud de turno fue registrada. Nos comunicaremos para confirmarla.
            </div>
          )}

          {bookingError && (
            <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {bookingError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="res-name" className="block text-xs font-medium text-muted-foreground mb-1.5">Nombre completo *</label>
              <input id="res-name" data-testid="input-nombre" required className={inputCls}
                placeholder="Ej. Martina López" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="res-phone" className="block text-xs font-medium text-muted-foreground mb-1.5">Teléfono *</label>
              <input id="res-phone" data-testid="input-telefono" required className={inputCls}
                placeholder="+54 9 11 XXXX-XXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="res-email" className="block text-xs font-medium text-muted-foreground mb-1.5">Email (opcional)</label>
              <input id="res-email" type="email" data-testid="input-email" className={inputCls}
                placeholder="tu@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="res-treatment" className="block text-xs font-medium text-muted-foreground mb-1.5">Tratamiento deseado *</label>
              <select id="res-treatment" data-testid="select-tratamiento" required className={inputCls}
                value={form.treatment} onChange={e => setForm(f => ({ ...f, treatment: e.target.value, date: "", comments: f.comments }))}>
                <option value="">Seleccioná un tratamiento</option>
                {treatments.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="res-date" className="block text-xs font-medium text-muted-foreground mb-1.5">Fecha preferida *</label>
              {loadingSlots ? (
                <div className="text-sm text-muted-foreground py-2.5 flex items-center gap-2">
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
                  <span>Buscando disponibilidad...</span>
                </div>
              ) : !form.treatment ? (
                <select disabled className={inputCls + " opacity-50 cursor-not-allowed"}>
                  <option>Primero seleccioná un tratamiento</option>
                </select>
              ) : availableDates.length === 0 ? (
                <select disabled className={inputCls + " opacity-50 cursor-not-allowed"}>
                  <option>Sin fechas disponibles</option>
                </select>
              ) : (
                <>
                  <select id="res-date" data-testid="input-fecha" required className={inputCls}
                    value={form.date} onChange={e => handleDateChange(e.target.value)}>
                    {availableDates.map(d => (
                      <option key={d} value={d}>{formatDate(d)}</option>
                    ))}
                  </select>
                  {form.date && (
                    <p className="mt-1.5 text-xs text-primary font-medium">
                      Próxima disponibilidad para {form.treatment}: {formatDate(availableDates[0])}
                    </p>
                  )}
                </>
              )}
            </div>
            <div>
              <label htmlFor="res-slot" className="block text-xs font-medium text-muted-foreground mb-1.5">Turnos disponibles *</label>
              {loadingSlots ? (
                <div className="text-sm text-muted-foreground py-2.5 flex items-center gap-2">
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
                  <span>Buscando turnos disponibles...</span>
                </div>
              ) : !form.treatment ? (
                <div className="text-xs text-muted-foreground py-2.5 bg-muted rounded-xl px-4 border border-dashed border-border">
                  Seleccioná un tratamiento para ver horarios.
                </div>
              ) : form.treatment && allTreatmentSlots.length === 0 && !loadingSlots ? (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                  No hay turnos disponibles para este tratamiento por el momento. Podés escribirnos por el chat para consultar otras opciones.
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2.5 bg-muted rounded-xl px-4 border border-dashed border-border">
                  Seleccioná una fecha para ver horarios.
                </div>
              ) : (
                <select id="res-slot" required className={inputCls}
                  value={selectedSlotId} onChange={e => setSelectedSlotId(e.target.value)}>
                  <option value="">Seleccioná un horario disponible</option>
                  {availableSlots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.time} hs — {s.professional}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="res-comments" className="block text-xs font-medium text-muted-foreground mb-1.5">Comentarios</label>
              <textarea id="res-comments" data-testid="input-comentarios" rows={3} className={inputCls + " resize-none"}
                placeholder="Contanos si tenés alguna consulta especial o afección en la piel…" value={form.comments}
                onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" data-testid="button-submit-reserva" disabled={bookingLoading || !selectedSlotId}
                className="w-full bg-primary text-white font-medium py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {bookingLoading ? "Procesando solicitud..." : "Solicitar reserva"}
              </button>
            </div>
          </form>

          {solicitudes.length > 0 && (
            <div className="mt-8">
              <h4 className="text-sm font-semibold text-foreground mb-3">Solicitudes recientes</h4>
              <div className="space-y-2">
                {solicitudes.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-muted rounded-xl px-4 py-2.5">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-muted-foreground">{s.treatment} — {s.date} {s.time} hs</span>
                    <StatusBadge status="Pendiente" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── LANDING: FOOTER ──────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border bg-card py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <span className="font-serif text-base font-semibold text-foreground">Aura Skin Studio</span>
        <div className="flex gap-5">
          <button className="hover:text-foreground transition-colors">Política de privacidad</button>
          <button className="hover:text-foreground transition-colors">Términos y condiciones</button>
        </div>
        <span>© 2025 Aura Skin Studio. Todos los derechos reservados.</span>
      </div>
    </footer>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────

function LandingPage({ onPanel, onBookAppointment, treatments }: {
  onPanel: () => void;
  onBookAppointment: (payload: any) => Promise<any>;
  treatments: Treatment[];
}) {
  const reservarRef = useRef<HTMLElement | null>(null);
  const tratamientosRef = useRef<HTMLElement | null>(null);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  function handleNav(item: string) {
    if (item === "Panel") { onPanel(); return; }
    if (item === "Reservar turno") { scrollTo("reservar"); return; }
    if (item === "Tratamientos") { scrollTo("tratamientos"); return; }
    if (item === "Beneficios") { scrollTo("beneficios"); return; }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      <Header onNavClick={handleNav} />
      <main>
        <Hero onReservar={() => scrollTo("reservar")} onTratamientos={() => scrollTo("tratamientos")} />
        <TratamientosSection treatments={treatments} onSolicitar={() => scrollTo("reservar")} />
        <BeneficiosSection />
        <ReservaSection onBookAppointment={onBookAppointment} treatments={treatments} />
      </main>
      <Footer />
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Acceso concedido al panel de gestión.");
    setTimeout(onLogin, 900);
  }

  const inputCls = "w-full bg-muted border border-input rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="font-serif text-3xl font-semibold text-foreground">Aura Skin Studio</p>
          <p className="text-muted-foreground text-sm mt-1">Panel de gestión</p>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-md p-8">
          <h2 className="font-serif text-xl font-semibold text-foreground mb-6">Ingresar al panel</h2>
          {msg && (
            <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2.5 text-sm">
              <CheckCircle className="w-4 h-4" /> {msg}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
              <input id="login-email" type="email" data-testid="input-login-email" required className={inputCls}
                placeholder="admin@auraskin.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="login-pass" className="block text-xs font-medium text-muted-foreground mb-1.5">Contraseña</label>
              <input id="login-pass" type="password" data-testid="input-login-pass" required className={inputCls}
                placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} />
            </div>
            <button type="submit" data-testid="button-login"
              className="w-full bg-primary text-white font-medium py-3 rounded-xl hover:bg-primary/90 transition-colors mt-2">
              Ingresar al panel
            </button>
          </form>
          <p className="text-xs text-muted-foreground mt-5 text-center">
            Usuario de prueba: <span className="font-medium text-foreground">admin@auraskin.com</span> / <span className="font-medium text-foreground">demo123</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD: KPI CARD ─────────────────────────────────────────────────────

function KpiCard({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5 font-serif">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── DASHBOARD: CHARTS (pure Tailwind) ───────────────────────────────────────

function WeeklyChart() {
  const weeks = [
    { label: "L", value: 65 }, { label: "M", value: 80 },
    { label: "X", value: 45 }, { label: "J", value: 90 },
    { label: "V", value: 75 }, { label: "S", value: 55 },
  ];
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <h3 className="font-serif font-semibold text-foreground mb-6">Ingresos por día</h3>
      <div className="flex items-end justify-between gap-2 h-32">
        {weeks.map(w => (
          <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-lg bg-primary/80 transition-all hover:bg-primary" style={{ height: `${w.value}%` }} />
            <span className="text-xs text-muted-foreground">{w.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TreatmentDistChart({ appointments }: { appointments: Appointment[] }) {
  const counts: Record<string, number> = {};
  appointments.forEach(a => { counts[a.treatmentName] = (counts[a.treatmentName] || 0) + 1; });
  const total = Math.max(Object.values(counts).reduce((a, b) => a + b, 0), 1);
  const colors = ["bg-primary", "bg-accent", "bg-emerald-400", "bg-blue-400", "bg-amber-400", "bg-rose-400"];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <h3 className="font-serif font-semibold text-foreground mb-5">Distribución de tratamientos</h3>
      <div className="space-y-3">
        {Object.entries(counts).slice(0, 5).map(([name, count], i) => (
          <div key={name}>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span className="truncate max-w-[60%]">{name}</span>
              <span>{Math.round((count / total) * 100)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", colors[i % colors.length])}
                style={{ width: `${(count / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD: SECTIONS ─────────────────────────────────────────────────────

function DashboardHome({ appointments, payments, clients }: { appointments: Appointment[]; payments: Payment[]; clients: Client[] }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const todayApps = appointments.filter(a => a.date === todayStr && (a.status as string) !== "Disponible");

  const currentMonth = new Date().toISOString().substring(0, 7); // '2026-06'
  const monthlyRevenue = payments
    .filter(p => p.status === "Pagado" && p.date && p.date.startsWith(currentMonth))
    .reduce((s, p) => s + p.amount, 0);

  const pendingPayments = payments
    .filter(p => p.status === "Pendiente")
    .reduce((s, p) => s + p.amount, 0);

  const activeClients = clients.filter(c => c.status === "Activo").length;

  const finishedCount = appointments.filter(a => a.status === "Finalizado").length;
  const canceledCount = appointments.filter(a => a.status === "Cancelado").length;
  const totalPast = finishedCount + canceledCount;
  const attendanceRate = totalPast > 0 ? Math.round((finishedCount / totalPast) * 100) : 95; // default 95% if no past turns

  const monthName = new Date().toLocaleString("es-AR", { month: "long" });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl font-semibold text-foreground">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Turnos de hoy" value={String(todayApps.length)} icon={<Calendar className="w-5 h-5" />} sub={`${todayApps.filter(a => a.status === "Confirmado").length} confirmados`} />
        <KpiCard label="Ingresos del mes" value={formatPrice(monthlyRevenue)} icon={<TrendingUp className="w-5 h-5" />} sub={`${capitalizedMonth} ${currentYear}`} />
        <KpiCard label="Pagos pendientes" value={formatPrice(pendingPayments)} icon={<AlertCircle className="w-5 h-5" />} sub="Por cobrar" />
        <KpiCard label="Clientes activos" value={String(activeClients)} icon={<Users className="w-5 h-5" />} sub={`Total: ${clients.length}`} />
        <KpiCard label="Tasa de asistencia" value={`${attendanceRate}%`} icon={<Activity className="w-5 h-5" />} sub="Finalizados vs Cancelados" />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <WeeklyChart />
        <TreatmentDistChart appointments={appointments} />
      </div>
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="font-serif font-semibold text-foreground mb-4">Próximos turnos</h3>
        <div className="space-y-3">
          {appointments.slice(0, 5).map(a => (
            <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                  {a.clientName[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{a.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.treatmentName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{a.date} {a.time}</span>
                <StatusBadge status={a.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TurnosSection({ appointments, onUpdate }: { appointments: Appointment[]; onUpdate: (id: string, status: Appointment["status"]) => void }) {
  const [selected, setSelected] = useState<Appointment | null>(null);

  return (
    <div className="space-y-5">
      <h2 className="font-serif text-2xl font-semibold text-foreground">Turnos</h2>
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Cliente", "Tratamiento", "Fecha", "Hora", "Profesional", "Estado", "Acción"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {appointments.map(a => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{a.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-32 truncate">{a.treatmentName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.date}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.time}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.professional}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onUpdate(a.id, "Confirmado")} data-testid={`button-confirmar-${a.id}`}
                        className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">
                        Confirmar
                      </button>
                      <button onClick={() => onUpdate(a.id, "Cancelado")} data-testid={`button-cancelar-${a.id}`}
                        className="text-xs px-2.5 py-1 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                        Cancelar
                      </button>
                      <button onClick={() => setSelected(a)} data-testid={`button-detalle-${a.id}`}
                        className="text-xs px-2.5 py-1 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Ver
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle del turno">
        {selected && (
          <div className="space-y-3 text-sm">
            {[
              ["Cliente", selected.clientName],
              ["Tratamiento", selected.treatmentName],
              ["Fecha", selected.date],
              ["Hora", selected.time],
              ["Profesional", selected.professional],
              ["Estado", selected.status],
              ...(selected.comments ? [["Comentarios", selected.comments]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
                <span className="text-muted-foreground font-medium">{k}</span>
                <span className="text-foreground text-right">{k === "Estado" ? <StatusBadge status={v} /> : v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function ClientesSection({ clients, onAdd }: { clients: Client[]; onAdd: (c: Omit<Client, "id" | "visits" | "lastTreatment" | "status">) => void }) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", observations: "" });

  const filtered = clients.filter(c =>
    [c.name, c.email, c.phone].some(f => f.toLowerCase().includes(search.toLowerCase()))
  );

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    onAdd({ name: form.name, email: form.email, phone: form.phone, observations: form.observations });
    setForm({ name: "", email: "", phone: "", observations: "" });
    setModalOpen(false);
  }

  const inputCls = "w-full bg-muted border border-input rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-foreground">Clientes</h2>
        <button onClick={() => setModalOpen(true)} data-testid="button-nuevo-cliente"
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo cliente
        </button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input data-testid="input-buscar-cliente" className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Buscar cliente por nombre, email o teléfono…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No se encontraron clientes.</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Nombre", "Teléfono", "Email", "Último tratamiento", "Visitas", "Estado"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(c => (
                  <tr key={c.id} data-testid={`row-client-${c.id}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.lastTreatment}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.visits}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo cliente">
        <form onSubmit={handleSave} className="space-y-4">
          {[["Nombre completo *", "name", "text", "Martina López"], ["Email *", "email", "email", "ejemplo@email.com"], ["Teléfono *", "phone", "tel", "+54 11 XXXX-XXXX"]].map(([label, key, type, ph]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
              <input required={label.includes("*")} type={type} className={inputCls} placeholder={ph}
                value={(form as Record<string, string>)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Observaciones</label>
            <textarea rows={2} className={inputCls + " resize-none"} placeholder="Anotaciones sobre la clienta…"
              value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} />
          </div>
          <button type="submit" data-testid="button-guardar-cliente"
            className="w-full bg-primary text-white font-medium py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
            Guardar cliente
          </button>
        </form>
      </Modal>
    </div>
  );
}

function TratamientosPanel({ treatments, onUpdatePrice }: { treatments: Treatment[]; onUpdatePrice: (id: string, price: number) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  function savePrice(id: string) {
    const n = parseInt(editPrice.replace(/\D/g, ""));
    if (!isNaN(n)) onUpdatePrice(id, n);
    setEditingId(null);
  }

  return (
    <div className="space-y-5">
      <h2 className="font-serif text-2xl font-semibold text-foreground">Tratamientos</h2>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {treatments.map(t => (
          <div key={t.id} data-testid={`card-panel-treatment-${t.id}`}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-serif font-semibold text-foreground">{t.name}</h3>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground shrink-0">{t.category}</span>
            </div>
            <p className="text-sm text-muted-foreground">{t.description}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" /> {t.duration}
            </div>
            {editingId === t.id ? (
              <div className="flex items-center gap-2">
                <input className="flex-1 bg-muted border border-input rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="Nuevo precio" data-testid={`input-precio-${t.id}`} />
                <button onClick={() => savePrice(t.id)} data-testid={`button-save-precio-${t.id}`}
                  className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                  <Save className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary">{formatPrice(t.price)}</span>
                <button onClick={() => { setEditingId(t.id); setEditPrice(String(t.price)); }}
                  data-testid={`button-editar-precio-${t.id}`}
                  className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                  <Edit2 className="w-3 h-3" /> Editar precio
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PagosSection({ payments }: { payments: Payment[] }) {
  const [filter, setFilter] = useState<"Todos" | "Pagado" | "Pendiente" | "Señado">("Todos");
  const visible = filter === "Todos" ? payments : payments.filter(p => p.status === filter);
  const total = (s: string) => payments.filter(p => p.status === s).reduce((a, b) => a + b.amount, 0);

  const filterTabs = ["Todos", "Pagados", "Pendientes", "Señados"] as const;
  const filterMap: Record<string, string> = { Todos: "Todos", Pagados: "Pagado", Pendientes: "Pendiente", Señados: "Señado" };

  return (
    <div className="space-y-5">
      <h2 className="font-serif text-2xl font-semibold text-foreground">Pagos</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <p className="text-xs text-emerald-600 font-medium mb-1">Total cobrado</p>
          <p className="font-serif text-xl font-bold text-emerald-700">{formatPrice(total("Pagado"))}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs text-amber-600 font-medium mb-1">Total pendiente</p>
          <p className="font-serif text-xl font-bold text-amber-700">{formatPrice(total("Pendiente"))}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs text-blue-600 font-medium mb-1">Total señado</p>
          <p className="font-serif text-xl font-bold text-blue-700">{formatPrice(total("Señado"))}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {filterTabs.map(tab => (
          <button key={tab} data-testid={`button-filter-${tab.toLowerCase()}`}
            onClick={() => setFilter(filterMap[tab] as typeof filter)}
            className={cn("text-sm px-4 py-2 rounded-xl font-medium transition-colors",
              filterMap[tab] === filter ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Cliente", "Concepto", "Monto", "Método", "Estado", "Fecha"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No hay pagos para este filtro.</td></tr>
              ) : visible.map(p => (
                <tr key={p.id} data-testid={`row-payment-${p.id}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{p.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.concept}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{formatPrice(p.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.method}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConfigSection({ config, setConfig }: { config: import("@/lib/types").Config; setConfig: (c: import("@/lib/types").Config) => void }) {
  const [form, setForm] = useState(config);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(config);
  }, [config]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputCls = "w-full bg-muted border border-input rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="space-y-5">
      <h2 className="font-serif text-2xl font-semibold text-foreground">Configuración</h2>
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
        {saved && (
          <div className="mb-5 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2.5 text-sm">
            <CheckCircle className="w-4 h-4" /> Configuración actualizada correctamente.
          </div>
        )}
        <form onSubmit={handleSave} className="grid sm:grid-cols-2 gap-4">
          {([
            ["Nombre del centro", "name", "text"],
            ["Teléfono de contacto", "phone", "tel"],
            ["Email", "email", "email"],
            ["Dirección", "address", "text"],
            ["Horario de atención", "hours", "text"],
          ] as [string, keyof typeof form, string][]).map(([label, key, type]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
              <input type={type} className={inputCls} value={form[key] as string}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} data-testid={`input-config-${key}`} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mensaje automático para turnos</label>
            <textarea rows={3} className={inputCls + " resize-none"} value={form.autoMessage} data-testid="input-config-autoMessage"
              onChange={e => setForm(f => ({ ...f, autoMessage: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" data-testid="button-guardar-config"
              className="bg-primary text-white font-medium px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
              Guardar configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── DASHBOARD LAYOUT ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Turnos", icon: <Calendar className="w-4 h-4" /> },
  { label: "Clientes", icon: <Users className="w-4 h-4" /> },
  { label: "Tratamientos", icon: <Scissors className="w-4 h-4" /> },
  { label: "Pagos", icon: <CreditCard className="w-4 h-4" /> },
  { label: "Configuración", icon: <Settings className="w-4 h-4" /> },
];

function Dashboard({
  appointments, clients, treatments, payments, config,
  activeSection, setActiveSection,
  onUpdateStatus, onAddClient, onUpdatePrice, setConfig, onLogout,
  loading, error
}: {
  appointments: Appointment[];
  clients: Client[];
  treatments: Treatment[];
  payments: Payment[];
  config: import("@/lib/types").Config;
  activeSection: string;
  setActiveSection: (s: string) => void;
  onUpdateStatus: (id: string, s: Appointment["status"]) => void;
  onAddClient: (c: Omit<Client, "id" | "visits" | "lastTreatment" | "status">) => void;
  onUpdatePrice: (id: string, price: number) => void;
  setConfig: (c: import("@/lib/types").Config) => void;
  onLogout: () => void;
  loading: boolean;
  error: string | null;
}) {
  function renderSection() {
    switch (activeSection) {
      case "Turnos": return <TurnosSection appointments={appointments} onUpdate={onUpdateStatus} />;
      case "Clientes": return <ClientesSection clients={clients} onAdd={onAddClient} />;
      case "Tratamientos": return <TratamientosPanel treatments={treatments} onUpdatePrice={onUpdatePrice} />;
      case "Pagos": return <PagosSection payments={payments} />;
      case "Configuración": return <ConfigSection config={config} setConfig={setConfig} />;
      default: return <DashboardHome appointments={appointments} payments={payments} clients={clients} />;
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-sidebar border-r border-sidebar-border shrink-0 min-h-screen">
        <div className="p-5 border-b border-sidebar-border">
          <p className="font-serif text-base font-semibold text-foreground">Aura Skin Studio</p>
          <p className="text-xs text-muted-foreground mt-0.5">Panel de gestión</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button key={item.label} onClick={() => setActiveSection(item.label)}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left",
                activeSection === item.label
                  ? "bg-primary text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button onClick={onLogout} data-testid="button-logout"
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <span className="font-serif font-semibold text-foreground">Aura Skin Studio</span>
          <button onClick={onLogout} className="p-1.5 text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-8">
          {loading && (
            <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted px-4 py-2 rounded-xl border border-border">
              <span className="animate-spin inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
              <span>Sincronizando datos con Supabase...</span>
            </div>
          )}
          {error && (
            <div className="mb-4 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {renderSection()}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center">
          {NAV_ITEMS.slice(0, 5).map(item => (
            <button key={item.label} onClick={() => setActiveSection(item.label)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors",
                activeSection === item.label ? "text-primary" : "text-muted-foreground"
              )}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

function ConfigWarningBanner() {
  if (isConfigured) return null;
  return (
    <div className="bg-amber-600 text-white text-xs font-medium py-2 px-4 text-center flex items-center justify-center gap-2 z-50 sticky top-0 shadow-sm">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>Supabase no está configurado. Revisá las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env. Mostrando datos locales de demostración.</span>
    </div>
  );
}

export default function App() {
  const {
    view, setView,
    activeSection, setActiveSection,
    treatments, updateTreatmentPrice,
    appointments, bookAppointment, updateAppointmentStatus,
    clients, addClient,
    payments,
    config, setConfig,
    loading, error
  } = useAppState();

  return (
    <>
      <ConfigWarningBanner />
      {view === "landing" && (
        <LandingPage
          onPanel={() => setView("login")}
          onBookAppointment={bookAppointment}
          treatments={treatments}
        />
      )}
      {view === "login" && (
        <LoginPage onLogin={() => setView("dashboard")} />
      )}
      {view === "dashboard" && (
        <Dashboard
          appointments={appointments}
          clients={clients}
          treatments={treatments}
          payments={payments}
          config={config}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          onUpdateStatus={updateAppointmentStatus}
          onAddClient={addClient}
          onUpdatePrice={updateTreatmentPrice}
          setConfig={setConfig}
          onLogout={() => setView("landing")}
          loading={loading}
          error={error}
        />
      )}
      <ChatWidget />
    </>
  );
}
