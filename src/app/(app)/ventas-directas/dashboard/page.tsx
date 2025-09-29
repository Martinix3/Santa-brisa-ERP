
import SalesDashboard from "@/app/(app)/dashboard-ventas/page";

export default function DirectDashboard() {
  return <SalesDashboard searchParams={{ flow: "DIRECT" }} />;
}
