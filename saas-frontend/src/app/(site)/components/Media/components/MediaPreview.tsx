import { media_type } from '@/utils/spiriverse';
import React from 'react';

type Props = {
    files: media_type[]
}

const MediaPreview: React.FC<Props> = (props) => {
    return (
        <div className="flex flex-col">
            {props.files.map((file) => (
                <div key={file.url} className="w-auto h-24">
                    <img alt={'media preview'} src={file.url} />
                </div>
            ))}
        </div>
    )
}

export default MediaPreview