// src/components/ui/index.ts
// Barrel file — Santa Brisa UI
// Importa todo desde aquí:  import { SBCard, SBDialog, ... } from "@/components/ui";

export * from "./ui-primitives";

export { SBDialog } from "./SBDialog";
export { SBTabs } from "./SBTabs";
export { SBTooltip } from "./SBTooltip";
export { SBPopover } from "./SBPopover";

export { SBIcon } from "./SBIcon";
export { useSBToast } from "./SBToast";
export { SBDatePicker } from "./SBDatePicker";

export { getSBChartTheme } from "./charts/theme";
export { SBLineChart } from "./charts/SBLineChart";
export { SBBarChart } from "./charts/SBBarChart";
export { SBSparkline } from "./charts/SBSparkline";
