import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const COLORS = [
  "var(--primary)",
  "var(--status-active)",
  "var(--status-listed)",
  "var(--status-sold)",
  "var(--status-expiring)",
];

type Particle = { id: number; x: number; rotate: number; delay: number; color: string; size: number };

/**
 * A brief, tasteful confetti burst — reserved for genuinely good news, like a
 * domain being marked sold. Non-interactive and reduced-motion aware.
 */
export function Confetti({ fire, duration = 1800 }: { fire: number; duration?: number }) {
  const [visible, setVisible] = useState(false);

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 36 }).map((_, index) => ({
        id: index,
        x: (Math.random() - 0.5) * 420,
        rotate: Math.random() * 360,
        delay: Math.random() * 0.12,
        color: COLORS[index % COLORS.length],
        size: 6 + Math.random() * 6,
      })),
    // regenerate on each fire
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fire]
  );

  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), duration);
    return () => window.clearTimeout(timer);
  }, [fire, duration]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex justify-center" aria-hidden>
      <AnimatePresence>
        {visible
          ? particles.map(particle => (
              <motion.span
                key={`${fire}-${particle.id}`}
                className="absolute rounded-[2px]"
                style={{ width: particle.size, height: particle.size * 1.6, backgroundColor: particle.color }}
                initial={{ opacity: 0, y: 0, x: 0, rotate: 0, scale: 0.6 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [0, 120 + Math.random() * 160, 260],
                  x: particle.x,
                  rotate: particle.rotate,
                  scale: 1,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: duration / 1000, delay: particle.delay, ease: "easeOut" }}
              />
            ))
          : null}
      </AnimatePresence>
    </div>
  );
}
