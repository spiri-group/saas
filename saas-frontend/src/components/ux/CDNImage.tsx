import { isNullOrWhitespace } from "@/lib/functions";
import Image, { ImageProps } from "next/image";
import { useMemo } from "react";

type CDNImageProps = Omit<ImageProps, 'src' | 'loader'> & {
    src: string,
    alt: string
};

const CDNImage: React.FC<CDNImageProps> = (props) => {
    const { src, alt, ...rest } = props;

    const fromCDN = useMemo(() => {
        return src.includes('.azurefd.net');
    }, [src]);

    const load_from_cdn = useMemo(() => {
        return ({ src, width, quality }: { src: string, width: number, quality?: number }) => {
            // if it already has a ? in it we need to append & instead of ?
            return `${src}${src.includes("?") ? "&" : "?"}w=${width}&q=${quality || 75}&output=webp`;
        };
    }, []);

    if (isNullOrWhitespace(src)) {
        return null;
    }

    return (
        <Image 
            src={src} 
            alt={alt}
            loader={fromCDN ? load_from_cdn : undefined}
            {...rest} 
        />
    );
};

export default CDNImage;