import React, { useState, useEffect, useRef } from 'react';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZThlOGU4Ii8+PC9zdmc+' 
}) => {
  const [imgSrc, setImgSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImgSrc(src);
      setIsLoaded(true);
    };
    
    return () => {
      img.onload = null;
    };
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={imgSrc}
      alt={alt}
      className={`${className} transition-all duration-500 ${isLoaded ? 'opacity-100 blur-0' : 'opacity-100 blur-md'}`}
      style={{ filter: isLoaded ? 'none' : 'blur(10px)' }}
    />
  );
};
