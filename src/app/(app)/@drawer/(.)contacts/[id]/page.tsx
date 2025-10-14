import { getContactDetail } from "@/app/(app)/contacts/actions";
import ContactDrawer from "@/components/drawers/ContactDrawer";

export default async function DrawerContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getContactDetail(id);

  console.log('🔍 Drawer data:', { id, detail });

  if (!detail) {
    return null;
  }

  return <ContactDrawer detail={detail} contactId={id} />;
}
