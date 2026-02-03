import UseListingRatings from "../hooks/UseListingRatings"
import RatingStarVisualizerComponent from "@/components/ui/ratingstar"
import { Progress } from "@/components/ui/progress"
import { rating_type } from "@/utils/spiriverse"
import { Panel, PanelContent, PanelHeader } from "@/components/ux/Panel"

type BLProps = {
    merchantId: string,
    listingId: string
}

type Props = BLProps & {
    className?: string
    useMerchantTheming?: boolean
}

const useBL = (props: BLProps) => {

    const ratings = UseListingRatings(props.listingId, props.merchantId)

    return {
        ready: ratings.isSuccess,
        ratings: ratings.data
    }
}

const ListingRatings : React.FC<Props> = (props) => {
    const bl = useBL(props)

    // Determine styling based on merchant theming flag
    const panelStyle = props.useMerchantTheming ? {
        backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
        color: `rgb(var(--merchant-panel-primary-foreground))`,
        borderColor: `rgb(var(--merchant-primary), 0.2)`,
        boxShadow: `var(--shadow-merchant-lg)`
    } : {};

    const headerClass = props.useMerchantTheming ? "text-xs md:text-lg text-merchant-headings-foreground" : "text-xs md:text-lg";
    const textClass = props.useMerchantTheming ? "text-merchant-default-foreground" : "";
    const mutedTextClass = props.useMerchantTheming ? "text-merchant-default-foreground/70" : "";

    if (!bl.ready) return <Panel className={`w-full md:flex-none md:w-64 aspect-square ${props.className}`} style={panelStyle} />

    if (bl.ratings == undefined) {
        return (
            <Panel className={`w-full md:flex-none md:w-64 md:aspect-square ${props.className}`} style={panelStyle}>
                <PanelHeader className={headerClass}>Customer ratings</PanelHeader>
                <PanelContent className="p-3">
                    <span className={`text-xs md:text-base ${textClass}`}>This listing awaits its first review, inviting you to be the inaugural reviewer and share your experience with others!</span>
                </PanelContent>
            </Panel>
        )
    }

    // we want this to be like amazons rating control

    return (
       <Panel className={`w-full md:flex-none md:w-64 aspect-square ${props.className}`} style={panelStyle}>
            <PanelHeader className={headerClass}>Customer ratings</PanelHeader>
            <PanelContent className="flex flex-col space-y-4">
                <div className="flex flex-col">
                    <div className="flex flex-row justify-center items-center space-x-3">
                        <RatingStarVisualizerComponent readOnly={true} value={5} />
                        <span className={textClass}>{bl.ratings.average} out of 5</span>
                    </div>
                    <span className={`w-full text-center ${mutedTextClass}`}>{bl.ratings.total_count} total reviews</span>
                </div>
                {bl.ratings != undefined ? (
                    <ul>
                        {[5,4,3,2,1].map((i) => {
                            const ratings = bl.ratings as rating_type
                            return (
                                <li className="flex flex-row space-x-3 items-center" key={i}>
                                    <span className={`flex-none w-12 ${textClass}`}>{i} star</span>
                                    <Progress value={(ratings[`rating${i}`] / ratings.total_count) * 100} />
                                    <span className={`flex-none w-16 text-sm ${mutedTextClass}`}>{(ratings[`rating${i}`] / ratings.total_count * 100).toFixed(2)}%</span>
                                </li>
                            )
                        })}
                    </ul>
                ) : <></>}
            </PanelContent>
       </Panel>
    )
}

export default ListingRatings;