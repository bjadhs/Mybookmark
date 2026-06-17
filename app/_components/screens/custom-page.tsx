import { PageSubtitle, PageTitle } from "@/app/_components/ui/typography";
import { PAGE_ICONS } from "@/app/_icons";
import type { ManagedPage } from "@/lib/types";

/**
 * Renders an admin-created custom page: its label as the title and each editable
 * section as a heading + body block. Built-in pages have their own screens and
 * never reach here.
 */
export function CustomPage({ page }: { page: ManagedPage }) {
  const Icon = PAGE_ICONS[page.icon] ?? PAGE_ICONS.globe;
  const sections = page.sections.filter((s) => s.heading || s.text);

  return (
    <div className="max-w-[760px]">
      <div className="mb-7 flex items-start gap-3.5">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--accent)]/15 text-[var(--accent)]">
          <Icon className="h-[20px] w-[20px]" />
        </span>
        <div>
          <PageTitle>{page.label}</PageTitle>
          {page.lockedDesc && <PageSubtitle>{page.lockedDesc}</PageSubtitle>}
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-white/10 bg-white/[0.015] px-5 py-16 text-center">
          <div className="mb-1.5 text-[17px] font-bold text-[#d4d4dd]">
            Nothing here yet
          </div>
          <div className="text-sm text-glance-muted">
            An admin can add content to this page in Settings.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map((section, i) => (
            <section
              key={i}
              className="rounded-[16px] border border-glance-border bg-glance-surface p-5"
            >
              {section.heading && (
                <h2 className="font-[family-name:var(--font-space-grotesk)] text-[16px] font-bold text-glance-primary">
                  {section.heading}
                </h2>
              )}
              {section.text && (
                <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-[1.65] text-glance-muted">
                  {section.text}
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
