
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Send, User, Bot, Loader, X } from "lucide-react";
import { useAssistant } from "./AssistantProvider";
import { useData } from "@/lib/dataprovider";
import type { SantaData } from "@/domain/ssot";
import { parseNoteToAction } from "@/features/santabrain/lib/engine";
import { 
  findSimilarAccounts, 
  assessDuplicateRisk,
  distanceMeters // <-- AÑADIR ESTA IMPORTACIÓN
} from "@/features/santabrain/lib/helpers";
import { InlineOrderCard } from "./InlineOrderCard";
import type { ParseResult } from "@/features/santabrain/lib/types";

// Server Actions
import { placeOrder } from "@/app/(app)/orders/actions";
import { createInteraction } from "@/app/(app)/agenda/actions";
import { createAccount } from "@/app/(app)/accounts/actions";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import type { User, Party } from "@/domain/ssot"; // <-- AÑADIR ESTA IMPORTACIÓN

// =============== Tipos mínimos y utilidades locales ===============
type DraftOrder = React.ComponentProps<typeof InlineOrderCard>["initial"] & {
  // AÑADIR ESTOS CAMPOS AL TIPO
  flow?: 'DIRECT' | 'PLACEMENT';
  distributorPartyId?: string;
  distributorName?: string;
};


async function getBrowserLocation(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 4000 }
    );
  });
}

// =============== NUEVA FUNCIÓN HELPER ===============
// Esta función encapsula la lógica para encontrar el distribuidor más cercano
async function findBestDistributor(
  currentUser: User,
  data: SantaData,
  userLocation: { lat: number; lng: number }
): Promise<Party | null> {
  const assigned = currentUser.assignedDistributors?.filter(d => d.partyId) ?? [];
  if (!assigned.length) return null; // No tiene distribuidores asignados

  const distributorsWithLocation = data.parties.filter(p =>
    assigned.some(a => a.partyId === p.id) && p.location
  );

  if (!distributorsWithLocation.length) return null; // Ninguno tiene ubicación
  if (distributorsWithLocation.length === 1) return distributorsWithLocation[0];

  // Calcular distancias y encontrar el más cercano
  const sorted = distributorsWithLocation
    .map(dist => ({
      distributor: dist,
      distance: distanceMeters(userLocation, dist.location!),
    }))
    .sort((a, b) => a.distance - b.distance);

  return sorted[0].distributor;
}


// ============================== Componente ==============================
export function AssistantDialog() {
  const { isOpen, closeAssistant } = useAssistant();
  const { data, currentUser } = useData();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "👋 ¿En qué te ayudo? Prueba: “pedido 6 cajas sb-750 para La Bodeguita en Ibiza”." },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<DraftOrder | null>(null);
  const activeResultRef = useRef<ParseResult | null>(null);

  // autoscroll
  useEffect(() => {
    const el = document.getElementById("assistant-chat-scroll");
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pendingOrder]);

  const pushAssistant = (content: string) =>
    setMessages((prev) => [...prev, { role: "assistant", content }]);

  const pushUser = (content: string) =>
    setMessages((prev) => [...prev, { role: "user", content }]);

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed || isThinking) return;

      pushUser(trimmed);
      setInputValue("");
      setIsThinking(true);
      setPendingOrder(null); // Limpiar cualquier borrador anterior
      activeResultRef.current = null;


      try {
        const safeData = (data ?? { accounts: [], parties: [] }) as SantaData;
        const result = parseNoteToAction(trimmed, { currentUser } as any, safeData);
        console.log("[SB] parseNoteToAction →", result);
        activeResultRef.current = result;
        
        let botText: string = "No he entendido bien la petición. ¿Puedes reformularla?";

        if (result.kind === "PEDIDO") {
          const draft: DraftOrder = {
            accountName: result.accountName ?? "(cuenta sin definir)",
            isNewAccount: !!result.isNewAccount,
            city: result.location ?? undefined,
            lines: [
              {
                sku: result.itemId ?? "SB-750",
                label: result.itemId ?? "Santa Brisa 750ml",
                qty: result.qtyCases ?? 1,
              },
            ],
            notes: result.summary ?? "",
            flow: 'DIRECT', // Por defecto es directa
          };

          botText = `✅ He detectado un pedido de ${draft.lines[0].qty} ${draft.lines[0].qty === 1 ? "caja" : "cajas"} para “${draft.accountName}”.`;
          
          // --- LÓGICA MODIFICADA PARA CUENTAS NUEVAS ---
          if (draft.isNewAccount && draft.accountName && data && currentUser) {
            const loc = await getBrowserLocation().catch(() => null);
            
            // 1. Comprobación de duplicados (sin cambios)
            const matches = findSimilarAccounts({
              data: safeData as any,
              candidateName: draft.accountName,
              candidateLoc: loc || undefined,
            });
            const decision = assessDuplicateRisk(matches);

            if (decision.action === "BLOCK_AUTO_CREATE") {
              botText += `\n⚠️ **Posible duplicado**: ${decision.reason}`;
            } else {
              // 2. LÓGICA AÑADIDA: Asignación de distribuidor
              if (loc) {
                const bestDistributor = await findBestDistributor(currentUser, safeData, loc);
                if (bestDistributor) {
                  draft.flow = 'PLACEMENT';
                  draft.distributorPartyId = bestDistributor.id;
                  draft.distributorName = bestDistributor.name;
                  botText += `\nℹ️ Por tu ubicación, se asignará automáticamente al distribuidor **${bestDistributor.name}**.`;
                } else {
                  botText += `\nℹ️ La cuenta se marcará como **directa**.`;
                }
              } else {
                botText += `\nℹ️ La cuenta se marcará como **directa** (no se pudo obtener tu ubicación).`;
              }
              
              if (decision.action === "WARN") {
                botText += `\n**Aviso**: ${decision.reason}`;
              }
            }
          }
          // --- FIN DE LA LÓGICA MODIFICADA ---

          setPendingOrder(draft);
          pushAssistant(botText);

        } else if (result.kind === "VISITA") {
          const when = result.when ? new Date(result.when).toLocaleString("es-ES") : "ahora mismo";
          botText = `📅 OK, voy a registrar una visita para ${result.accountId ? `la cuenta ${result.accountId}`: 'una cuenta'} sobre "${result.summary}", programada para ${when}. ¿Es correcto?`;
          pushAssistant(botText);
          // En una versión más avanzada, pediríamos confirmación aquí antes de guardar.
          // Por ahora, guardamos directamente para simplificar.
          await createInteraction({
              accountId: result.accountId!,
              note: result.summary!,
              plannedFor: result.when,
              createdById: currentUser!.id,
              dept: 'VENTAS',
              kind: 'VISITA'
          });
          toast.success("Visita guardada con éxito.");

        } else {
          botText = "📝 He guardado tu nota. Si quieres, prueba con “pedido 6 cajas sb-750 para La Bodeguita en Ibiza”.";
          pushAssistant(botText);
        }
        
      } catch (err: any) {
        pushAssistant(`❌ Error: ${err?.message ?? String(err)}`);
      } finally {
        setIsThinking(false);
      }
    },
    [inputValue, isThinking, data, currentUser]
  );

  const handleConfirmOrder = useCallback(
    async (draft: DraftOrder) => {
      setPendingOrder(null);
      setIsThinking(true);
      pushAssistant(`👍 ¡Entendido! Guardando el pedido...`);
      
      try {
        if (!currentUser?.id) throw new Error("Usuario no identificado.");

        let finalAccountId = activeResultRef.current?.kind === 'PEDIDO' ? activeResultRef.current.accountId : undefined;

        // Si la cuenta es nueva, la creamos primero
        if (draft.isNewAccount && draft.accountName && !finalAccountId) {
            toast.info(`Creando nueva cuenta: ${draft.accountName}...`);
            const newAccount = await createAccount({ name: draft.accountName, ownerId: currentUser.id });
            finalAccountId = newAccount.id;
            toast.success(`Cuenta "${newAccount.name}" creada.`);
        }

        if (!finalAccountId) throw new Error("No se ha podido determinar la cuenta para el pedido.");

        const orderData = {
          accountId: finalAccountId,
          lines: draft.lines.map(l => ({ sku: l.sku, qty: l.qty, unitPriceReported: undefined })),
          createdById: currentUser.id,
        };

        const { id: orderId } = await placeOrder(orderData);
        toast.success(`Pedido ${orderId} creado con éxito.`);
        pushAssistant(`🧾 ¡Hecho! He creado el pedido. Puedes verlo aquí: /orders/${orderId}`);
        router.push(`/orders/${orderId}`);
        closeAssistant();

      } catch (error: any) {
        console.error("[handleConfirmOrder] Error:", error);
        toast.error(`Error al guardar el pedido: ${error.message}`);
        pushAssistant(`🔴 Vaya, algo ha fallado al intentar guardar el pedido. Por favor, inténtalo de nuevo o usa la interfaz manual.`);
      } finally {
        setIsThinking(false);
      }
    },
    [currentUser, router, closeAssistant]
  );

  const handleCancelOrder = useCallback(() => {
    setPendingOrder(null);
    pushAssistant("❎ Borrador de pedido cancelado.");
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/20">
      <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <div className="relative h-8 w-8 rounded-full overflow-hidden">
            <Image src="/sb-logo.png" alt="SB" fill className="object-contain" />
          </div>
          <div className="font-semibold">Santa Brain</div>
          <button className="ml-auto p-2 rounded hover:bg-zinc-100" onClick={closeAssistant} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Mensajes */}
        <div id="assistant-chat-scroll" className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((m, idx) => (
            <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={
                  m.role === "user"
                    ? "inline-block bg-zinc-900 text-white px-3 py-2 rounded-2xl"
                    : "inline-block bg-zinc-100 text-zinc-900 px-3 py-2 rounded-2xl"
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          {pendingOrder && <div className="text-xs text-zinc-500">[DEBUG] hay pendingOrder</div>}
          {pendingOrder && (
            <div className="mt-2">
              <InlineOrderCard
                initial={pendingOrder}
                onConfirm={handleConfirmOrder}
                onCancel={handleCancelOrder}
              />
            </div>
          )}

          {isThinking && !pendingOrder && (
            <div className="text-left">
              <div className="inline-block bg-zinc-100 text-zinc-900 px-3 py-2 rounded-2xl animate-pulse">
                Pensando…
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="border-t px-3 py-2 flex gap-2 items-center">
          <input
            className="flex-1 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-800"
            placeholder="Escribe aquí… (ej. “pedido 6 cajas sb-750 para La Bodeguita en Ibiza”)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-xl px-3 py-2 bg-zinc-900 text-white disabled:opacity-50"
            disabled={!inputValue.trim() || isThinking}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default AssistantDialog;
