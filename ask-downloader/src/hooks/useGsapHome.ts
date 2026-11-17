import { useEffect, RefObject } from 'react';

type Gsap = typeof import('gsap').default;
type ScrollTriggerType = typeof import('gsap/ScrollTrigger').ScrollTrigger;

/**
 * Homepage GSAP layer. Deliberately touches only elements it owns —
 * [data-gsap="..."] targets and plain <h2> headings — never framer-motion
 * elements, so the two libraries never fight over the same transform.
 * Initial hidden states are set by GSAP itself, so if JS fails the page
 * simply renders un-animated. Fully disabled for prefers-reduced-motion.
 *
 * Speed: these effects are decoration only, so GSAP (about 70 KB) is no
 * longer part of the home page's first download. It is fetched after the page
 * has been shown (when the browser is idle) and the animations start then.
 * Headings that are already on screen at that moment are left as they are
 * instead of being hidden and wiped in again.
 */
function setup(gsap: Gsap, ScrollTrigger: ScrollTriggerType, root: HTMLElement): () => void {
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  const ctx = gsap.context(() => {
    mm.add(
      {
        motionOk: '(prefers-reduced-motion: no-preference)',
        fine: '(pointer: fine)',
      },
      (c) => {
        const { motionOk, fine } = c.conditions as { motionOk: boolean; fine: boolean };
        if (!motionOk) return;

        // 1. Scroll progress bar
        gsap.fromTo(
          '[data-gsap="progress"]',
          { scaleX: 0 },
          { scaleX: 1, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.3 } }
        );

        // 2. Orbs drift slower than the page (depth)
        gsap.to('[data-gsap="orbs"]', {
          yPercent: 18,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 1 },
        });

        // 3. Floating particles
        gsap.utils.toArray<HTMLElement>('[data-gsap="particle"]').forEach((p) => {
          gsap.set(p, { opacity: gsap.utils.random(0.25, 0.7) });
          gsap.to(p, {
            x: gsap.utils.random(-40, 40),
            y: gsap.utils.random(-60, 60),
            scale: gsap.utils.random(0.6, 1.4),
            duration: gsap.utils.random(4, 9),
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            delay: gsap.utils.random(0, 3),
          });
        });

        // 4. Section headings: mask-wipe reveal (only for headings still below the fold)
        gsap.utils.toArray<HTMLElement>('[data-gsap-scope] h2').forEach((h) => {
          if (h.getBoundingClientRect().top < window.innerHeight * 0.88) return; // already visible: do not hide it again
          gsap.from(h, {
            clipPath: 'inset(0 0 100% 0)',
            y: 28,
            opacity: 0,
            duration: 0.9,
            ease: 'power4.out',
            scrollTrigger: { trigger: h, start: 'top 88%', once: true },
          });
        });

        // 5. Desktop-only pointer effects
        if (fine) {
          const spot = root.querySelector<HTMLElement>('[data-gsap="spotlight"]');
          const orbs = root.querySelector<HTMLElement>('[data-gsap="orbs-mouse"]');
          const sx = spot ? gsap.quickTo(spot, 'x', { duration: 0.6, ease: 'power3' }) : null;
          const sy = spot ? gsap.quickTo(spot, 'y', { duration: 0.6, ease: 'power3' }) : null;
          const ox = orbs ? gsap.quickTo(orbs, 'x', { duration: 1.2, ease: 'power2' }) : null;
          const oy = orbs ? gsap.quickTo(orbs, 'y', { duration: 1.2, ease: 'power2' }) : null;
          if (spot) gsap.to(spot, { opacity: 1, duration: 0.8 });

          const onMove = (e: PointerEvent) => {
            sx?.(e.clientX);
            sy?.(e.clientY);
            ox?.((e.clientX / window.innerWidth - 0.5) * 40);
            oy?.((e.clientY / window.innerHeight - 0.5) * 40);
          };
          window.addEventListener('pointermove', onMove, { passive: true });
          return () => window.removeEventListener('pointermove', onMove);
        }
      }
    );
  }, root);

  // Blog/cards load async — recompute trigger positions once they land.
  const t = window.setTimeout(() => ScrollTrigger.refresh(), 1200);

  return () => {
    window.clearTimeout(t);
    mm.revert();
    ctx.revert();
  };
}

export function useGsapHome(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;
    let idleId = 0;
    let timerId = 0;

    const start = () => {
      Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
        .then(([g, st]) => {
          if (cancelled) return;
          cleanup = setup(g.default, st.ScrollTrigger, root);
        })
        .catch(() => {
          // GSAP could not load: the page simply stays un-animated.
        });
    };

    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(start, { timeout: 1500 });
    else timerId = window.setTimeout(start, 400);

    return () => {
      cancelled = true;
      if (idleId && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      if (timerId) window.clearTimeout(timerId);
      cleanup?.();
    };
  }, [rootRef]);
}
