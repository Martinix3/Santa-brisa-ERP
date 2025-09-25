// scripts/apply-sb-consistency.ts
import { Project, SyntaxKind, QuoteKind, JsxAttribute, JsxOpeningElement, JsxSelfClosingElement } from "ts-morph";
import { globby } from "globby";

const getAttrName = (a: JsxAttribute) => a.getNameNode().getText();

function ensureClass(el: JsxOpeningElement | JsxSelfClosingElement, token: string) {
  const attrs = el.getAttributes().filter((a): a is JsxAttribute => a.getKind() === SyntaxKind.JsxAttribute);
  const cls = attrs.find(a => getAttrName(a) === "className");
  if (!cls) {
    el.addAttribute({ name: "className", initializer: `"${token}"` });
    return true;
  }
  const init = cls.getInitializer();
  if (!init) {
    cls.setInitializer(`"${token}"`);
    return true;
  }
  const txt = init.getText();
  // Si es string literal, concatenamos
  if (/^["'`].*["'`]$/.test(txt)) {
    const quote = txt[0];
    const body = txt.slice(1, -1);
    cls.setInitializer(`${quote}${body} ${token}${quote}`);
  } else {
    // Expresión: interpolamos
    cls.setInitializer("`" + token + " ${" + txt + "}`");
  }
  return true;
}

(async () => {
  const project = new Project({
    tsConfigFilePath: "tsconfig.json",
    manipulationSettings: { quoteKind: QuoteKind.Double },
  });

  const files = await globby(["src/**/*.{ts,tsx}"]);
  files.forEach(f => project.addSourceFileAtPath(f));

  let touched = 0;

  for (const sf of project.getSourceFiles()) {
    let local = 0;

    // Recorre todos los elementos JSX
    sf.forEachDescendant(n => {
      const el =
        n.asKind(SyntaxKind.JsxOpeningElement) ??
        n.asKind(SyntaxKind.JsxSelfClosingElement);
      if (!el) return;

      const tag = el.getTagNameNode().getText();
      const attrs = el.getAttributes().filter((a): a is JsxAttribute => a.getKind() === SyntaxKind.JsxAttribute);

      // 1) Botones: añade sb-btn-primary si no está
      if (tag === "button") {
        const hasSB = attrs.some(a => getAttrName(a) === "className" && /sb-btn-primary/.test(a.getInitializer()?.getText() || ""));
        if (!hasSB) { if (ensureClass(el, "sb-btn-primary")) local++; }
      }

      // 2) Iconos (heurística): componentes PascalCase con props típicas de icono
      const looksIcon =
        /^[A-Z][A-Za-z0-9]+$/.test(tag) &&
        attrs.some(a => ["size", "strokeWidth"].includes(getAttrName(a))) ||
        /lucide|icon/i.test(tag);

      if (looksIcon) {
        const hasIcon = attrs.some(a => getAttrName(a) === "className" && /sb-icon/.test(a.getInitializer()?.getText() || ""));
        if (!hasIcon) { if (ensureClass(el, "sb-icon")) local++; }
      }

      // 3) Charts Recharts: añade stroke/grid por defecto si faltan
      if (tag === "CartesianGrid" && !attrs.some(a => getAttrName(a) === "stroke")) {
        el.addAttribute({ name: "stroke", initializer: "{SB_THEME.chart.grid}" });
        local++;
      }
      if (tag === "Line" && !attrs.some(a => getAttrName(a) === "stroke")) {
        el.addAttribute({ name: "stroke", initializer: "{SB_THEME.chart.line[0]}" });
        local++;
      }
    });

    // Asegura import de SB_THEME si tocamos algo de charts
    if (local) {
      const imp = sf.getImportDeclaration(d => d.getModuleSpecifierValue() === "@/domain/SB_COLORS");
      if (!imp) {
        sf.addImportDeclaration({ moduleSpecifier: "@/domain/SB_COLORS", namedImports: ["SB_THEME"] });
      } else if (!imp.getNamedImports().some(n => n.getName() === "SB_THEME")) {
        imp.addNamedImport("SB_THEME");
      }
      await sf.save();
      touched += local;
    }
  }

  console.log(`✅ Hecho. Cambios aplicados: ${touched}`);
})();
