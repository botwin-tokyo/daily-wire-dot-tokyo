import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Masthead } from "./Masthead";
import { UtilityBar } from "./UtilityBar";
import { SiteFooter } from "./SiteFooter";
import { SectionNav } from "./SectionNav";
import type {
  NewspaperMasthead,
  NewspaperUtilityBar,
  NewspaperFooter,
  NewspaperNavigation,
} from "@/lib/types";

let mockPathname = "/";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<object>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      to,
      children,
      className,
    }: {
      to: string;
      children: ReactNode;
      className?: string;
    }) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
    useLocation: () => ({ pathname: mockPathname }),
  };
});

beforeEach(() => {
  mockPathname = "/";
});

vi.mock("@/components/pretext", () => ({
  FitText: ({ text }: { text: string }) => <span>{text}</span>,
  PretextWrappedText: ({ text }: { text: string }) => <p>{text}</p>,
  PretextCanvasText: ({ text }: { text: string }) => <p>{text}</p>,
}));

const masthead: NewspaperMasthead = {
  title: "The Test Wire",
  tagline: "Test tagline",
};

const utilityBar: NewspaperUtilityBar = {
  dateLabel: "May 21, 2025",
  weather: { tempC: 22, condition: "Sunny", icon: "sun" },
  editionLabel: "Test",
  updatedByAiAt: "06:00",
  nextEditionText: "Next edition scheduled",
};

const footer: NewspaperFooter = {
  copyright: "© 2025 Test Wire",
  links: [
    { label: "Privacy", path: "/privacy" },
    { label: "Terms", path: "/terms" },
  ],
};

const navigation: NewspaperNavigation = {
  items: [
    { id: "top", label: "Top Stories", path: "/" },
    { id: "world", label: "World", path: "/world", category: "world" },
  ],
  moreLinks: [{ id: "saved", label: "Saved", path: "/saved" }],
};

describe("Masthead", () => {
  it("renders the title and tagline from JSON", () => {
    render(<Masthead data={masthead} />);
    expect(screen.getByText("The Test Wire")).toBeInTheDocument();
    expect(screen.getByText("Test tagline")).toBeInTheDocument();
  });
});

describe("UtilityBar", () => {
  it("renders date, weather, edition label, and next edition text", () => {
    render(<UtilityBar data={utilityBar} />);
    expect(screen.getByText("May 21, 2025")).toBeInTheDocument();
    expect(screen.getByText("Sunny")).toBeInTheDocument();
    expect(screen.getByText(/Test/)).toBeInTheDocument();
    expect(screen.getByText("Next edition scheduled")).toBeInTheDocument();
    expect(screen.getByText("Updated by AI at 06:00")).toBeInTheDocument();
  });
});

describe("SiteFooter", () => {
  it("renders copyright and footer links", () => {
    render(<SiteFooter data={footer} />);
    expect(screen.getByText("© 2025 Test Wire")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
    expect(screen.getByText("Terms")).toBeInTheDocument();
  });
});

describe("SectionNav", () => {
  it("renders navigation items and more links", () => {
    render(<SectionNav data={navigation} />);
    expect(screen.getByText("Top Stories")).toBeInTheDocument();
    expect(screen.getByText("World")).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("marks the current path as active", () => {
    mockPathname = "/world";
    render(<SectionNav data={navigation} />);
    const worldLink = screen.getByText("World").closest("a");
    expect(worldLink).toHaveClass("active");
  });
});
