
import CashflowLayout from "@/app/(app)/cashflow/layout";
import CashflowDashboardPage from "@/app/(app)/cashflow/dashboard/page";

export default function DirectCashflow() {
  // Nota: Cashflow tiene su propio layout, así que envolvemos el dashboard
  // para mantener la consistencia visual del módulo.
  return (
    <CashflowLayout>
      <CashflowDashboardPage />
    </CashflowLayout>
  );
}
