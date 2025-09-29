
import OrdersPage from "@/app/(app)/orders/page";

export default function PlacementOrdersPage() {
  return <OrdersPage searchParams={{ flow: "PLACEMENT" }} />;
}
