"use client";

export default function BracketsPage({
  params,
}: {
  params: { tournamentId: string };
}) {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Chaves</h1>
      <p>Chaves do torneio {params.tournamentId}</p>
    </div>
  );
}
