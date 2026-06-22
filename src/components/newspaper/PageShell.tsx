import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { UtilityBar } from "./UtilityBar";
import { Masthead } from "./Masthead";
import { SectionNav } from "./SectionNav";
import { SiteFooter } from "./SiteFooter";
import { newspaperEditionQuery } from "@/lib/api";

const defaultMasthead = {
  title: "The Morning Wire",
  tagline: "Your Personal Daily Intelligence",
};

const defaultUtilityBar = {
  dateLabel: "",
  weather: { tempC: 0, condition: "", icon: "partly" as const },
  editionLabel: "",
  updatedByAiAt: "",
  nextEditionText: "Next edition scheduled",
};

const defaultNavigation = {
  items: [
    { id: "top", label: "Top Stories", path: "/" },
    { id: "world", label: "World", path: "/world" },
    { id: "war", label: "War", path: "/war" },
    { id: "technology", label: "Technology", path: "/technology" },
    { id: "business", label: "Business", path: "/business" },
    { id: "science", label: "Science", path: "/science" },
    { id: "culture", label: "Culture", path: "/culture" },
  ],
  moreLinks: [
    { id: "saved", label: "Saved", path: "/saved" },
    { id: "archive", label: "Archive", path: "/editions" },
  ],
};

const defaultFooter = {
  copyright: "",
  links: [] as { label: string; path: string }[],
};

export function PageShell({ children, updatedAt }: { children: ReactNode; updatedAt?: string }) {
  const { data: newspaper } = useQuery(newspaperEditionQuery);

  const masthead = newspaper?.masthead ?? defaultMasthead;
  const utilityBar = newspaper?.utilityBar ?? defaultUtilityBar;
  const navigation = newspaper?.navigation ?? defaultNavigation;
  const footer = newspaper?.footer ?? defaultFooter;

  return (
    <div className="min-h-dvh bg-[var(--paper)]">
      <UtilityBar data={{ ...utilityBar, updatedByAiAt: updatedAt ?? utilityBar.updatedByAiAt }} />
      <Masthead data={masthead} />
      <SectionNav data={navigation} />
      <main className="mx-auto max-w-[1440px] px-6">{children}</main>
      <SiteFooter data={footer} />
    </div>
  );
}
