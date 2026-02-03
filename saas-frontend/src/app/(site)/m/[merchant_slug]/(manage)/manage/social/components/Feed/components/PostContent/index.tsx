
import { socialpost_type } from "@/utils/spiriverse"
import WithMediaContent from "./components/WithMediaContent"
import TextOnlyContent from "./components/TextOnlyContent"

type Props = {
    post: socialpost_type
}

const PostContent: React.FC<Props> = (props) => {

    if (props.post.type == "text-only") {
        return <TextOnlyContent socialPost={props.post} />
    } else {
        return <WithMediaContent socialPost={props.post}  />
    }
}

export default PostContent;