import { AmbientBackground } from "@/app/_components/ambient-background";
import { Sidebar } from "@/app/_components/sidebar";
import { SettingsProvider } from "@/lib/hooks/use-settings";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SettingsProvider>
      <div className="relative z-[1] flex min-h-screen text-[#e9e9f0]">
        <AmbientBackground />
        <Sidebar />
        <main className="relative z-[1] flex-1 min-w-0 px-10 py-[30px] pb-[60px]">
          {children}
        </main>
      </div>
    </SettingsProvider>
  );
}
