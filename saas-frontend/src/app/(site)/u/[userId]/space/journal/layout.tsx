export default async function JournalLayout({ children }: { children: React.ReactNode }) {
    // No additional layout needed - parent space/layout.tsx handles sidenav
    return <>{children}</>;
}
