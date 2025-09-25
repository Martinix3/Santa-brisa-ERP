// scripts/apply-sb-consistency.ts
import {
    Project, SyntaxKind, QuoteKind,
    JsxAttribute, JsxOpeningElement, JsxSelfClosingElement,
    Node, StringLiteral, JsxExpression
  } from "ts-morph";
  import { globby } from "globby";
  
  const getAttrName = (a: JsxAttribute) => a.getNameNode().getText();
  
  function safeEnsureClass(
    el: JsxOpeningElement | JsxSelfClosingElement,
    token: string
  ) {
    const attrs = el.getAttributes().filter((a): a is JsxAttribute => a.getKind() === SyntaxKind.JsxAttribute);
    const cls = attrs.find(a => getAttrName(a) === "className");
  
    // sin className → lo creamos
    if (!cls) { el.addAttribute({ name: "className", initializer: `"${token}"` }); return true; }
  
    const init = cls.getInitializer();
    if (!init) { cls.setInitializer(`"${token}"`); return true; }
  
    // className="literal"
    if (init.getKind() === SyntaxKind.StringLiteral) {
      const lit = init as StringLiteral;
      const val = lit.getLiteralText();
      cls.setInitializer(`"${[token, val].filter(Boolean).join(" ")}"`);
      return true;
    }
  
    // className={ ... }  → solo si es string/template simple
    if (init.getKind() === SyntaxKind.JsxExpression) {
      const jsx = init as JsxExpression;
      const expr = jsx.getExpression();
      if (!expr) { cls.setInitializer(`"${token}"`); return true; }
  
      if (Node.isStringLiteral(expr) || Node.isNoSubstitutionTemplateLiteral(expr)) {
        const val = expr.getLiteralText();
        // reemplazamos TODO el initializer por un template literal limpio
        cls.setInitializer("`" + [token, val].filter(Boolean).join(" ") + "`");
        return true;
      }
  
      // expresión compleja → no tocar (evitamos romper JSX)
      return false;
    }
  
    // otros casos → no tocar
    return false;
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
  
      sf.forEachDescendant(n => {
        const el = n.asKind(SyntaxKind.JsxOpeningElement) ?? n.asKind(SyntaxKind.JsxSelfClosingElement);
        if (!el) return;
  
        const tag = el.getTagNameNode().getText();
        const attrs = el.getAttributes().filter((a): a is JsxAttribute => a.getKind() === SyntaxKind.JsxAttribute);
  
        // 1) botones
        if (tag === "button") {
          const has = attrs.some(a => getAttrName(a) === "className" && /sb-btn-primary/.test(a.getInitializer()?.getText() || ""));
          if (!has) local += Number(safeEnsureClass(el, "sb-btn-primary"));
        }
  
        // 2) iconos (heurística Lucide)
        const looksIcon =
          ((/^[A-Z][A-Za-z0-9]+$/.test(tag) &&
            attrs.some(a => ["size","strokeWidth"].includes(getAttrName(a)))) ||
           /lucide|icon/i.test(tag));
        if (looksIcon) {
          const has = attrs.some(a => getAttrName(a) === "className" && /sb-icon/.test(a.getInitializer()?.getText() || ""));
          if (!has) local += Number(safeEnsureClass(el, "sb-icon"));
        }
  
        // 3) Recharts defaults
        if (tag === "CartesianGrid" && !attrs.some(a => getAttrName(a) === "stroke")) {
          el.addAttribute({ name: "stroke", initializer: "{SB_THEME.chart.grid}" }); local++;
        }
        if (tag === "Line" && !attrs.some(a => getAttrName(a) === "stroke")) {
          el.addAttribute({ name: "stroke", initializer: "{SB_THEME.chart.line[0]}" }); local++;
        }
      });
  
      if (local) {
        // asegura import desde '@/domain/ssot' (donde añadiste SB_THEME)
        const imp = sf.getImportDeclaration(d => d.getModuleSpecifierValue() === "@/domain/ssot");
        if (!imp) {
          sf.addImportDeclaration({ moduleSpecifier: "@/domain/ssot", namedImports: ["SB_THEME"] });
        } else if (!imp.getNamedImports().some(n => n.getName() === "SB_THEME")) {
          imp.addNamedImport("SB_THEME");
        }
        await sf.save();
        touched += local;
      }
    }
  
    console.log(`✅ Hecho. Cambios aplicados: ${touched}`);
  })();
  