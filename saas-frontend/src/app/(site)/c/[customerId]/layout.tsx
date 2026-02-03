import CustomerSideNav from "./_components/sidenav";

export default async function Layout({ children }: { children: React.ReactNode }) {

    return (
        <div className="w-screen">
            <CustomerSideNav/>
            <div style={{ marginLeft: '220px', width: 'calc(100vw - 220px)' }}>
                {children}
            </div>
        </div>
    )
}