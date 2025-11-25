import { redirect } from "next/navigation";

export default function TournamentPage({
  params,
}: {
  params: { tournamentId: string };
}) {
  redirect(`/app/${params.tournamentId}/competitors`);
}
