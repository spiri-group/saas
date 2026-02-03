'use client'

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import useEmblaCarousel, { UseEmblaCarouselType } from "embla-carousel-react"
import { ArrowBigDownDash, ArrowBigLeftDash, ArrowBigRightDash, ArrowBigUpDash, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Circle } from "lucide-react"
import React, { useEffect, useState } from "react"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)
  if (!context) throw new Error("useCarousel must be used within a <Carousel />")
  return context
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>((
  {
    orientation = "horizontal",
    opts,
    setApi,
    plugins,
    className,
    children,
    ...props
  },
  ref
) => {
  const carouselContainerRef = React.useRef<HTMLDivElement>(null)
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins
  )

  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = React.useCallback(() => {
    api?.scrollNext()
  }, [api])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext]
  )

  useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  useEffect(() => {
    if (!api) {
      // Do nothing if `api` is not available
      return;
    }

    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    // Always return a cleanup function
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  useEffect(() => {
    const currentRef = carouselContainerRef.current
    if (!currentRef) return
    const items = currentRef.querySelectorAll('.embla__slide')
    items.forEach((item, index) => {
      console.log(`Carousel item ${index} height:`, item.clientHeight)
      console.log(`Carousel item ${index} width:`, item.clientWidth)
    })
  }, [carouselContainerRef])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        ref={(node) => {
          carouselContainerRef.current = node
          if (typeof ref === 'function') {
            ref(node)
          } else if (ref) {
            ref.current = node
          }
        }}
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", "flex", orientation === "horizontal" ? "flex-row" : "flex-col", className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
})
Carousel.displayName = "Carousel"

interface CarouselContentProps extends React.HTMLAttributes<HTMLDivElement> {
  outerClassName?: string
  contentAsGrid?: boolean
}

const CarouselContent = React.forwardRef<HTMLDivElement, CarouselContentProps>(
  ({ outerClassName, contentAsGrid = false, className, ...props }, ref) => {
    const { carouselRef, orientation } = useCarousel()
    return (
      <div ref={carouselRef} className={cn("overflow-hidden flex-grow", outerClassName)}>
        <div
          ref={ref}
          className={cn(
            !contentAsGrid ? "flex" : "grid",
            "h-full",
            {
              'flex-row': !contentAsGrid && orientation === 'horizontal',
              'flex-col': !contentAsGrid && orientation === 'vertical',
            },
            className)}
          {...props}
        />
      </div>
    )
  }
)
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="group"
        aria-roledescription="slide"
        className={cn("flex-shrink-0 w-auto h-auto", className)}
        {...props}
      />
    )
  }
)
CarouselItem.displayName = "CarouselItem"

const CarouselScrollToTop = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button> & { style?: "CIRCLE" | "RECTANGLE", hideIfNotScrollable?: boolean }>(
  ({ className, variant = "outline", size = "icon", style = "CIRCLE", hideIfNotScrollable, ...props }, ref) => {
    const { canScrollPrev, orientation, api } = useCarousel()
    if (hideIfNotScrollable && !canScrollPrev) return null
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(style === "CIRCLE" ? "flex-none h-8 w-8 rounded-full" : "", className)}
        disabled={!canScrollPrev}
        onClick={() => api?.scrollTo(0)}
        aria-label="Previous slide"
        type="button"
        {...props}
      >
        {orientation === "vertical" ? <ArrowBigUpDash className="h-4 w-4" /> : <ArrowBigLeftDash className="h-4 w-4" />}
        <span className="sr-only">Back to Top</span>
      </Button>
    )
  }
)
CarouselScrollToTop.displayName = "CarouselScrollToTop"

const CarouselScrollToBottom = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button> & { style?: "CIRCLE" | "RECTANGLE", hideIfNotScrollable?: boolean }>(
  ({ className, variant = "outline", size = "icon", style = "CIRCLE", hideIfNotScrollable, ...props }, ref) => {
    const { canScrollNext, orientation, api } = useCarousel()
    if (hideIfNotScrollable && !canScrollNext) return null
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(style === "CIRCLE" ? "flex-none h-8 w-8 rounded-full" : "", className)}
        disabled={!canScrollNext}
        onClick={() => api?.scrollTo(api.scrollSnapList().length - 1)}
        aria-label="Next slide"
        type="button"
        {...props}
      >
        {orientation === "vertical" ? <ArrowBigDownDash className="h-4 w-4" /> : <ArrowBigRightDash className="h-4 w-4" />}
        <span className="sr-only">Go to Bottom</span>
      </Button>
    )
  }
)
CarouselScrollToBottom.displayName = "CarouselScrollToBottom"

const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button> & { style?: "CIRCLE" | "RECTANGLE", hideIfNotScrollable?: boolean }>(
  ({ className, variant = "outline", size = "icon", style = "CIRCLE", hideIfNotScrollable, ...props }, ref) => {
    const { scrollPrev, canScrollPrev, orientation } = useCarousel()
    if (hideIfNotScrollable && !canScrollPrev) return null
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          style === "CIRCLE" ? "flex-none h-8 w-8 rounded-full" : (orientation === "vertical" ? "flex-none h-10" : "flex-none w-10"),
          className
        )}
        disabled={!canScrollPrev}
        onClick={scrollPrev}
        aria-label="Previous slide"
        type="button"
        {...props}
      >
        {orientation === "vertical" ? <ArrowUp className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        <span className="sr-only">Previous slide</span>
      </Button>
    )
  }
)
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button> & { style?: "CIRCLE" | "RECTANGLE", label?: string, hideIfNotScrollable?: boolean }>(
  ({ className, variant = "outline", size = "icon", style = "CIRCLE", hideIfNotScrollable, label, ...props }, ref) => {
    const { scrollNext, canScrollNext, orientation } = useCarousel()
    if (hideIfNotScrollable && !canScrollNext) return null
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          style === "CIRCLE" ? "flex-none h-8 w-8 rounded-full" : (orientation === "vertical" ? "flex-none h-10" : "flex-none w-auto px-3"),
          className
        )}
        disabled={!canScrollNext}
        onClick={scrollNext}
        aria-label="Next slide"
        type="button"
        {...props}
      >
        {label ? <span className="text-sm mr-2">{label}</span> : null}
        {orientation === "vertical" ? <ArrowDown className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        <span className="sr-only">Next slide</span>
      </Button>
    )
  }
)
CarouselNext.displayName = "CarouselNext"

const CarouselDots = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & CarouselProps>(
  ({ className, ...props }, ref) => {
    const { api, opts } = useCarousel()
    const [selectedIndex, setSelectedIndex] = useState<number>(0)

    useEffect(() => {
      if (!api) return; // Do nothing if `api` is not available

      const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
      api.on('select', onSelect);
      onSelect();

      // Always return a cleanup function
      return () => {
        api.off('select', onSelect);
      };
    }, [api]);

    useEffect(() => {
      if (api && opts?.startIndex !== undefined) {
        api.scrollTo(opts.startIndex)
        setSelectedIndex(opts.startIndex)
      }
    }, [api, opts?.startIndex])

    if (!api) return null

    return (
      <div ref={ref} {...props} className={cn("flex flex-row space-x-1", className)}>
        {api.scrollSnapList().map((_, index) => (
          <Circle
            key={index}
            size={14}
            className={cn(
              "cursor-pointer",
              "focus:outline-none",
              index === selectedIndex ? "text-primary fill-primary" : "text-slate-400"
            )}
            onClick={() => api.scrollTo(index)}
            role="button"
            tabIndex={0}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === selectedIndex ? "true" : undefined}
          />
        ))}
      </div>
    )
  }
)
CarouselDots.displayName = "CarouselDots"

type CarouselButtonProps = React.ComponentProps<typeof Button> & {
  onSelect: (index: number | undefined) => void
}

const CarouselButton = React.forwardRef<HTMLButtonElement, CarouselButtonProps>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { api } = useCarousel()
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        onClick={() => props.onSelect(api?.selectedScrollSnap())}
        className={cn("h-8 w-8 rounded-full", className)}
        {...props}
      />
    )
  }
)
CarouselButton.displayName = "CarouselButton"

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselScrollToTop,
  CarouselScrollToBottom,
  CarouselNext,
  CarouselDots,
  CarouselButton,
  useCarousel
}
