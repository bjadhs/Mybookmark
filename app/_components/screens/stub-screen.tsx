import { PageSubtitle, PageTitle } from "@/app/_components/ui/typography";

interface StubScreenProps {
  title: string;
  subtitle: string;
}

export function StubScreen({ title, subtitle }: StubScreenProps) {
  return (
    <div>
      <PageTitle>{title}</PageTitle>
      <PageSubtitle>{subtitle}</PageSubtitle>
      <div className="flex flex-col items-center justify-center py-24 px-5 text-center border border-dashed border-white/10 rounded-[18px] bg-white/[0.015]">
        <div className="text-[17px] font-bold text-[#d4d4dd] mb-1.5">
          Coming soon
        </div>
        <div className="text-sm text-glance-muted">
          This space is reserved — nothing to show here yet.
        </div>
      </div>
    </div>
  );
}
