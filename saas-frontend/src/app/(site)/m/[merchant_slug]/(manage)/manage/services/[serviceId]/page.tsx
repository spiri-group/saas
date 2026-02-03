import UI from "./ui";

async function ServicePage({ params } : { params: Promise<{ merchantId: string, serviceId: string }> }) {

    const { merchantId, serviceId } = await params;
    
    return (
        <>
            <UI
              merchantId={merchantId}
              serviceId={serviceId}
            />
        </>
    )
}

export default ServicePage;