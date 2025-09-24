// src/hooks/useVirtualScroll.js
import { useState, useEffect, useCallback, useMemo } from 'react';

export const useVirtualScroll = (items, itemWidth = 288, containerWidth = 1200) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [containerRef, setContainerRef] = useState(null);
  
  // Calcular cuántos elementos son visibles
  const visibleCount = Math.ceil(containerWidth / itemWidth) + 2; // Buffer de 2 elementos
  
  // Calcular el rango de elementos visibles
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    if (!items || items.length === 0) {
      return { startIndex: 0, endIndex: 0, visibleItems: [] };
    }
    
    const start = Math.max(0, Math.floor(scrollPosition / itemWidth) - 1);
    const end = Math.min(items.length, start + visibleCount);
    
    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items.slice(start, end)
    };
  }, [items, scrollPosition, itemWidth, visibleCount]);
  
  // Manejador del scroll
  const handleScroll = useCallback((e) => {
    const newScrollPosition = e.target.scrollLeft;
    setScrollPosition(newScrollPosition);
  }, []);
  
  // Ref callback
  const setRef = useCallback((node) => {
    if (node) {
      setContainerRef(node);
      node.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
      if (node) {
        node.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);
  
  return {
    visibleItems,
    startIndex,
    endIndex,
    setRef,
    totalWidth: items ? items.length * itemWidth : 0,
    offsetLeft: startIndex * itemWidth
  };
};

export default useVirtualScroll;