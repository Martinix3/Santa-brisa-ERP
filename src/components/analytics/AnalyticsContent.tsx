"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { 
  SellOutMetrics, 
  ShopifyMetrics, 
  ForecastData 
} from "@/types/analytics";
import { 
  getSellOutMetrics, 
  getShopifyMetrics, 
  getSalesForecast 
} from "@/server/actions/analytics";

type TabType = 'sellout' | 'shopify' | 'forecast';

export function AnalyticsContent() {
  const [activeTab, setActiveTab] = useState<TabType>('sellout');
  const [sellOutData, setSellOutData] = useState<SellOutMetrics | null>(null);
  const [shopifyData, setShopifyData] = useState<ShopifyMetrics | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load Sell-Out data
  const loadSellOut = async () => {
    setLoading(true);
    const result = await getSellOutMetrics();
    if (result.success && result.data) {
      setSellOutData(result.data);
    } else {
      toast.error(result.error || "Failed to load sell-out data");
    }
    setLoading(false);
  };

  // Load Shopify data
  const loadShopify = async () => {
    setLoading(true);
    const result = await getShopifyMetrics();
    if (result.success && result.data) {
      setShopifyData(result.data);
    } else {
      toast.error(result.error || "Failed to load Shopify data");
    }
    setLoading(false);
  };

  // Load Forecast data
  const loadForecast = async () => {
    setLoading(true);
    const result = await getSalesForecast('next_month');
    if (result.success && result.data) {
      setForecastData(result.data);
    } else {
      toast.error(result.error || "Failed to load forecast");
    }
    setLoading(false);
  };

  // Load data when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'sellout' && !sellOutData) {
      loadSellOut();
    } else if (tab === 'shopify' && !shopifyData) {
      loadShopify();
    } else if (tab === 'forecast' && !forecastData) {
      loadForecast();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">📊 Analytics de Ventas</h1>
        <p className="text-muted-foreground mt-1">
          Análisis de sell-out, online y predicciones con IA
        </p>
      </div>

      {/* Tabs */}
      <div className="sb-tabs">
        <button
          className="sb-tab"
          aria-selected={activeTab === 'sellout'}
          onClick={() => handleTabChange('sellout')}
        >
          📦 Sell-out
        </button>
        <button
          className="sb-tab"
          aria-selected={activeTab === 'shopify'}
          onClick={() => handleTabChange('shopify')}
        >
          🛒 Shopify
        </button>
        <button
          className="sb-tab"
          aria-selected={activeTab === 'forecast'}
          onClick={() => handleTabChange('forecast')}
        >
          🤖 Forecast AI
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {activeTab === 'sellout' && <SellOutTab data={sellOutData} onRefresh={loadSellOut} />}
            {activeTab === 'shopify' && <ShopifyTab data={shopifyData} onRefresh={loadShopify} />}
            {activeTab === 'forecast' && <ForecastTab data={forecastData} onRefresh={loadForecast} />}
          </>
        )}
      </div>
    </div>
  );
}

// Sell-Out Tab Component
function SellOutTab({ 
  data, 
  onRefresh 
}: { 
  data: SellOutMetrics | null; 
  onRefresh: () => void;
}) {
  if (!data) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">No hay datos de sell-out</p>
        <button onClick={onRefresh} className="sb-btn sb-btn--primary">
          Cargar Datos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sb-card-glass-light p-5">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-success" />
            <span className="text-sm text-muted-foreground">Revenue Total</span>
          </div>
          <p className="text-2xl font-bold">€{data.totalRevenue.toLocaleString()}</p>
          {data.growth !== 0 && (
            <p className={`text-sm mt-1 ${data.growth > 0 ? 'text-success' : 'text-destructive'}`}>
              {data.growth > 0 ? '+' : ''}{data.growth}% vs periodo anterior
            </p>
          )}
        </div>

        <div className="sb-card-glass-light p-5">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-5 w-5 text-info" />
            <span className="text-sm text-muted-foreground">Unidades</span>
          </div>
          <p className="text-2xl font-bold">{data.totalUnits.toLocaleString()}</p>
        </div>

        <div className="sb-card-glass-light p-5">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-warning" />
            <span className="text-sm text-muted-foreground">Precio Promedio</span>
          </div>
          <p className="text-2xl font-bold">€{data.avgPrice.toFixed(2)}</p>
        </div>

        <div className="sb-card-glass-light p-5">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-5 w-5 text-accent" />
            <span className="text-sm text-muted-foreground">Productos</span>
          </div>
          <p className="text-2xl font-bold">{data.topProducts.length}</p>
          <p className="text-sm text-muted-foreground mt-1">únicos vendidos</p>
        </div>
      </div>

      {/* Top Products */}
      <div className="sb-card-glass-light p-6">
        <h3 className="font-semibold mb-4">🏆 Top 10 Productos</h3>
        <div className="space-y-3">
          {data.topProducts.map((product, index: number) => (
            <div key={product.productId} className="flex items-center gap-4">
              <span className="text-2xl font-bold text-muted-foreground/30 w-8">
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium">{product.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {product.units} unidades
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">€{product.revenue.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By Distributor */}
      {data.byDistributor.length > 0 && (
        <div className="sb-card-glass-light p-6">
          <h3 className="font-semibold mb-4">📦 Por Distribuidor</h3>
          <div className="space-y-3">
            {data.byDistributor.map((dist) => (
              <div key={dist.distributorId} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium">{dist.distributorName}</p>
                  <p className="text-sm text-muted-foreground">
                    {dist.units} unidades
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">€{dist.revenue.toLocaleString()}</p>
                  {dist.growth !== 0 && (
                    <p className={`text-sm ${dist.growth > 0 ? 'text-success' : 'text-destructive'}`}>
                      {dist.growth > 0 ? '+' : ''}{dist.growth}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Shopify Tab Component
function ShopifyTab({ 
  data, 
  onRefresh 
}: { 
  data: ShopifyMetrics | null; 
  onRefresh: () => void;
}) {
  if (!data) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">No hay datos de Shopify</p>
        <button onClick={onRefresh} className="sb-btn sb-btn--primary">
          Cargar Datos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sb-card-glass-light p-5">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-5 w-5 text-info" />
            <span className="text-sm text-muted-foreground">Pedidos</span>
          </div>
          <p className="text-2xl font-bold">{data.totalOrders.toLocaleString()}</p>
        </div>

        <div className="sb-card-glass-light p-5">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-success" />
            <span className="text-sm text-muted-foreground">Revenue</span>
          </div>
          <p className="text-2xl font-bold">€{data.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="sb-card-glass-light p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            <span className="text-sm text-muted-foreground">AOV</span>
          </div>
          <p className="text-2xl font-bold">€{data.avgOrderValue.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">Average Order Value</p>
        </div>

        <div className="sb-card-glass-light p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-warning" />
            <span className="text-sm text-muted-foreground">Conversión</span>
          </div>
          <p className="text-2xl font-bold">{data.conversionRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Placeholder message */}
      <div className="sb-card-glass-light p-6 text-center">
        <p className="text-muted-foreground">
          Integración Shopify en desarrollo. Los datos se mostrarán aquí próximamente.
        </p>
      </div>
    </div>
  );
}

// Forecast Tab Component
function ForecastTab({ 
  data, 
  onRefresh 
}: { 
  data: ForecastData | null; 
  onRefresh: () => void;
}) {
  if (!data) {
    return (
      <div className="text-center py-12">
        <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">No hay forecast generado</p>
        <button onClick={onRefresh} className="sb-btn sb-btn--primary">
          <Sparkles className="h-4 w-4" />
          Generar Forecast con IA
        </button>
      </div>
    );
  }

  const trendIcon = data.trend === 'growing' ? '📈' : data.trend === 'declining' ? '📉' : '➡️';
  const trendColor = data.trend === 'growing' ? 'text-success' : data.trend === 'declining' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="space-y-6">
      {/* Forecast KPI */}
      <div className="sb-card-glass-light p-6 border-l-4 border-accent">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm text-muted-foreground">Predicción {data.period === 'next_month' ? 'Próximo Mes' : 'Próximo Trimestre'}</span>
            </div>
            <p className="text-3xl font-bold">€{data.predictedRevenue.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <div className={`flex items-center gap-2 ${trendColor}`}>
              <span className="text-2xl">{trendIcon}</span>
              <span className="font-semibold capitalize">{data.trend}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Confianza: {data.confidence}%
            </p>
          </div>
        </div>
      </div>

      {/* Factors */}
      {data.factors.length > 0 && (
        <div className="sb-card-glass-light p-6">
          <h3 className="font-semibold mb-4">📊 Factores de Análisis</h3>
          <div className="space-y-3">
            {data.factors.map((factor, index: number) => {
              const impactIcon = factor.impact === 'positive' ? '🟢' : factor.impact === 'negative' ? '🔴' : '🟡';
              return (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                  <span className="text-xl">{impactIcon}</span>
                  <div>
                    <p className="font-medium">{factor.name}</p>
                    <p className="text-sm text-muted-foreground">{factor.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="sb-card-glass-light p-6">
          <h3 className="font-semibold mb-4">💡 Recomendaciones de IA</h3>
          <div className="space-y-3">
            {data.recommendations.map((rec, index: number) => {
              const priorityColor = 
                rec.priority === 'high' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                rec.priority === 'medium' ? 'bg-warning/10 text-warning border-warning/20' :
                'bg-info/10 text-info border-info/20';
              
              return (
                <div key={index} className="p-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${priorityColor}`}>
                      {rec.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-medium mb-1">{rec.action}</p>
                  <p className="text-sm text-muted-foreground">
                    Impacto estimado: {rec.estimatedImpact}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Refresh button */}
      <div className="flex justify-center">
        <button onClick={onRefresh} className="sb-btn sb-btn--ghost">
          <Sparkles className="h-4 w-4" />
          Regenerar Forecast
        </button>
      </div>
    </div>
  );
}
