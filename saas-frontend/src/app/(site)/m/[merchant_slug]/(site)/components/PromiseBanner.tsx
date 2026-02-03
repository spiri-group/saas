'use client';

import { cn } from "@/lib/utils";
import { banner_config_type } from "@/utils/spiriverse";

type Props = {
    config: banner_config_type | null | undefined;
    className?: string;
}

const CatalogueBanner: React.FC<Props> = ({ config, className }) => {
    if (!config || !config.promiseText) return null;
    
    // Display catalogue banner

    const getBackgroundStyle = (): React.CSSProperties => {
        if (config.backgroundType === 'COLOR') {
            return { backgroundColor: config.backgroundColor || '#6366f1' };
        }
        
        if (config.backgroundType === 'GRADIENT') {
            const directionMap: Record<string, string> = {
                'TO_RIGHT': 'right',
                'TO_LEFT': 'left',
                'TO_BOTTOM': 'bottom',
                'TO_TOP': 'top',
                'TO_BOTTOM_RIGHT': 'bottom right',
                'TO_BOTTOM_LEFT': 'bottom left',
                'TO_TOP_RIGHT': 'top right',
                'TO_TOP_LEFT': 'top left'
            };
            
            const direction = config.gradientDirection 
                ? directionMap[config.gradientDirection] 
                : 'bottom';
                
            return {
                background: `linear-gradient(to ${direction}, ${config.gradientStart || '#6366f1'}, ${config.gradientEnd || '#8b5cf6'})`
            };
        }
        
        if (config.backgroundType === 'IMAGE' && config.backgroundImage?.url) {
            return {
                backgroundImage: `url(${config.backgroundImage.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            };
        }
        
        return { backgroundColor: '#6366f1' };
    };

    const getTextSizeClass = () => {
        switch (config.textSize) {
            case 'SMALL': return 'text-xl md:text-2xl';
            case 'MEDIUM': return 'text-2xl md:text-3xl';
            case 'LARGE': return 'text-3xl md:text-4xl';
            case 'XLARGE': return 'text-4xl md:text-5xl';
            default: return 'text-3xl md:text-4xl';
        }
    };

    const getAlignmentClass = () => {
        switch (config.textAlignment) {
            case 'LEFT': return 'text-left items-start';
            case 'CENTER': return 'text-center items-center';
            case 'RIGHT': return 'text-right items-end';
            default: return 'text-center items-center';
        }
    };

    return (
        <div
            className={cn(
                "relative w-full min-h-[200px] md:min-h-[250px] flex justify-center rounded-lg overflow-hidden shadow-lg",
                getAlignmentClass(),
                className
            )}
            style={getBackgroundStyle()}
        >
            {/* Overlay for better text readability when using images */}
            {config.backgroundType === 'IMAGE' && (
                <div className="absolute inset-0 bg-black/20" />
            )}
            
            {/* Promise Text */}
            <div className="relative z-10 flex flex-col justify-center px-8 py-12 md:px-16 md:py-16 max-w-5xl">
                <p
                    className={cn(
                        "font-bold leading-tight drop-shadow-lg",
                        getTextSizeClass()
                    )}
                    style={{ 
                        color: config.textColor || '#ffffff',
                        textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                    }}
                >
                    {config.promiseText}
                </p>
            </div>
        </div>
    );
};

export default CatalogueBanner;
