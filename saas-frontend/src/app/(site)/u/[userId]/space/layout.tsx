import PersonalSpaceSideNav from "./_components/sidenav";
import PersonalSpaceOnboardingGuard from "./_components/OnboardingGuard";
import PageVisitTracker from "./_components/PageVisitTracker";

export default async function PersonalSpaceLayout({ children }: { children: React.ReactNode }) {
    return (
        <PersonalSpaceOnboardingGuard>
            <PageVisitTracker />
            <PersonalSpaceSideNav />
            <div className="h-full flex-grow bg-slate-950 ml-0 md:ml-[200px] overflow-x-hidden">
                {children}
            </div>
        </PersonalSpaceOnboardingGuard>
    );
}
