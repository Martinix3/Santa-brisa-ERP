
import OrdersPage from "@/app/(app)/orders/page";

export default function DirectOrdersPage() {
  return <OrdersPage searchParams={{ flow: "DIRECT" }} />;
}
