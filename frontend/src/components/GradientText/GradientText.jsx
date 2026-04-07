import { useEffect, useRef, useState } from 'react';
import './GradientText.css';

export default function GradientText({
  children,
  colors = ['#00f5a0', '#00d9f5', '#00f5a0'],
  animationSpeed = 4,
  className = '',
}) {
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      setElapsed((ts - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const progress = (elapsed % animationSpeed) / animationSpeed;
  // Build gradient string — duplicate first color at end for seamless loop
  const extendedColors = [...colors, colors[0]];
  const gradientStr = extendedColors.map((c, i) => `${c} ${(i / (extendedColors.length - 1)) * 100}%`).join(', ');
  const bgSize = 300;
  const offset = progress * bgSize;

  return (
    <span
      className={`gradient-text ${className}`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${gradientStr})`,
        backgroundSize: `${bgSize}% 100%`,
        backgroundPosition: `${offset}% 0%`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      {children}
    </span>
  );
}
