/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/app/(app)/envios/solicitar/page.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { SBButton } from '@/components/ui/ui-primitives';
import { useData } from '@/lib/dataprovider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DestinatarioStep } from '@/components/envios/DestinatarioStep';
import { ProductosStep } from '@/components/envios/ProductosStep';
import { createShipmentRequest } from '@/server/actions/shipment-requests';

type StepType = 'destinatario' | 'productos';

export default function SolicitarEnvioPage() {
  const { data } = useData();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<StepType>('destinatario');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [motivo, setMotivo] = useState<string>('');
  
  // TODO: Obtener userId del contexto de autenticación
  const userId = 'current-user'; // Placeholder temporal

  const handleNextStep = () => {
    if (step === 'destinatario' && selectedContact) {
      setStep('productos');
    }
  };

  const handlePrevStep = () => {
    if (step === 'productos') {
      setStep('destinatario');
    }
  };

  const handleSubmit = () => {
    if (!selectedContact || selectedProducts.length === 0 || !motivo) {
      toast.error('Faltan datos requeridos');
      return;
    }

    startTransition(async () => {
      try {
        const result = await createShipmentRequest({
          contactId: selectedContact.id,
          contactName: selectedContact.name,
          products: selectedProducts.map(p => ({
            itemId: p.item.id,
            itemName: p.item.name,
            quantity: p.quantity,
          })),
          motivo: motivo as any,
          requestedBy: userId,
        });

        if (result.success) {
          toast.success(result.message, {
            description: result.shipmentId 
              ? `Envío creado: ${result.shipmentId.substring(0, 8)}...`
              : `Solicitud: ${result.requestId?.substring(0, 8)}...`,
            duration: 5000,
          });

          // Redirect según el tipo de resultado
          if (result.shipmentId) {
            router.push('/warehouse/logistics');
          } else {
            // Reset form para nueva solicitud
            setSelectedContact(null);
            setSelectedProducts([]);
            setMotivo('');
            setStep('destinatario');
          }
        } else {
          toast.error('Error al crear solicitud', {
            description: result.error,
            duration: 5000,
          });
        }
      } catch (error: any) {
        toast.error('Error inesperado', {
          description: error.message,
          duration: 5000,
        });
      }
    });
  };

  return (
    <div className="sb-page">
      {/* Header */}
      <div className="sb-header-glass p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="sb-page__title mb-0">Solicitar Envío</h1>
            <p className="sb-page__subtitle">
              Muestras, influencers, POS, eventos
            </p>
          </div>
        </div>
      </div>

      <div className="sb-page__content max-w-4xl mx-auto">
        {/* Wizard Steps */}
        <div className="sb-card mb-6">
          <div className="p-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center gap-4">
                {/* Step 1 */}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                      step === 'destinatario'
                        ? 'bg-primary text-white'
                        : selectedContact
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    1
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      step === 'destinatario' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Destinatario
                  </span>
                </div>

                {/* Divider */}
                <div className="w-12 h-0.5 bg-border" />

                {/* Step 2 */}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                      step === 'productos'
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    2
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      step === 'productos' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Productos
                  </span>
                </div>
              </div>
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">
              {step === 'destinatario' && (
                <DestinatarioStep
                  accounts={data?.accounts || []}
                  selectedContact={selectedContact}
                  onSelectContact={setSelectedContact}
                />
              )}

              {step === 'productos' && (
                <ProductosStep
                  items={data?.items || []}
                  selectedProducts={selectedProducts}
                  onUpdateProducts={setSelectedProducts}
                  motivo={motivo}
                  onMotivoChange={setMotivo}
                  contact={selectedContact}
                />
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t mt-6">
              <SBButton
                variant="ghost"
                onClick={handlePrevStep}
                disabled={step === 'destinatario'}
              >
                <ArrowLeft size={16} />
                Anterior
              </SBButton>

              {step === 'destinatario' && (
                <SBButton
                  onClick={handleNextStep}
                  disabled={!selectedContact}
                >
                  Siguiente
                  <ArrowRight size={16} />
                </SBButton>
              )}

              {step === 'productos' && (
                <SBButton
                  disabled={selectedProducts.length === 0 || !motivo || isPending}
                  onClick={handleSubmit}
                >
                  <Package size={16} />
                  {isPending ? 'Procesando...' : 'Solicitar Envío'}
                </SBButton>
              )}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="sb-card-glass-subtle p-4">
          <p className="text-sm text-muted-foreground">
            <strong>ℹ️ Nota:</strong> Las solicitudes serán revisadas por el
            equipo de logística. Recibirás una notificación cuando tu solicitud
            sea aprobada o rechazada.
          </p>
        </div>
      </div>
    </div>
  );
}
