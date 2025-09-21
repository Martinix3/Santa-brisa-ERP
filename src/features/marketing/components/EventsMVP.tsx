
"use client";

// =============================================
// SB Marketing — Eventos (MVP)
// =============================================
// Piezas incluidas:
// - Types & helpers
// - Server Actions (mock)
// - UI: Programación de eventos + Lista + Encuesta post‑evento
// - Widget de dashboard: "Tus encuestas pendientes"

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, ListChecks, CheckCircle2, BarChart3, Users, FileText, ShoppingCart, Target, Euro } from "lucide-react";
import { SBCard, SBButton } from "@/components/ui/ui-primitives";
import type { EventMarketing } from "@/domain";

// ==========================
// 1) Tipos base y helpers
// ==========================

type EventKind = "DEMO" | "FERIA" | "FORMACION" | "ACTIVACION" | "OTRO";

type SBEvent = EventMarketing;

type PostEventSurvey = {
  eventId: string;
  organizerId: string;
  submittedAt: string; // ISO
  // KPIs mínimos
  costTotal: number;            // €
  attendees: number;            // asistentes
  leads: number;                // contactos cualificados
  ordersInSitu: number;         // pedidos en el evento
  orders30d: number;            // pedidos en 30 días
  plvCost: number;              // € en PLV entregado/instalado
  notes?: string;
};

function toISO(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}

function isPast(iso?: string) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

// ======================================
// 2) Server Actions (mock, in‑memory)
// ======================================

const DB: { events: SBEvent[], surveys: PostEventSurvey[] } = {
  events: [],
  surveys: [],
};

async function createEvent(data: Omit<SBEvent, "id" | "status">) {
  const id = `ev_${Math.random().toString(36).slice(2, 8)}`;
  const ev: SBEvent = { id, status: "planned", ...data };
  DB.events.push(ev);
  console.log("Event created:", ev);
  return ev;
}

async function listMyEvents(organizerId: string) {
  console.log("Listing events for:", organizerId, "Found:", DB.events.length);
  return DB.events
    .filter((e) => (e as any).organizerId === organizerId)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

async function submitSurvey(s: PostEventSurvey) {
  const exists = DB.surveys.find((x) => x.eventId === s.eventId);
  if (exists) {
    Object.assign(exists, s);
    console.log("Survey updated:", exists);
    return exists;
  }
  DB.surveys.push(s);
  console.log("Survey submitted:", s);
  return s;
}

async function getSurveyByEvent(eventId: string) {
  return DB.surveys.find((s) => s.eventId === eventId) || null;
}

// Marca finalizados automáticamente si endAt ha pasado
function computeStatus(e: SBEvent): SBEvent["status"] {
  if (e.status === "cancelled") return e.status;
  if (e.endAt && isPast(e.endAt)) return "closed";
  if (!e.endAt && isPast(e.startAt) && (new Date().getTime() - new Date(e.startAt).getTime()) > 12 * 3600 * 1000 ) return "closed";
  return "planned";
}


// ======================================
// 3) UI — Formulario de evento (MVP)
// ======================================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-zinc-700">{label}</span>
      {children}
    </label>
  );
}

function NewEventCard({ onCreated }: { onCreated: (e: SBEvent) => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EventKind>("DEMO");
  const [date, setDate] = useState<string>(() => toISO(new Date()).slice(0,16));
  const [end, setEnd] = useState<string>("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  async function handleCreate() {
    if (!title) return;
    const startAt = new Date(date);
    const endAt = end ? new Date(end) : undefined;
    const ev = await createEvent({ title, kind, startAt: toISO(startAt), endAt: endAt ? toISO(endAt) : undefined, city: location, notes });
    onCreated(ev);
    setTitle(""); setNotes(""); setLocation("");
  }

  return (
    <SBCard title="Programar evento nuevo">
        <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Título">
                <input className="w-full border rounded-xl px-3 py-2" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Degustación Summer Club"/>
                </Field>
                <Field label="Tipo">
                <select className="w-full border rounded-xl px-3 py-2" value={kind} onChange={e=>setKind(e.target.value as EventKind)}>
                    <option>DEMO</option><option>FERIA</option><option>FORMACION</option><option>ACTIVACION</option><option>OTRO</option>
                </select>
                </Field>
                <Field label="Inicio">
                <input type="datetime-local" className="w-full border rounded-xl px-3 py-2" value={date} onChange={e=>setDate(e.target.value)} />
                </Field>
                <Field label="Fin (opcional)">
                <input type="datetime-local" className="w-full border rounded-xl px-3 py-2" value={end} onChange={e=>setEnd(e.target.value)} />
                </Field>
                <Field label="Ubicación">
                <input className="w-full border rounded-xl px-3 py-2" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Bar X, Valencia"/>
                </Field>
                <Field label="Notas (opcional)">
                <input className="w-full border rounded-xl px-3 py-2" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="PLV: vasos + kit"/>
                </Field>
            </div>
            <div className="mt-4">
                <SBButton onClick={handleCreate}>Crear evento</SBButton>
            </div>
        </div>
    </SBCard>
  );
}

// ======================================
// 4) UI — Lista de eventos + encuesta (INLINE)
// ======================================

function SurveyInline({ event, onSubmitted }: { event: SBEvent; onSubmitted: ()=>void }) {
  const [costTotal, setCostTotal] = useState<number>(0);
  const [attendees, setAttendees] = useState<number>(0);
  const [leads, setLeads] = useState<number>(0);
  const [ordersInSitu, setOrdersInSitu] = useState<number>(0);
  const [orders30d, setOrders30d] = useState<number>(0);
  const [plvCost, setPlvCost] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  async function handleSubmit() {
    await submitSurvey({
      eventId: event.id,
      organizerId: (event as any).organizerId,
      submittedAt: toISO(new Date()),
      costTotal, attendees, leads, ordersInSitu, orders30d, plvCost, notes,
    });
    onSubmitted();
  }
  
  const kpiFields = [
    { label: "Coste total (€)", value: costTotal, setter: setCostTotal, icon: Euro },
    { label: "Asistentes", value: attendees, setter: setAttendees, icon: Users },
    { label: "Leads", value: leads, setter: setLeads, icon: Target },
    { label: "Pedidos in situ", value: ordersInSitu, setter: setOrdersInSitu, icon: ShoppingCart },
    { label: "Pedidos (+30d)", value: orders30d, setter: setOrders30d, icon: Calendar },
    { label: "Coste PLV (€)", value: plvCost, setter: setPlvCost, icon: FileText },
  ];

  return (
    <motion.div 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="mt-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200 overflow-hidden"
    >
      <div className="text-sm text-zinc-700 mb-3">
        <strong>Encuesta post‑evento</strong> — Rellena para cerrar métricas.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {kpiFields.map(f => (
             <Field key={f.label} label={f.label}>
                 <div className="relative">
                    <f.icon className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2"/>
                    <input type="number" className="w-full border rounded-xl pl-8 pr-2 py-2" value={f.value} onChange={e=>f.setter(Number(e.target.value))}/>
                 </div>
            </Field>
        ))}
      </div>
      <div className="mt-3">
        <Field label="Notas cualitativas">
            <textarea className="w-full border rounded-xl px-3 py-2" value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="¿Qué tal fue? ¿Repetir? ¿Lecciones aprendidas?"/>
        </Field>
      </div>
      <div className="mt-3 flex justify-end">
        <SBButton onClick={handleSubmit}>Guardar Encuesta</SBButton>
      </div>
    </motion.div>
  );
}

function EventsList({ newEvent }: { newEvent: SBEvent | null }) {
    const [events, setEvents] = useState<SBEvent[]>([]);
    const [surveys, setSurveys] = useState<Record<string, PostEventSurvey>>({});
    const [openSurveyId, setOpenSurveyId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        const evs = await listMyEvents("USER_123");
        setEvents(evs);
        const srvs: Record<string, PostEventSurvey> = {};
        for(const ev of evs) {
            const s = await getSurveyByEvent(ev.id);
            if(s) srvs[ev.id] = s;
        }
        setSurveys(srvs);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    useEffect(() => {
        if(newEvent) {
            setEvents(prev => [newEvent, ...prev]);
        }
    }, [newEvent]);

    const handleSurveySubmitted = (eventId: string) => {
        loadData();
        setOpenSurveyId(null);
    }
    
    const sortedEvents = useMemo(() => events.sort((a,b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()), [events]);

    return (
        <SBCard title="Mis Eventos">
            <div className="divide-y divide-zinc-100">
                {sortedEvents.map(event => {
                    const status = computeStatus(event);
                    const survey = surveys[event.id];
                    const isSurveyOpen = openSurveyId === event.id;

                    return (
                        <div key={event.id} className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-zinc-900">{event.title}</p>
                                    <div className="flex items-center gap-4 text-sm text-zinc-600 mt-1">
                                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/>{new Date(event.startAt).toLocaleDateString('es-ES', {weekday: 'long', day: 'numeric', month: 'long'})}</span>
                                        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4"/>{event.city || 'N/A'}</span>
                                        <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded">{event.kind}</span>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${status === "closed" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>{status}</span>
                            </div>
                            {status === "closed" && (
                                <div className="mt-3">
                                    {survey ? (
                                         <div className="text-sm text-green-700 flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                                            <CheckCircle2 className="w-5 h-5"/> Encuesta completada. ¡Buen trabajo!
                                         </div>
                                    ) : (
                                        <SBButton variant="secondary" onClick={() => setOpenSurveyId(isSurveyOpen ? null : event.id)}>
                                           {isSurveyOpen ? "Cerrar Encuesta" : "Rellenar Encuesta Post-Evento"}
                                        </SBButton>
                                    )}
                                </div>
                            )}
                             {isSurveyOpen && <SurveyInline event={event} onSubmitted={() => handleSurveySubmitted(event.id)} />}
                        </div>
                    );
                })}
            </div>
        </SBCard>
    )
}

// ======================================
// 5) Widget de encuestas pendientes
// ======================================

function PendingSurveysWidget({ onEventSelect }: { onEventSelect: (id: string) => void }) {
  const [pending, setPending] = useState<SBEvent[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
        const all = await listMyEvents("USER_123");
        const fin = all.filter(e => computeStatus(e) === "closed");
        const out: SBEvent[] = [];
        for (const ev of fin) {
            const s = await getSurveyByEvent(ev.id);
            if (!s) out.push(ev);
        }
        setPending(out);
    }, 5000); // Check for pending surveys periodically
    return () => clearInterval(interval);
  }, []);

  if (pending.length === 0) return null;
  return (
    <SBCard title="Encuestas Pendientes">
      <div className="p-3">
        <p className="text-xs text-zinc-600 mb-2">Tienes encuestas de eventos finalizados por rellenar.</p>
        <ul className="space-y-1">
            {pending.map(ev => (
              <li key={ev.id}>
                  <button onClick={() => onEventSelect(ev.id)} className="w-full text-left text-sm p-2 rounded-lg hover:bg-zinc-100">
                    {ev.title}
                  </button>
              </li>
            ))}
        </ul>
      </div>
    </SBCard>
  );
}

// ======================================
// 6) Página de módulo (preview)
// ======================================

export function MarketingEventsMVP() {
  const [justCreated, setJustCreated] = useState<SBEvent | null>(null);
  
  const handleEventSelectFromWidget = (eventId: string) => {
    const element = document.getElementById(`event-${eventId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // This part is tricky without a more complex state management, opening the survey directly
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Marketing · Eventos</h1>
        <SBButton onClick={()=>{window.scrollTo({top:0,behavior:'smooth'});}}>Nueva entrada</SBButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <NewEventCard onCreated={(e) => setJustCreated(e)} />
          <EventsList newEvent={justCreated} />
        </div>
        <div className="space-y-6">
          <PendingSurveysWidget onEventSelect={handleEventSelectFromWidget}/>
          <SBCard title="Insights">
            <div className="p-4 text-sm text-yellow-900 bg-yellow-50">
              <strong>Insight:</strong> Las activaciones con PLV en sitio muestran +12% de pedidos a 30 días vs promedio.
            </div>
          </SBCard>
        </div>
      </div>
    </div>
  );
}
