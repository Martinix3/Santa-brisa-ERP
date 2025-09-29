
import Logistics from "@/app/(app)/warehouse/logistics/page";
export default function DirectLogistics() {
  return <Logistics searchParams={{ flow: "DIRECT" }} />;
}
