'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from 'react';
import { 
  sendEmail, 
  listEmails, 
  getEmail,
  syncEmails,
  checkGmailConfig,
  markEmailAsRead
} from '@/server/actions/gmail.actions';
import type { ParsedEmail } from '@/server/integrations/gmail/types';

export default function GmailTestPage() {
  const [userId, setUserId] = useState('martin');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<ParsedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<ParsedEmail | null>(null);

  // Test 1: Verificar configuración
  const handleCheckConfig = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await checkGmailConfig(userId);
      setIsConfigured(response.configured);
      setResult(response);
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  // Test 2: Enviar email de prueba
  const handleSendTestEmail = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await sendEmail({
        userId,
        to: ['martinjaimesamperiz@gmail.com'], // Cambia por tu email
        subject: `🧪 Test Gmail - ${new Date().toLocaleString()}`,
        body: 'Este es un email de prueba enviado desde la UI de testing.',
        bodyHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">🎉 Gmail Funciona!</h1>
            <p>Este email fue enviado desde <strong>Santa Brisa ERP</strong> usando la integración de Gmail.</p>
            <p>Timestamp: <code>${new Date().toISOString()}</code></p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; font-size: 14px;">Enviado desde UI de Testing</p>
          </div>
        `
      });
      setResult(response);
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  // Test 3: Listar emails
  const handleListEmails = async (unreadOnly = false) => {
    setLoading(true);
    setResult(null);
    setEmails([]);
    try {
      const response = await listEmails({
        userId,
        unreadOnly,
        maxResults: 20
      });
      if (response.success && response.messages) {
        setEmails(response.messages);
      }
      setResult(response);
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  // Test 4: Ver detalle de email
  const handleViewEmail = async (messageId: string) => {
    setLoading(true);
    try {
      const response = await getEmail({ userId, messageId });
      if (response.success && response.message) {
        setSelectedEmail(response.message);
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  // Test 5: Marcar como leído
  const handleMarkAsRead = async (messageId: string) => {
    setLoading(true);
    try {
      const response = await markEmailAsRead({ userId, messageId });
      if (response.success) {
        // Recargar lista
        await handleListEmails(false);
      }
      setResult(response);
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  // Test 6: Sincronizar emails
  const handleSyncEmails = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await syncEmails(userId);
      setResult(response);
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📧 Gmail Integration Testing UI
          </h1>
          <p className="text-gray-600">
            Interfaz completa para probar todas las funcionalidades de la integración de Gmail
          </p>
          
          {/* User ID Input */}
          <div className="mt-4 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              User ID:
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="martin"
            />
            
            {/* Status Badge */}
            {isConfigured !== null && (
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isConfigured 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {isConfigured ? '✓ Configurado' : '✗ No configurado'}
              </div>
            )}
          </div>

          {/* OAuth Setup Link */}
          {isConfigured === false && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 mb-2">
                ⚠️ Gmail no está configurado para este usuario. Primero debes conectar tu cuenta:
              </p>
              <a
                href={`/api/gmail/auth?userId=${userId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium"
              >
                🔗 Conectar Cuenta de Gmail
              </a>
            </div>
          )}
        </div>

        {/* Test Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Test 1 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              1️⃣ Verificar Configuración
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Comprueba si Gmail está configurado para este usuario
            </p>
            <button
              onClick={handleCheckConfig}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? '⏳ Verificando...' : '🔍 Verificar Config'}
            </button>
          </div>

          {/* Test 2 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              2️⃣ Enviar Email de Prueba
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Envía un email de prueba a tu dirección
            </p>
            <button
              onClick={handleSendTestEmail}
              disabled={loading || isConfigured === false}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? '📤 Enviando...' : '✉️ Enviar Test'}
            </button>
          </div>

          {/* Test 3 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              3️⃣ Listar Emails
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Obtiene los últimos 20 emails
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleListEmails(false)}
                disabled={loading || isConfigured === false}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? '📥 Cargando...' : '📬 Todos los Emails'}
              </button>
              <button
                onClick={() => handleListEmails(true)}
                disabled={loading || isConfigured === false}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? '📥 Cargando...' : '📫 Solo No Leídos'}
              </button>
            </div>
          </div>

          {/* Test 4 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              4️⃣ Sincronizar Emails
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Sincroniza emails nuevos con Firestore
            </p>
            <button
              onClick={handleSyncEmails}
              disabled={loading || isConfigured === false}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? '🔄 Sincronizando...' : '🔄 Sync Emails'}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📊 Resultado de la Operación
            </h2>
            <div className={`p-4 rounded-md ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Emails List */}
        {emails.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📧 Emails Encontrados ({emails.length})
            </h2>
            <div className="space-y-3">
              {emails.map((email) => (
                <div
                  key={email.messageId}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {email.labels?.includes('UNREAD') && (
                          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                        <h3 className="font-semibold text-gray-900 truncate">
                          {email.subject || '(Sin asunto)'}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        De: <span className="font-medium">{email.from}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(email.date).toLocaleString('es-ES')}
                      </p>
                      {email.body && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {email.body.substring(0, 150)}...
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleViewEmail(email.messageId)}
                        className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors whitespace-nowrap"
                      >
                        👁️ Ver
                      </button>
                      {email.labels?.includes('UNREAD') && (
                        <button
                          onClick={() => handleMarkAsRead(email.messageId)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors whitespace-nowrap"
                        >
                          ✓ Marcar leído
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Email Detail */}
        {selectedEmail && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                📖 Detalle del Email
              </h2>
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
              >
                ✕ Cerrar
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    De:
                  </label>
                  <p className="text-sm text-gray-900">{selectedEmail.from}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Para:
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedEmail.to?.join(', ') || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha:
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedEmail.date).toLocaleString('es-ES')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado:
                  </label>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    selectedEmail.labels?.includes('UNREAD')
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedEmail.labels?.includes('UNREAD') ? 'No leído' : 'Leído'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asunto:
                </label>
                <p className="text-base font-semibold text-gray-900">
                  {selectedEmail.subject || '(Sin asunto)'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contenido:
                </label>
                <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                  {selectedEmail.bodyHtml ? (
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                    />
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedEmail.body || 'Sin contenido'}
                    </p>
                  )}
                </div>
              </div>

              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adjuntos ({selectedEmail.attachments.length}):
                  </label>
                  <div className="space-y-2">
                    {selectedEmail.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                        <span className="text-2xl">📎</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {att.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {att.mimeType} • {(att.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                    🔍 Metadata Técnica
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedEmail, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            📋 Instrucciones de Uso
          </h2>
          <ol className="space-y-2 text-sm text-blue-800">
            <li><strong>1.</strong> Primero verifica la configuración con el botón "Verificar Config"</li>
            <li><strong>2.</strong> Si no está configurado, haz click en "Conectar Cuenta de Gmail" y autoriza el acceso</li>
            <li><strong>3.</strong> Una vez configurado, prueba enviar un email de prueba</li>
            <li><strong>4.</strong> Lista tus emails para ver que la lectura funciona correctamente</li>
            <li><strong>5.</strong> Haz click en "Ver" para ver los detalles completos de un email</li>
            <li><strong>6.</strong> Usa "Sync Emails" para sincronizar emails con Firestore y activar análisis con Gemini</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
