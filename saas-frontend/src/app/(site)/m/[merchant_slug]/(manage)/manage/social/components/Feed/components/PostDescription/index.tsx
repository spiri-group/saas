import { formatDateString } from "@/lib/functions";

import { socialpost_type } from "@/utils/spiriverse";

type Props = {
    post: socialpost_type
}

const PostDescription: React.FC<Props> = (props) => {

   return (
        <div className="w-full">
             {props.post.media && (
                <h1 className="text-md">{props.post.title?.slice(0, 400)}</h1>
            )}
            <p className="text-sm">{props.post.description}</p>
            <ul className="flex flex-row justify-start flex-wrap space-x-1 w-full">
                {props.post.hashtags.map((hashtag) => (
                    <li key={hashtag} className="text-xs">#{hashtag}</li>
                ))}
            </ul>
            <h2 className="text-xs mt-1">{formatDateString(props.post.availableAfter)}</h2>
        </div>
   )
}

export default PostDescription;