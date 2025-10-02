"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Send, X } from "lucide-react";
import { useAssistant } from "./AssistantProvider";
import { useData } from "@/lib/dataprovider";
import type { SantaData } from "@/domain/ssot";
import { parseNoteToAction } from "@/features/santabrain/lib/engine";
import { findSimilarAccounts, assessDuplicateRisk } from "@/features/santabrain/lib/helpers";
import { InlineOrderCard } from "./InlineOrderCard";

// =============== Tipos mínimos y utilidades locales ===============
type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type DraftOrder = React.ComponentProps<typeof InlineOrderCard>["initial"];

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

// ============================== Componente ==============================
export function AssistantDialog() {
  const { isOpen, closeAssistant } = useAssistant();
  const { data, currentUser } = useData();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "👋 ¿En qué te ayudo? Prueba: “pedido 6 cajas sb-750 para La Bodeguita en Ibiza”." },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<DraftOrder | null>(null);
  const activeResultRef = useRef<any>(null);

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

      try {
        // IMPORTANTE: tu engine actual espera (text, ctx, data)
        const result = parseNoteToAction(trimmed, undefined as any, data as SantaData);
        activeResultRef.current = result;

        if (result.kind === "PEDIDO") {
          // Copiamos lo esencial a un draft visual para InlineOrderCard
          const draft: DraftOrder = {
            accountName: result.accountName ?? "(cuenta sin definir)",
            isNewAccount: !!result.isNewAccount,
            city: result.city ?? result.place ?? undefined,
            distributorName: result.distributorName ?? undefined,
            lines: [
              {
                sku: result.sku ?? "SB-750",
                label: result.productLabel ?? "Santa Brisa 750ml",
                qty: result.qtyCases ?? 1,
              },
            ],
            notes: result.notes ?? "",
          };

          // Mensaje base
          let botText = `✅ He detectado un pedido de ${draft.lines[0].qty} ${draft.lines[0].qty === 1 ? "caja" : "cajas"} para “${draft.accountName}”.`;

          // Detección de duplicados si es nueva cuenta y tenemos nombre
          if (draft.isNewAccount && draft.accountName && data) {
            const loc = await getBrowserLocation();
            const matches = findSimilarAccounts({
              data,
              candidateName: draft.accountName,
              candidateLoc: loc,
              minNameSim: 0.45,
              radiusM: 1200,
            });
            const decision = assessDuplicateRisk(matches);

            if (decision.action === "BLOCK_AUTO_CREATE") {
              botText += `\n⚠️ Posible duplicado: ${decision.reason}\nSelecciona una existente o confirma creación forzada.`;
            } else if (decision.action === "WARN") {
              botText += `\nℹ️ Aviso: ${decision.reason} (procedo si confirmas).`;
            } else {
              botText += `\nProcedo a crear la cuenta automáticamente con tu ubicación (si está disponible).`;
            }
          }

          pushAssistant(botText);
          setPendingOrder(draft);
        } else if (result.kind === "VISITA") {
          const when = result.when ? new Date(result.when).toLocaleString("es-ES") : "(sin fecha)";
          pushAssistant(`📅 He preparado una visita para ${when}. ¿Confirmo?`);
          setPendingOrder(null);
        } else if (result.kind === "EVENTO_MKT") {
          pushAssistant(`🎪 Evento/PLV detectado${result.description ? `: ${result.description}` : ""}. ¿Lo programo?`);
          setPendingOrder(null);
        } else {
          pushAssistant("📝 He guardado tu nota. Si quieres, prueba con “pedido 6 cajas sb-750 para @Cliente en Ciudad”.");
          setPendingOrder(null);
        }
      } catch (err: any) {
        pushAssistant(`❌ Error: ${err?.message ?? String(err)}`);
      } finally {
        setIsThinking(false);
      }
    },
    [inputValue, isThinking, data]
  );

  // Confirmar/Cancelar pedido inline (sin salir del chat)
  const handleConfirmOrder = useCallback(
    async (draft: DraftOrder) => {
      // Aquí normalmente llamarías a server actions: createAccountAndParty / placeOrder / createInteraction
      // Para evitar dependencias, solo confirmamos en chat:
      setPendingOrder(null);
      pushAssistant(
        `🧾 Pedido listo: ${draft.lines[0].qty} ${draft.lines[0].qty === 1 ? "caja" : "cajas"} ${draft.lines[0].label ?? draft.lines[0].sku
        } para “${draft.accountName}”${draft.city ? ` en ${draft.city}` : ""}.`
      );
    },
    []
  );

  const handleCancelOrder = useCallback(() => {
    setPendingOrder(null);
    pushAssistant("❎ Cancelado el borrador de pedido.");
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

          {/* Tarjeta de pedido editable inline */}
          {pendingOrder && (
            <div className="mt-2">
              <InlineOrderCard
                initial={pendingOrder}
                onConfirm={handleConfirmOrder}
                onCancel={handleCancelOrder}
              />
            </div>
          )}

          {isThinking && (
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
