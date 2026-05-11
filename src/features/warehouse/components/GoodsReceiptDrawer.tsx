"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React, { useState, useEffect } from "react";
import { useData } from "@/lib/dataprovider";
import { SBButton, Input, Textarea } from "@/components/ui/ui-primitives";
import { generateReceiptNumber } from "@/lib/warehouse-generators";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createGoodsReceiptFromSchema } from "@/server/actions/warehouse.actions";
import { 
  createWarehouseSupplier, 
  getWarehouseSuppliers,
  createWarehouseProduct,
  getWarehouseProducts 
} from "@/server/actions/warehouse-suppliers";
import { Plus, X, Package } from "lucide-react";
import { CategorySelector } from "@/components/warehouse/CategorySelector";
import { PhotoUploadButton } from "@/components/warehouse/PhotoUploadButton";
import { ProductSearchCombobox, type WarehouseProduct } from "@/components/warehouse/ProductSearchCombobox";
import { SupplierSearchCombobox, type WarehouseSupplier } from "@/components/warehouse/SupplierSearchCombobox";
import type { GoodsReceiptCategory } from "@/domain/ssot";
import type { PhotoFile } from "@/components/warehouse/PhotoUploadButton";
import { uploadMultipleFiles, generateGoodsReceiptPhotoPath } from "@/lib/firebase-storage";

interface ReceiptLine {
  id: string;
  productId?: string;
  category: GoodsReceiptCategory;
  sku?: string;
  receivedQty: number;
  uom: string;
  unitCost?: number;
  supplierLotNumber?: string;
  internalLot?: string;
  photos: PhotoFile[];
}

interface GoodsReceiptDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (receiptId: string) => void;
}

/**
 * Custom Goods Receipt Drawer with Visual Components
 * Features:
 * - Zero hardcoding
 * - Visual mobile-first components
 * - Photo upload per line
 * - Auto-generation of SKU and lot numbers
 */
export function GoodsReceiptDrawer({
  open,
  onOpenChange,
  onSuccess,
}: GoodsReceiptDrawerProps) {
  const { data } = useData();
  const router = useRouter();
  const items = data?.items || [];
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptNumber] = useState(generateReceiptNumber());
  const [selectedSupplier, setSelectedSupplier] = useState<WarehouseSupplier | null>(null);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ReceiptLine[]>([]);
  
  // Suppliers and products from Firestore
  const [suppliers, setSuppliers] = useState<WarehouseSupplier[]>([]);
  const [products, setProducts] = useState<WarehouseProduct[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Create new supplier/product modals
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductSKU, setNewProductSKU] = useState("");
  const [newProductCategory, setNewProductCategory] = useState<GoodsReceiptCategory>("raw");
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Load suppliers and products on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const [suppliersResult, productsResult] = await Promise.all([
          getWarehouseSuppliers(),
          getWarehouseProducts(),
        ]);

        if (suppliersResult.success) {
          setSuppliers(suppliersResult.suppliers);
        } else {
          console.error("Error loading suppliers:", suppliersResult.error);
        }

        if (productsResult.success) {
          setProducts(productsResult.products as any);
        } else {
          console.error("Error loading products:", productsResult.error);
        }
      } catch (error) {
        console.error("Error loading warehouse data:", error);
        toast.error("Error al cargar datos del almacén");
      } finally {
        setLoadingData(false);
      }
    };

    if (open) {
      loadData();
    }
  }, [open]);

  const addLine = () => {
    const newLine: ReceiptLine = {
      id: Math.random().toString(36).substr(2, 9),
      category: "raw",
      receivedQty: 0,
      uom: "kg",
      unitCost: 0,
      photos: [] as PhotoFile[],
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, updates: Partial<ReceiptLine>) => {
    setLines(lines.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupplier) {
      toast.error("Debes seleccionar un proveedor");
      return;
    }
    
    if (lines.length === 0) {
      toast.error("Debes añadir al menos una línea");
      return;
    }
    
    // Validate lines
    const invalidLines = lines.filter(l => !l.category || l.receivedQty <= 0);
    if (invalidLines.length > 0) {
      toast.error("Todas las líneas deben tener categoría y cantidad");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // STEP 1: Upload all photos to Firebase Storage
      toast.loading("Subiendo fotos a Firebase Storage...");
      
      const linesWithUploadedPhotos = await Promise.all(
        lines.map(async (line, index: number) => {
          if (line.photos.length === 0) {
            return {
              ...line,
              uploadedPhotoUrls: [],
            };
          }

          // Generate storage path for this line's photos
          const storagePath = generateGoodsReceiptPhotoPath(receiptNumber, index);
          
          // Upload all files for this line
          const files = line.photos.map(p => p.file);
          const { urls, errors } = await uploadMultipleFiles(files, storagePath);

          if (errors.length > 0) {
            console.warn(`Errors uploading photos for line ${index}:`, errors);
          }

          return {
            ...line,
            uploadedPhotoUrls: urls,
          };
        })
      );

      toast.dismiss();
      toast.loading("Creando recepción...");

      // STEP 2: Create goods receipt with uploaded photo URLs
      const formData = {
        id: Math.random().toString(36).substr(2, 9),
        receiptNumber,
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        deliveryNote,
        receivedAt: new Date(),
        receivedBy: "", // Server will populate from Firebase Auth
        status: "qc_hold" as const,
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
        lines: linesWithUploadedPhotos.map(line => {
          // Find product details if productId is set
          const product = line.productId ? products.find(p => p.id === line.productId) : null;
          
          return {
            sku: line.sku || "",
            internalLot: line.internalLot || "",
            category: line.category,
            quantity: line.receivedQty,
            uom: line.uom,
            unitCost: line.unitCost || 0,
            qcStatus: "qc_hold" as const,
            supplierLotNumber: line.supplierLotNumber,
            photos: line.uploadedPhotoUrls || [],
            // Add product name for better tracking
            productName: product?.name || "",
          };
        }),
      };

      const result = await createGoodsReceiptFromSchema(formData as any);

      toast.dismiss();

      if (result.success) {
        toast.success(`Recepción ${receiptNumber} creada exitosamente`);
        onSuccess?.(result.receiptId);
        onOpenChange(false);
        
        // Reset form
        setSelectedSupplier(null);
        setDeliveryNote("");
        setNotes("");
        setLines([]);
        
        router.refresh();
      } else {
        toast.error(result.error || "Error al crear la recepción");
      }
    } catch (error: any) {
      console.error("Error creating goods receipt:", error);
      toast.dismiss();
      toast.error(error.message || "Error inesperado al crear la recepción");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div 
        className="bg-background w-full sm:max-w-4xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Nueva Recepción de Mercancía</h2>
            <p className="text-sm text-muted-foreground">
              Número: <span className="font-mono font-medium">{receiptNumber}</span>
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-secondary rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Supplier Section */}
            <div className="sb-card">
              <div className="sb-card__header">
                <h3 className="sb-card__title">Datos del Proveedor</h3>
              </div>
              <div className="sb-card__content space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SupplierSearchCombobox
                      suppliers={suppliers}
                      value={selectedSupplier}
                      onChange={setSelectedSupplier}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewSupplierModal(true)}
                    className="h-12 px-4 rounded-lg border-2 border-dashed border-primary
                             text-primary font-medium hover:bg-primary/10 transition-colors
                             flex items-center gap-2"
                    title="Crear nuevo proveedor"
                  >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Nuevo</span>
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Número de Albarán
                  </label>
                  <Input
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="Ej: ALB-2025-001"
                  />
                </div>
              </div>
            </div>

            {/* Lines Section */}
            <div className="sb-card">
              <div className="sb-card__header">
                <h3 className="sb-card__title">Líneas de Recepción</h3>
                <SBButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={addLine}
                >
                  <Plus size={14} /> Añadir Línea
                </SBButton>
              </div>
              <div className="sb-card__content space-y-4">
                {lines.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay líneas añadidas</p>
                    <p className="text-xs">Click en &quot;Añadir Línea&quot; para empezar</p>
                  </div>
                ) : (
                  lines.map((line, index: number) => (
                    <div key={line.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Línea {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Product Search */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <ProductSearchCombobox
                            products={products}
                            value={products.find(p => p.id === line.productId) || null}
                            onChange={(product) => {
                              if (product) {
                                updateLine(line.id, {
                                  productId: product.id,
                                  sku: product.sku,
                                  category: product.category,
                                });
                              }
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowNewProductModal(true)}
                          className="h-12 px-4 rounded-lg border-2 border-dashed border-primary
                                   text-primary font-medium hover:bg-primary/10 transition-colors
                                   flex items-center gap-2"
                          title="Crear nuevo producto"
                        >
                          <Plus size={18} />
                          <span className="hidden sm:inline">Nuevo</span>
                        </button>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Categoría <span className="text-destructive">*</span>
                        </label>
                        <CategorySelector
                          value={line.category}
                          onChange={(category: string) => updateLine(line.id, { category: category as GoodsReceiptCategory })}
                        />
                      </div>

                      {/* Quantity, UOM & Unit Cost */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Cantidad <span className="text-destructive">*</span>
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.receivedQty || ""}
                            onChange={(e) => updateLine(line.id, { receivedQty: parseFloat(e.target.value) || 0 })}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Unidad</label>
                          <Input
                            value={line.uom}
                            onChange={(e) => updateLine(line.id, { uom: e.target.value })}
                            placeholder="kg, L, unidades..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Costo/U (€)</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitCost || ""}
                            onChange={(e) => updateLine(line.id, { unitCost: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Supplier Lot Number */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Lote del Proveedor
                        </label>
                        <Input
                          value={line.supplierLotNumber || ""}
                          onChange={(e) => updateLine(line.id, { supplierLotNumber: e.target.value })}
                          placeholder="Número de lote del albarán"
                        />
                      </div>

                      {/* Photo/PDF Upload */}
                      <div>
                        <PhotoUploadButton
                          photos={line.photos}
                          onChange={(photos: PhotoFile[]) => updateLine(line.id, { photos })}
                          maxPhotos={3}
                          label="Fotos y Documentos"
                          helperText="Fotos del producto o PDFs del albarán (máx. 3)"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="sb-card">
              <div className="sb-card__header">
                <h3 className="sb-card__title">Notas Adicionales</h3>
              </div>
              <div className="sb-card__content">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones sobre la recepción..."
                  rows={3}
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
              <p className="text-sm text-info">
                <strong>Estado Automático:</strong> Esta recepción se creará en estado &quot;QC Hold&quot; (Retenido en Control de Calidad). 
                El stock no estará disponible hasta que el departamento de Calidad lo libere.
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-secondary/30">
          <SBButton
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </SBButton>
          <SBButton
            type="submit"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || lines.length === 0}
          >
            {isSubmitting ? "Creando..." : "Crear Recepción"}
          </SBButton>
        </div>

        {/* New Supplier Modal */}
        {showNewSupplierModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setShowNewSupplierModal(false)}>
            <div className="bg-background p-6 rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Crear Nuevo Proveedor</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre del Proveedor *</label>
                  <Input
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Ej: Proveedor S.L."
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <SBButton
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewSupplierModal(false);
                      setNewSupplierName("");
                    }}
                  >
                    Cancelar
                  </SBButton>
                  <SBButton
                    type="button"
                    variant="primary"
                    onClick={async () => {
                      if (!newSupplierName.trim()) {
                        toast.error("Debes ingresar un nombre");
                        return;
                      }

                      setIsCreatingSupplier(true);
                      try {
                        const result = await createWarehouseSupplier(newSupplierName.trim());
                        
                        if (result.success && result.supplier) {
                          const newSupplier: WarehouseSupplier = {
                            id: result.supplier.id,
                            name: result.supplier.name,
                          };
                          setSuppliers([...suppliers, newSupplier]);
                          setSelectedSupplier(newSupplier);
                          setShowNewSupplierModal(false);
                          setNewSupplierName("");
                          toast.success(`Proveedor "${newSupplier.name}" creado`);
                        } else {
                          toast.error(result.error || "Error al crear proveedor");
                        }
                      } catch (error: any) {
                        console.error("Error creating supplier:", error);
                        toast.error(error.message || "Error al crear proveedor");
                      } finally {
                        setIsCreatingSupplier(false);
                      }
                    }}
                    disabled={!newSupplierName.trim() || isCreatingSupplier}
                  >
                    {isCreatingSupplier ? "Creando..." : "Crear"}
                  </SBButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Product Modal */}
        {showNewProductModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setShowNewProductModal(false)}>
            <div className="bg-background p-6 rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Crear Nuevo Producto</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre del Producto *</label>
                  <Input
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="Ej: Materia Prima X"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SKU (Opcional)</label>
                  <Input
                    value={newProductSKU}
                    onChange={(e) => setNewProductSKU(e.target.value)}
                    placeholder="Se generará automáticamente si no se especifica"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Categoría *</label>
                  <CategorySelector
                    value={newProductCategory}
                    onChange={(category: string) => setNewProductCategory(category as GoodsReceiptCategory)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <SBButton
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewProductModal(false);
                      setNewProductName("");
                      setNewProductSKU("");
                    }}
                  >
                    Cancelar
                  </SBButton>
                  <SBButton
                    type="button"
                    variant="primary"
                    onClick={async () => {
                      if (!newProductName.trim()) {
                        toast.error("Debes ingresar un nombre");
                        return;
                      }

                      setIsCreatingProduct(true);
                      try {
                        const result = await createWarehouseProduct(
                          newProductName.trim(),
                          newProductSKU.trim() || undefined,
                          newProductCategory
                        );
                        
                        if (result.success && result.product) {
                          const newProduct: WarehouseProduct = {
                            id: result.product.id,
                            sku: result.product.sku,
                            name: result.product.name,
                            category: newProductCategory,
                            stock: 0,
                            unit: "kg",
                          };
                          setProducts([...products, newProduct]);
                          setShowNewProductModal(false);
                          setNewProductName("");
                          setNewProductSKU("");
                          setNewProductCategory("raw");
                          toast.success(`Producto "${newProduct.name}" creado con SKU: ${result.product.sku}`);
                        } else {
                          toast.error(result.error || "Error al crear producto");
                        }
                      } catch (error: any) {
                        console.error("Error creating product:", error);
                        toast.error(error.message || "Error al crear producto");
                      } finally {
                        setIsCreatingProduct(false);
                      }
                    }}
                    disabled={!newProductName.trim() || isCreatingProduct}
                  >
                    {isCreatingProduct ? "Creando..." : "Crear"}
                  </SBButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
