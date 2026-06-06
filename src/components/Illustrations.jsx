import React from 'react';

const Person = ({ cx, cy, fill = "#334155", scale = 1 }) => (
  <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
    <circle cx="0" cy="-12" r="4" fill={fill} />
    <rect x="-3" y="-5" width="6" height="14" rx="3" fill={fill} />
  </g>
);

export const BalloonsCard = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full rounded-sm">
    <rect width="100" height="100" fill="#ffe4e6" />
    <line x1="30" y1="40" x2="30" y2="80" stroke="#94a3b8" strokeWidth="2" />
    <line x1="50" y1="30" x2="50" y2="80" stroke="#94a3b8" strokeWidth="2" />
    <line x1="70" y1="50" x2="70" y2="80" stroke="#94a3b8" strokeWidth="2" />
    <circle cx="30" cy="40" r="8" fill="#38bdf8" />
    <circle cx="50" cy="30" r="8" fill="#f87171" />
    <circle cx="70" cy="50" r="8" fill="#4ade80" />
    <Person cx="30" cy="90" />
    <Person cx="50" cy="90" />
    <Person cx="70" cy="90" />
  </svg>
);

export const LandscapeCard = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full rounded-sm">
    <rect width="100" height="100" fill="#e0f2fe" />
    <rect x="0" y="70" width="100" height="30" fill="#bbf7d0" />
    <circle cx="80" cy="30" r="8" fill="#fef08a" />
    <Person cx="30" cy="70" />
    <rect x="20" y="55" width="4" height="20" fill="#cbd5e1" />
    <rect x="80" y="55" width="4" height="20" fill="#cbd5e1" />
  </svg>
);

export const CakeCard = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full rounded-sm">
    <rect width="100" height="100" fill="#fce7f3" />
    <rect x="35" y="60" width="30" height="20" fill="#ffffff" />
    <rect x="48" y="45" width="4" height="15" fill="#fca5a5" />
    <circle cx="50" cy="40" r="3" fill="#fde047" />
    <Person cx="20" cy="75" />
    <Person cx="80" cy="75" />
  </svg>
);

export const CurtainCard = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full rounded-sm">
    <rect width="100" height="100" fill="#1e1b4b" />
    <rect x="10" y="0" width="10" height="100" fill="#4c1d95" />
    <rect x="30" y="0" width="10" height="100" fill="#4c1d95" />
    <rect x="60" y="0" width="10" height="100" fill="#4c1d95" />
    <rect x="80" y="0" width="10" height="100" fill="#4c1d95" />
    <Person cx="25" cy="80" fill="#818cf8" />
    <Person cx="50" cy="80" fill="#818cf8" />
    <Person cx="75" cy="80" fill="#818cf8" />
  </svg>
);

export const BeigeCard = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full rounded-sm">
    <rect width="100" height="100" fill="#ffedd5" />
    <rect x="0" y="70" width="100" height="30" fill="#edd1b0" />
    <rect x="20" y="60" width="10" height="20" fill="#d6b592" />
    <rect x="70" y="60" width="10" height="20" fill="#d6b592" />
    <Person cx="40" cy="75" fill="#a8a29e" />
    <Person cx="60" cy="75" fill="#a8a29e" />
  </svg>
);

export const SinglePersonCard = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full rounded-sm">
    <rect width="100" height="100" fill="#e0f2fe" />
    <Person cx="50" cy="80" scale="1.2" />
  </svg>
);

export const ScannerCardBg = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full rounded-sm">
    <defs>
      <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#bae6fd" />
        <stop offset="100%" stopColor="#d8b4fe" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#scanGrad)" />
    <rect x="20" y="0" width="8" height="100" fill="#f3e8ff" opacity="0.4" />
    <rect x="50" y="0" width="8" height="100" fill="#f3e8ff" opacity="0.4" />
    <rect x="80" y="0" width="8" height="100" fill="#f3e8ff" opacity="0.4" />
  </svg>
);

export const GreenFourCard = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full rounded-sm">
    <rect width="100" height="100" fill="#dcfce7" />
    <circle cx="80" cy="20" r="8" fill="#fbbf24" />
    <Person cx="20" cy="80" />
    <Person cx="40" cy="80" />
    <Person cx="60" cy="80" />
    <Person cx="80" cy="80" />
  </svg>
);

export const MountainCard = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full rounded-sm">
    <rect width="100" height="100" fill="#f1f5f9" />
    <polygon points="30,80 10,50 50,50" fill="#cbd5e1" transform="scale(1, 1.5) translate(0, -25)" />
    <polygon points="70,80 50,60 90,60" fill="#94a3b8" transform="scale(1, 1.5) translate(0, -25)" />
    <rect x="0" y="80" width="100" height="20" fill="#e2e8f0" />
    <rect x="25" y="60" width="4" height="20" fill="#cbd5e1" />
    <rect x="75" y="60" width="4" height="20" fill="#cbd5e1" />
  </svg>
);

export const GreenTwoCard = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full rounded-sm">
    <rect width="100" height="100" fill="#dcfce7" />
    <rect x="0" y="70" width="100" height="30" fill="#bbf7d0" />
    <rect x="20" y="55" width="4" height="20" fill="#cbd5e1" />
    <rect x="80" y="55" width="4" height="20" fill="#cbd5e1" />
  </svg>
);

export const NightDiamondCard = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full rounded-sm">
    <rect width="100" height="100" fill="#1e3a8a" />
    <polygon points="20,30 25,20 30,30 25,40" fill="#3b82f6" />
    <polygon points="50,20 55,10 60,20 55,30" fill="#3b82f6" />
    <polygon points="80,30 85,20 90,30 85,40" fill="#3b82f6" />
    <Person cx="25" cy="80" fill="#93c5fd" />
    <Person cx="50" cy="80" fill="#93c5fd" />
    <Person cx="75" cy="80" fill="#93c5fd" />
  </svg>
);
