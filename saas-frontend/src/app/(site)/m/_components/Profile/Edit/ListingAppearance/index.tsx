import EditThumbnail from "@/app/(site)/m/[merchant_slug]/(site)/listing/components/EditThumbnail"
import { DialogContent } from "@/components/ui/dialog"
import UseVendorThumbnail from "./_hooks/UseVendorThumbnail"
import BouncingDots from "@/icons/BouncingDots"
import { escape_key, isNullOrUndefined } from "@/lib/functions"
import { ThumbnailSchema } from "@/shared/schemas/thumbnail"

type BLProps = {
    merchantId: string
}

const default_thumbnail = {
    image: {
        media: undefined,
        zoom: 1
    },
    title: {
        content: undefined,
        image: {
            zoom: 1,
            media: undefined
        },
        panel: {
            bgColor: "#ffffff",
            textColor: "#000000",
            bgOpacity: 0.8
        },
        bgColor: "#ffffff"
    },
    bgColor: "#ffffff"
}

const useBL = (props: BLProps) => {
    const { merchantId } = props

    const thumbnailQuery = UseVendorThumbnail(merchantId)

    return {
        merchantId,
        thumbnail: thumbnailQuery?.query,
        onSuccess: (value: ThumbnailSchema) => {
            thumbnailQuery.upsert(value);
            escape_key();
        }
    }
}

type Props = BLProps & {

}

const EditListingAppearance: React.FC<Props> = (props) => {
    const bl = useBL(props)
    const { thumbnail } = bl

    return (
        <DialogContent>
            {thumbnail.isLoading ? 
            <BouncingDots /> :
               !isNullOrUndefined(thumbnail.data) ? (
                <EditThumbnail
                    withPrice={false}
                    thumbnailType="rectangle"
                    forObject={bl.thumbnail.data!.ref}
                    existingThumbnail={thumbnail.data!.thumbnail ?? {
                        ...default_thumbnail,
                        title: {
                            ...default_thumbnail.title,
                            content: thumbnail.data!.name
                        }
                    }}
                    onSuccess={(value) => {
                        bl.onSuccess(value)
                    }}
                    onCancel={() => {
                        escape_key();
                    }}
                />
               ) : <></>
            }
        </DialogContent>
    )
}

export default EditListingAppearance