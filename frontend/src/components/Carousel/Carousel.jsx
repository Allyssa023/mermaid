import { useEffect, useRef, useState, useCallback } from 'react';
import { FiCircle, FiCode, FiFileText, FiLayers, FiLayout } from 'react-icons/fi';

import './Carousel.css';

const DEFAULT_ITEMS = [
  { title: 'Text Animations', description: 'Cool text animations for your projects.', id: 1, icon: <FiFileText className="carousel-icon" /> },
  { title: 'Animations', description: 'Smooth animations for your projects.', id: 2, icon: <FiCircle className="carousel-icon" /> },
  { title: 'Components', description: 'Reusable components for your projects.', id: 3, icon: <FiLayers className="carousel-icon" /> },
  { title: 'Backgrounds', description: 'Beautiful backgrounds and patterns for your projects.', id: 4, icon: <FiLayout className="carousel-icon" /> },
  { title: 'Common UI', description: 'Common UI components are coming soon!', id: 5, icon: <FiCode className="carousel-icon" /> },
];

const SNAP_TRANSITION = 'transform 280ms cubic-bezier(0.25, 1, 0.5, 1)';
const COMMIT_THRESHOLD = 0.3;
const MAX_TILT_DEG = 18;

function CardContent({ item, round }) {
  return (
    <>
      <div className={`carousel-item-header ${round ? 'round' : ''}`}>
        <span className="carousel-icon-container">{item.icon}</span>
      </div>
      <div className="carousel-item-content">
        <div className="carousel-item-title">{item.title}</div>
        <p className="carousel-item-description">{item.description}</p>
      </div>
    </>
  );
}

export default function Carousel({
  items = DEFAULT_ITEMS,
  baseWidth = 300,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  loop = false,
  round = false,
}) {
  const [index, setIndex] = useState(0);
  const [adjIndex, setAdjIndex] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef(null);
  const currentRef = useRef(null);
  const adjacentRef = useRef(null);

  const startXRef = useRef(0);
  const draggingRef = useRef(false);
  const didDragRef = useRef(false);   // true if pointer moved > 5px — suppresses click
  const animatingRef = useRef(false); // true during snap animation
  const dxRef = useRef(0);

  const count = items.length;
  const containerPadding = 16;
  const itemWidth = baseWidth - containerPadding * 2;

  useEffect(() => { setIndex(0); }, [count]);

  // Reset card DOM styles cleanly after every index change
  useEffect(() => {
    if (currentRef.current) {
      currentRef.current.style.transition = 'none';
      currentRef.current.style.transform = 'perspective(800px) translateX(0) rotateY(0deg) scale(1)';
      currentRef.current.style.opacity = '1';
    }
    if (adjacentRef.current) {
      adjacentRef.current.style.transition = 'none';
      adjacentRef.current.style.transform = `perspective(800px) translateX(${itemWidth}px) rotateY(${MAX_TILT_DEG}deg) scale(0.94)`;
      adjacentRef.current.style.opacity = '0.7';
      adjacentRef.current.style.visibility = 'hidden';
    }
    dxRef.current = 0;
    animatingRef.current = false;
  }, [index, itemWidth]);

  // Autoplay
  useEffect(() => {
    if (!autoplay || count <= 1) return;
    if (pauseOnHover && isHovered) return;
    const timer = setInterval(() => {
      setIndex(prev => {
        const next = prev + 1;
        return next >= count ? (loop ? 0 : prev) : next;
      });
    }, autoplayDelay);
    return () => clearInterval(timer);
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, count, loop]);

  // Hover pause
  useEffect(() => {
    if (!pauseOnHover || !containerRef.current) return;
    const el = containerRef.current;
    const enter = () => setIsHovered(true);
    const leave = () => setIsHovered(false);
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    return () => { el.removeEventListener('mouseenter', enter); el.removeEventListener('mouseleave', leave); };
  }, [pauseOnHover]);

  const getAdjacentIndex = useCallback((dx) => {
    if (dx < 0) return (index + 1) % count;             // dragging left → next
    if (dx > 0) return (index - 1 + count) % count;     // dragging right → prev
    return (index + 1) % count;                          // default
  }, [index, count]);

  const onPointerDown = (e) => {
    if (e.button !== 0 || animatingRef.current) return;
    startXRef.current = e.clientX;
    dxRef.current = 0;
    draggingRef.current = true;
    didDragRef.current = false;

    // Pre-position adjacent card off-screen to the right
    setAdjIndex((index + 1) % count);
    if (adjacentRef.current) {
      adjacentRef.current.style.transition = 'none';
      adjacentRef.current.style.transform = `translateX(${itemWidth}px)`;
      adjacentRef.current.style.visibility = 'visible';
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    const dx = Math.max(-itemWidth, Math.min(itemWidth, e.clientX - startXRef.current));
    dxRef.current = dx;

    if (Math.abs(dx) > 5) didDragRef.current = true;

    // Determine which adjacent card to show based on direction
    const newAdj = getAdjacentIndex(dx);
    if (newAdj !== adjIndex) setAdjIndex(newAdj);

    // sign: which side the adjacent card sits on
    const sign = dx <= 0 ? 1 : -1;
    const progress = Math.abs(dx) / itemWidth; // 0→1
    const tilt = (dx / itemWidth) * MAX_TILT_DEG;
    const adjTilt = sign * MAX_TILT_DEG * (1 - progress); // starts tilted, flattens as it arrives
    const currentScale = 1 - progress * 0.06;              // shrinks slightly as it leaves
    const adjScale = 0.94 + progress * 0.06;               // grows as it arrives

    if (currentRef.current) {
      currentRef.current.style.transition = 'none';
      currentRef.current.style.transform = `perspective(800px) translateX(${dx}px) rotateY(${tilt}deg) scale(${currentScale})`;
      currentRef.current.style.opacity = `${1 - progress * 0.3}`;
    }
    if (adjacentRef.current) {
      adjacentRef.current.style.transition = 'none';
      adjacentRef.current.style.transform = `perspective(800px) translateX(${dx + sign * itemWidth}px) rotateY(${adjTilt}deg) scale(${adjScale})`;
      adjacentRef.current.style.opacity = `${0.7 + progress * 0.3}`;
    }
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const dx = dxRef.current;
    const ratio = Math.abs(dx) / itemWidth;
    const commit = ratio >= COMMIT_THRESHOLD && Math.abs(dx) > 5;
    const sign = dx <= 0 ? 1 : -1; // +1 = went left (next), -1 = went right (prev)

    const SNAP_ALL = 'transform 280ms cubic-bezier(0.25, 1, 0.5, 1), opacity 280ms ease';

    if (commit) {
      animatingRef.current = true;
      if (currentRef.current) {
        currentRef.current.style.transition = SNAP_ALL;
        currentRef.current.style.transform = `perspective(800px) translateX(${-sign * itemWidth}px) rotateY(0deg) scale(0.94)`;
        currentRef.current.style.opacity = '0.7';
      }
      if (adjacentRef.current) {
        adjacentRef.current.style.transition = SNAP_ALL;
        adjacentRef.current.style.transform = `perspective(800px) translateX(0px) rotateY(0deg) scale(1)`;
        adjacentRef.current.style.opacity = '1';
      }
      setTimeout(() => {
        const newIdx = getAdjacentIndex(dx);
        setIndex(newIdx);
      }, 290);
    } else {
      // Snap back
      if (currentRef.current) {
        currentRef.current.style.transition = SNAP_ALL;
        currentRef.current.style.transform = 'perspective(800px) translateX(0) rotateY(0deg) scale(1)';
        currentRef.current.style.opacity = '1';
      }
      if (adjacentRef.current) {
        adjacentRef.current.style.transition = SNAP_ALL;
        adjacentRef.current.style.transform = `perspective(800px) translateX(${sign * itemWidth}px) rotateY(${sign * MAX_TILT_DEG}deg) scale(0.94)`;
        adjacentRef.current.style.opacity = '0.7';
      }
      setTimeout(() => {
        if (adjacentRef.current) adjacentRef.current.style.visibility = 'hidden';
        dxRef.current = 0;
      }, 290);
    }
  };

  // Suppress click events that bubble up after a drag
  const onClickCapture = (e) => {
    if (didDragRef.current) {
      e.stopPropagation();
      e.preventDefault();
      didDragRef.current = false;
    }
  };

  if (count === 0) return null;

  const item = items[index];
  const adjItem = items[adjIndex] || items[0];

  return (
    <div
      ref={containerRef}
      className={`carousel-container ${round ? 'round' : ''}`}
      style={{ width: `${baseWidth}px`, ...(round && { height: `${baseWidth}px`, borderRadius: '50%' }) }}
      onClickCapture={onClickCapture}
    >
      {/* Card track — clips overflow */}
      <div className="carousel-track-wrapper" style={{ position: 'relative', overflow: 'hidden', width: itemWidth }}>
        {/* Current card — in flow, sets height */}
        <div
          ref={currentRef}
          className={`carousel-item ${round ? 'round' : ''}`}
          style={{
            width: itemWidth,
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'pan-y',
            ...(round && { height: itemWidth, borderRadius: '50%' }),
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <CardContent item={item} round={round} />
        </div>

        {/* Adjacent card — absolute, hidden until drag */}
        <div
          ref={adjacentRef}
          className={`carousel-item ${round ? 'round' : ''}`}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: itemWidth, height: '100%',
            transform: `translateX(${itemWidth}px)`,
            visibility: 'hidden',
            ...(round && { borderRadius: '50%' }),
          }}
        >
          <CardContent item={adjItem} round={round} />
        </div>
      </div>

      <div className={`carousel-indicators-container ${round ? 'round' : ''}`}>
        <div className="carousel-indicators">
          {items.map((_, i) => (
            <div
              key={i}
              className={`carousel-indicator ${index === i ? 'active' : 'inactive'}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
