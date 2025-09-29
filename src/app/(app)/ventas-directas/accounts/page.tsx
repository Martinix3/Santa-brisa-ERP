
import AccountsPage from "@/app/(app)/accounts/page";
export default function DirectAccounts() {
  return <AccountsPage searchParams={{ flow: "DIRECT" }} />;
}
