import { redirect } from "next/navigation";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const resolved = await params;
  redirect(`/app/${resolved.tournamentId}/competitors`);
}
