import { user_type } from "../user/types"
import { vendor_type } from "../vendor/types"

export type follow_type = {
    id: string
    targetId: string           // partition key (merchantId for now)
    targetType: "MERCHANT" | "USER"  // future: support user-to-user follows
    followerId: string         // userId of the person following
    followerName: string       // denormalized for marketing lists
    followerEmail?: string     // denormalized for marketing
    followerAvatar?: string    // denormalized for display
    followedAt: string         // ISO timestamp
    status: "ACTIVE" | "INACTIVE"
}

export type follow_result_type = {
    success: boolean
    isFollowing: boolean
    followerCount: number
}

export type following_merchant_type = {
    merchantId: string
    merchantName: string
    merchantSlug: string
    merchantLogo?: string
    followedAt: string
}
