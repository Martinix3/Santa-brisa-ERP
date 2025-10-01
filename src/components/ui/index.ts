// Barrel file — Santa Brisa UI
// Importa todo desde aquí:  import { SBCard, SBDialog, SBIcon, SBLineChart, ... } from "@/components/ui";

export * from "./ui-primitives";

export { SBDialog, SBDialogContent } from "./SBDialog";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
export { SBTooltip } from "./SBTooltip";
export { SBPopover } from "./SBPopover";
export { default as KpiCard } from './KpiCard';

export { SBIcon } from "./SBIcon";
export { useSBToast } from "./SBToast";
export { SBDatePicker } from "./SBDatePicker";

export { getSBChartTheme } from "./charts/theme";
export { SBLineChart } from "./charts/SBLineChart";
export { SBBarChart } from "./charts/SBBarChart";
export { SBSparkline } from "./charts/SBSparkline";

// Exportaciones que faltaban
export { ModuleHeader } from './ModuleHeader';
export { FilterSelect } from './FilterSelect';
