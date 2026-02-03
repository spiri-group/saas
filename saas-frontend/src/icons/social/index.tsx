import FacebookIcon from "./FacebookIcon"
import InstagramIcon from "./InstagramIcon"
import LinkedInIcon from "./LinkedInIcon"
import YoutubeIcon from "./YoutubeIcon"
import XIcon from "./XIcon"
import TikTokIcon from "./TikTokIcon"
import { IconStyle } from "../shared/types"

export const iconSize = 28
export const iconsMapping = {
    facebook: (mode: IconStyle) => <FacebookIcon mode={mode} height={iconSize} />,
    instagram: (mode: IconStyle) => <InstagramIcon mode={mode} height={iconSize} />,
    linkedin: (mode: IconStyle) => <LinkedInIcon mode={mode} height={iconSize} />,
    youtube: (mode: IconStyle) => <YoutubeIcon mode={mode} height={iconSize} />,
    x: (mode: IconStyle) => <XIcon mode={mode} height={iconSize} />,
    tiktok: (mode: IconStyle) => <TikTokIcon mode={mode} height={iconSize} />
}

