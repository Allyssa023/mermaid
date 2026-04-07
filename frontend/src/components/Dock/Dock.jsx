import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import './Dock.css';

function DockItem({
  children,
  label,
  onClick,
  isActive,
  mouseY,
  baseSize = 44,
  magnification = 60,
  distance = 150,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
}) {
  const ref = useRef(null);

  const distFromMouse = useTransform(mouseY, (val) => {
    const el = ref.current;
    if (!el) return distance + 1;
    const rect = el.getBoundingClientRect();
    return val - rect.top - rect.height / 2;
  });

  const sizeRaw = useTransform(distFromMouse, [-distance, 0, distance], [baseSize, magnification, baseSize]);
  const size = useSpring(sizeRaw, spring);

  return (
    <motion.div
      ref={ref}
      className={`dock-item${isActive ? ' dock-item--active' : ''}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <div className="dock-icon">{children}</div>
      <span className="dock-label">{label}</span>
    </motion.div>
  );
}

export default function Dock({
  items = [],
  magnification = 60,
  distance = 150,
  baseItemSize = 44,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
}) {
  const mouseY = useMotionValue(Infinity);

  return (
    <motion.nav
      className="dock"
      onMouseMove={(e) => mouseY.set(e.clientY)}
      onMouseLeave={() => mouseY.set(Infinity)}
    >
      <div className="dock-logo">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div className="dock-items">
        {items.map((item) => (
          <DockItem
            key={item.id}
            label={item.label}
            onClick={item.onClick}
            isActive={item.isActive}
            mouseY={mouseY}
            baseSize={baseItemSize}
            magnification={magnification}
            distance={distance}
            spring={spring}
          >
            {item.icon}
          </DockItem>
        ))}
      </div>
    </motion.nav>
  );
}
