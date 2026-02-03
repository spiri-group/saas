'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import classNames from 'classnames';
import NextImage from 'next/image';

type Props = {
  className?: string;
  images: Array<{ image: string; alt: string }>;
}

const Carousel : React.FC<Props> = (props) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-scrolling function
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % props.images.length);
    }, 3000); // Change image every 3 seconds (adjust as needed)

    return () => clearInterval(interval);
  }, [props.images.length]);

  return (
    <>
    <div className={classNames("relative w-full h-[120px] lg:h-[230px]", props.className)}>
      <AnimatePresence initial={false} custom={currentIndex}>
        {props.images.map((item, index) => (
          index === currentIndex && (
            <motion.div
              key={index}
              custom={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute h-full w-full"
            >
              <NextImage src={item.image} alt={item.alt} fill={true} style={{ objectFit: "cover" }} priority loading="eager" />
            </motion.div>
          )
        ))}
      </AnimatePresence>
    </div>
    </>
  )
}

export default Carousel;