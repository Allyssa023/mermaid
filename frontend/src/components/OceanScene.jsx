import './OceanScene.css';

export function OceanScene() {
  return (
    <div className="ocean-scene" aria-hidden>
      {/* Water layers / depth */}
      <div className="ocean-scene__water ocean-scene__water--top" />
      <div className="ocean-scene__water ocean-scene__water--mid" />
      <div className="ocean-scene__water ocean-scene__water--deep" />

      {/* Bubbles */}
      <div className="ocean-scene__bubbles">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <span key={i} className="ocean-scene__bubble" style={{ '--i': i }} />
        ))}
      </div>

      {/* Underwater plants */}
      <svg className="ocean-scene__plants" viewBox="0 0 400 400" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="plant-dark" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#2B4E7A" />
            <stop offset="100%" stopColor="#4A3C72" />
          </linearGradient>
          <linearGradient id="plant-teal" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#2B4E7A" />
            <stop offset="100%" stopColor="#4682B4" />
          </linearGradient>
          <linearGradient id="plant-light" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#4682B4" />
            <stop offset="100%" stopColor="#ADD8E6" />
          </linearGradient>
        </defs>
        {/* Seaweed / kelp shapes */}
        <path className="ocean-scene__plant ocean-scene__plant--1" fill="url(#plant-dark)" d="M 80 400 Q 60 320 90 240 Q 70 180 100 120 L 105 120 Q 75 180 95 240 Q 65 320 85 400 Z" />
        <path className="ocean-scene__plant ocean-scene__plant--2" fill="url(#plant-teal)" d="M 180 400 Q 160 300 190 200 Q 165 120 200 60 L 205 60 Q 170 120 195 200 Q 165 300 185 400 Z" />
        <path className="ocean-scene__plant ocean-scene__plant--3" fill="url(#plant-light)" d="M 280 400 Q 260 340 290 260 Q 270 200 300 140 L 305 140 Q 275 200 295 260 Q 265 340 285 400 Z" />
        <path className="ocean-scene__plant ocean-scene__plant--4" fill="url(#plant-dark)" d="M 350 400 Q 330 310 360 220 Q 335 150 370 80 L 375 80 Q 340 150 365 220 Q 335 310 355 400 Z" />
        <path className="ocean-scene__plant ocean-scene__plant--5" fill="url(#plant-teal)" d="M 20 400 Q 10 350 35 280 Q 15 220 40 160 L 45 160 Q 20 220 38 280 Q 18 350 28 400 Z" />
      </svg>

      {/* Whale image — white background removed via mix-blend-mode, animated */}
      <div className="ocean-scene__whales">
        <img
          src="/whale.jpg"
          alt=""
          className="ocean-scene__whale ocean-scene__whale--large"
          draggable={false}
        />
        <img
          src="/whale.jpg"
          alt=""
          className="ocean-scene__whale ocean-scene__whale--small"
          draggable={false}
        />
      </div>
    </div>
  );
}
