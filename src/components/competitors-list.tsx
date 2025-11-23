"use client";

import { Competitor } from "@prisma/client";
import { useEffect, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface CompetitorsListProps {
  tournamentId: string;
  refreshKey: number;
}

export function CompetitorsList({
  tournamentId,
  refreshKey,
}: CompetitorsListProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompetitors() {
      if (!tournamentId) return;

      setLoading(true);
      try {
        const response = await fetch(
          `/api/competitors?tournamentId=${tournamentId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch competitors");
        }
        const data = await response.json();
        setCompetitors(data);
      } catch (error) {
        toast.error("Failed to load competitors.");
      } finally {
        setLoading(false);
      }
    }

    fetchCompetitors();
  }, [tournamentId, refreshKey]);

  if (loading) {
    return <p>Loading competitors...</p>;
  }

  if (competitors.length === 0) {
    return <p>No competitors registered for this tournament yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Gender</TableHead>
          <TableHead>Belt</TableHead>
          <TableHead>Age</TableHead>
          <TableHead>Kata Category</TableHead>
          <TableHead>Kumite Category</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {competitors.map((c) => (
          <TableRow key={c.id}>
            <TableCell>{c.name}</TableCell>
            <TableCell>{c.gender}</TableCell>
            <TableCell>{c.belt}</TableCell>
            <TableCell>{c.age}</TableCell>
            <TableCell>{c.kataCategory || "N/A"}</TableCell>
            <TableCell>{c.kumiteCategory || "N/A"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
