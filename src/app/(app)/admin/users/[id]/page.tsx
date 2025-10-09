import { UserDetailPage } from "@/features/admin/components/UserDetailPage";

type Props = {
  params: { id: string };
};

export default function UserDetailRoute({ params }: Props) {
  return <UserDetailPage userId={params.id} />;
}
