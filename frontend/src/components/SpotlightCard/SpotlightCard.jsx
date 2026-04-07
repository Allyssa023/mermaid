import { useRef } from 'react';
import './SpotlightCard.css';

export default function SpotlightCard({ children, className = '', spotlightColor = 'rgba(0, 255, 200, 0.08)' }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    el.style.setProperty('--spotlight-color', spotlightColor);
  };

  return (
    <div ref={cardRef} className={`card-spotlight ${className}`} onMouseMove={handleMouseMove}>
      {children}
    </div>
  );
}
