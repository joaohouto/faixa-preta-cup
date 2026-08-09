import { Header } from "@/components/header";
import { DocsContent } from "./docs-content";

export const metadata = {
  title: "Documentação — Faixa Preta Cup",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto p-6 max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Documentação</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Como a plataforma classifica competidores, gera chaves e decide
              resultados.
            </p>
          </div>

          <DocsContent />
        </div>
      </main>
    </div>
  );
}
