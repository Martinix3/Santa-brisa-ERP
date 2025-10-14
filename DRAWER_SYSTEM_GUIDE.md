# 🎯 Sistema de Drawer Global con Plugins

## 📋 Arquitectura Implementada

### **Componentes Creados:**

```
src/
├── components/drawers/
│   └── EntityDrawerShell.tsx          # Shell reutilizable con animación
├── modules/
│   └── drawer.registry.tsx            # Sistema de registro de plugins
├── app/(app)/
│   ├── layout.tsx                     # Layout con slot @drawer
│   └── @drawer/                       # Parallel route
│       ├── default.tsx                # Estado vacío
│       └── (.)contacts/[id]/
│           └── page.tsx               # Ejemplo interceptado
```

---

## 🎨 EntityDrawerShell

**Características:**
- ✅ Animación responsive (mobile: bottom-sheet, desktop: sidebar)
- ✅ Backdrop con blur
- ✅ Secciones: Header, Actions, Tabs, Content, Footer
- ✅ Router.back() automático
- ✅ Bloquea scroll del body

**Uso:**
```tsx
<EntityDrawerShell
  title="Título"
  subtitle="Subtítulo (opcional)"
  actions={<div>Botones de acción</div>}
  tabs={<div>Tabs de navegación</div>}
  footer={<div>Footer con botones</div>}
  onClose={() => router.back()} // opcional
>
  {/* Contenido del drawer */}
</EntityDrawerShell>
```

---

## 🔌 Sistema de Plugins

### **Registro de Plugins:**

```tsx
// modules/my-module/contact.drawer.plugin.tsx
import { register } from "@/modules/drawer.registry";

register({
  id: "contact-quick-actions",
  when: (ctx) => ctx.module === "contacts" && ctx.entity === "contact",
  actions: (props) => (
    <div className="flex gap-2">
      <button>Llamar</button>
      <button>Email</button>
    </div>
  ),
  tabs: (props) => (
    <div className="flex gap-4">
      <button>Detalles</button>
      <button>Actividad</button>
    </div>
  ),
  content: (props) => (
    <div>Contenido adicional del plugin</div>
  ),
  footer: (props) => (
    <div>Footer del plugin</div>
  ),
});
```

### **Resolver Plugins:**

```tsx
import { resolve } from "@/modules/drawer.registry";

const ctx = {
  module: "contacts",
  path: "/contacts/123",
  entity: "contact",
  id: "123",
};

const plugins = resolve(ctx);
// Renderizar: plugins.map(p => p.actions?.(props))
```

---

## 🚀 Parallel Routes (@drawer)

### **Estructura:**
```
app/(app)/
├── @drawer/
│   ├── default.tsx              # null (sin drawer)
│   └── (.)contacts/[id]/
│       └── page.tsx             # Intercepta /contacts/[id]
```

### **Cómo Funciona:**

1. **Usuario navega** a `/contacts/123`
2. **Next.js intercepta** con `(.)contacts/[id]/page.tsx`
3. **Renderiza** en el slot `drawer` del layout
4. **Página de fondo** no cambia
5. **Router.back()** cierra el drawer

---

## 📱 Animación Responsive

### **Mobile (< md):**
```tsx
// Bottom-sheet desde abajo
initial={{ y: "100%" }}
animate={{ y: 0 }}
exit={{ y: "100%" }}
```

### **Desktop (>= md):**
```tsx
// Sidebar desde la derecha
className="md:right-0 md:w-[560px]"
// La animación y:"100%" no afecta en desktop
```

---

## 🎯 Ejemplo Completo: Contact Drawer

```tsx
// app/(app)/@drawer/(.)contacts/[id]/page.tsx
"use client";

import { EntityDrawerShell } from "@/components/drawers/EntityDrawerShell";
import { resolve } from "@/modules/drawer.registry";

export default function ContactDrawer({ params }: { params: { id: string } }) {
  const ctx = {
    module: "contacts",
    path: `/contacts/${params.id}`,
    entity: "contact",
    id: params.id,
  };
  
  const plugins = resolve(ctx);

  return (
    <EntityDrawerShell
      title={`Contacto #${params.id}`}
      subtitle="Vista rápida"
      actions={
        <>
          {/* Acciones base */}
          <button>Editar</button>
          {/* Acciones de plugins */}
          {plugins.map(p => p.actions?.({ ...ctx }))}
        </>
      }
      tabs={
        <>
          <button>Detalles</button>
          {plugins.map(p => p.tabs?.({ ...ctx }))}
        </>
      }
      footer={
        <>
          <button>Guardar</button>
          {plugins.map(p => p.footer?.({ ...ctx }))}
        </>
      }
    >
      {/* Contenido base */}
      <div>Información del contacto</div>
      
      {/* Contenido de plugins */}
      {plugins.map(p => p.content?.({ ...ctx }))}
    </EntityDrawerShell>
  );
}
```

---

## 🔧 Crear Nuevos Drawers Interceptados

### **Paso 1: Crear la intercepción**
```
app/(app)/@drawer/(.)ventas/pedidos/[id]/page.tsx
```

### **Paso 2: Implementar el drawer**
```tsx
export default function OrderDrawer({ params }) {
  return (
    <EntityDrawerShell title={`Pedido #${params.id}`}>
      {/* Tu contenido */}
    </EntityDrawerShell>
  );
}
```

### **Paso 3: (Opcional) Crear plugins**
```tsx
// modules/sales/order.drawer.plugin.tsx
register({
  id: "order-shipping-info",
  when: (ctx) => ctx.entity === "order",
  content: (props) => <ShippingInfo orderId={props.id} />,
});
```

---

## ✅ Ventajas del Sistema

1. **Reutilizable**: Un shell para todos los drawers
2. **Extensible**: Sistema de plugins modular
3. **Responsive**: Mobile y desktop optimizados
4. **No bloquea navegación**: Páginas siguen siendo accesibles directamente
5. **SEO-friendly**: URLs reales `/contacts/123`
6. **Animado**: Transiciones suaves

---

## 🚀 Próximos Pasos

1. **Crear más drawers** para otras entidades (pedidos, productos, etc)
2. **Implementar plugins** específicos por módulo
3. **Fetch de datos** reales en los drawers
4. **Optimizar** con React.Suspense para loading states
5. **Agregar teclado** shortcuts (Esc para cerrar)

---

## 📚 Referencias

- [Next.js Parallel Routes](https://nextjs.org/docs/app/building-your-application/routing/parallel-routes)
- [Next.js Intercepting Routes](https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes)
- [Framer Motion](https://www.framer.com/motion/)
