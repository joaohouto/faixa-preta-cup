"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Tags, Network, Gavel, Upload } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { classificacaoContent } from "@/content/docs/classificacao";
import { chavesContent } from "@/content/docs/chaves";
import { arbitragemContent } from "@/content/docs/arbitragem";
import { importacaoContent } from "@/content/docs/importacao";
import { useEscBack } from "@/hooks/use-esc-back";

const sections = [
  {
    value: "classificacao",
    label: "Classificação",
    icon: Tags,
    content: classificacaoContent,
  },
  {
    value: "chaves",
    label: "Chaves",
    icon: Network,
    content: chavesContent,
  },
  {
    value: "arbitragem",
    label: "Arbitragem",
    icon: Gavel,
    content: arbitragemContent,
  },
  {
    value: "importacao",
    label: "Importação",
    icon: Upload,
    content: importacaoContent,
  },
];

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold mt-8 mb-3 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold mt-6 mb-2 text-muted-foreground uppercase tracking-wide">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-relaxed text-foreground/90 mb-3">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/90 mb-3">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 space-y-1 text-sm text-foreground/90 mb-3">
      {children}
    </ol>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="rounded-md bg-muted p-3 font-mono text-xs overflow-x-auto mb-3">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4 rounded-md border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  th: ({ children }) => (
    <th className="text-left font-medium px-3 py-2 border-b">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 border-b border-border/50 align-top">
      {children}
    </td>
  ),
};

export function DocsContent() {
  useEscBack();

  return (
    <Tabs defaultValue="classificacao">
      <TabsList className="h-auto flex-wrap mb-8">
        {sections.map((section) => (
          <TabsTrigger key={section.value} value={section.value}>
            <section.icon className="size-3.5" />
            {section.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {sections.map((section) => (
        <TabsContent key={section.value} value={section.value}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {section.content}
          </ReactMarkdown>
        </TabsContent>
      ))}
    </Tabs>
  );
}
