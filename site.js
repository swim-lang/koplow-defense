// Koplow Defense — shared site behavior.
// Handles partial includes, mobile menu, and reveal-on-scroll.

(async function () {
  // ---------- Include partials ----------
  // Any element with data-include="path.html" gets replaced by that file's contents.
  const includeEls = Array.from(document.querySelectorAll("[data-include]"));
  await Promise.all(
    includeEls.map(async (el) => {
      const path = el.getAttribute("data-include");
      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const html = await res.text();
        el.outerHTML = html;
      } catch (err) {
        console.error(`[include] failed to load ${path}:`, err);
      }
    })
  );

  // ---------- Photo surfaces ----------
  // Use a CSS custom property so markup can choose images without hardcoding
  // escaped file paths into the stylesheet.
  document.querySelectorAll("[data-photo]").forEach((el) => {
    const path = el.getAttribute("data-photo");
    if (!path) return;

    el.style.setProperty("--photo-url", `url("${encodeURI(path)}")`);
  });

  // ---------- Mobile menu ----------
  const menu = document.getElementById("mobileMenu");
  const toggle = document.querySelector(".menu-toggle");
  const closeBtn = document.querySelector(".menu-close");

  const openMenu = () => {
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };
  const closeMenu = () => {
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  toggle?.addEventListener("click", openMenu);
  closeBtn?.addEventListener("click", closeMenu);
  document
    .querySelectorAll(".mobile-links a, .mobile-cta")
    .forEach((a) => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu?.classList.contains("is-open")) closeMenu();
  });

  // ---------- Reveal on scroll ----------
  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  const disableScrollReveal =
    window.matchMedia("(max-width: 768px)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (disableScrollReveal) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0, rootMargin: "0px 0px -12% 0px" }
  );
  revealEls.forEach((el) => io.observe(el));

  // ---------- Scroll-driven cross-fades ----------
  // Sections marked .crossfade get their opacity/translate set from
  // scroll position so adjacent sections cross-fade smoothly instead of
  // hard-cutting. Sections also fade out as they exit the viewport so the
  // handoff to the next section feels continuous.
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const ease = (x) => x * x * (3 - 2 * x); // smoothstep

  // Any element marked with [data-hero-content] gets the scroll-out fade;
  // its enclosing <section> is treated as the hero for height/timing.
  // Falls back to the home page convention (.hero .hero-content) so existing
  // pages keep working.
  const heroContent =
    document.querySelector("[data-hero-content]") ||
    document.querySelector(".hero .hero-content");
  const hero = heroContent?.closest("section") || document.querySelector(".hero");
  const fadeSections = Array.from(
    document.querySelectorAll(".crossfade")
  );

  if (heroContent || fadeSections.length) {
    let frame = 0;
    const apply = () => {
      frame = 0;
      const winH = window.innerHeight;
      const y = window.scrollY;

      // Hero scroll-out (fades the hero's inner content as you leave it).
      if (heroContent && hero) {
        const heroH = hero.offsetHeight || 1;
        const tHeroOut = clamp((y - heroH * 0.1) / (heroH * 0.75), 0, 1);
        heroContent.style.setProperty(
          "--hero-fade-opacity",
          String(1 - tHeroOut)
        );
        heroContent.style.setProperty(
          "--hero-fade-translate",
          `${-tHeroOut * 24}px`
        );
      }

      // For each scroll-fade section: enter as it scrolls into view from
      // below, and gently fade out as it leaves the top of the viewport.
      // The first fade-in section (immediately after the hero) is keyed off
      // the hero's scroll-out so the two motions stay synchronized.
      fadeSections.forEach((sec, idx) => {
        const rect = sec.getBoundingClientRect();
        const nextSection = sec.nextElementSibling;
        const hasSuccessor =
          nextSection?.classList.contains("crossfade") ||
          nextSection?.classList.contains("snap-section");
        // Per-section motion controls:
        //   data-lift="N"       — entry translateY in px (default 16, upward).
        //   data-exit-lift="N"  — exit translateY in px (default -12, upward).
        // Positive values translate downward; negative translate upward.
        const enterLift =
          sec.dataset.lift != null ? Number(sec.dataset.lift) : 16;
        const exitLift =
          sec.dataset.exitLift != null ? Number(sec.dataset.exitLift) : -12;

        let tIn;
        if (idx === 0 && hero) {
          // Coordinate with hero scroll-out.
          const heroH = hero.offsetHeight || 1;
          tIn = ease(clamp((y - heroH * 0.35) / (heroH * 0.6), 0, 1));
        } else {
          // Generic: extend the entry window so the cross-fade overlaps
          // longer with the prior section's exit — the section feels like
          // it's already there coming into focus, not arriving.
          const enterStart = winH * 1.1;
          const enterEnd = winH * 0.15;
          tIn = ease(
            clamp((enterStart - rect.top) / (enterStart - enterEnd), 0, 1)
          );
        }

        // Exit fade runs when the next section is another managed handoff,
        // whether that next moment cross-fades or settles in as a snap stop.
        let tOut = 0;
        if (hasSuccessor) {
          const exitStart = winH * 0.6;
          tOut = clamp((exitStart - rect.bottom) / exitStart, 0, 1);
        }

        const opacity = Math.min(tIn, 1 - tOut);
        const translate = (1 - tIn) * enterLift + tOut * exitLift;
        sec.style.setProperty("--enter-opacity", String(opacity));
        sec.style.setProperty("--enter-translate", `${translate}px`);

        if (tIn > 0.35) sec.classList.add("in-view");
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    apply();
  }

  // ---------- Soft snap settling ----------
  // The client wanted a gentle "arrival" on a few key sections, but native
  // CSS scroll snapping can hijack scroll feel in some browsers/webviews and
  // behave more like a lock than a nudge. Instead, wait until scrolling
  // pauses and only then softly settle a nearby snap section into place.
  const snapSections = Array.from(document.querySelectorAll(".snap-section"));
  const disableSoftSnap =
    snapSections.length === 0 ||
    window.matchMedia("(max-width: 768px)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!disableSoftSnap) {
    let snapTimer = 0;
    let snapSettling = false;
    let snapSuppressUntil = 0;

    const cancelSoftSnap = () => {
      clearTimeout(snapTimer);
      snapSettling = false;
      snapSuppressUntil = performance.now() + 400;
    };

    const getSnapCandidate = () => {
      const vh = window.innerHeight;
      const bandTop = -vh * 0.12;
      const bandBottom = vh * 0.28;

      return snapSections
        .map((section) => ({
          section,
          top: section.getBoundingClientRect().top,
        }))
        .filter(({ top }) => top >= bandTop && top <= bandBottom)
        .sort((a, b) => Math.abs(a.top) - Math.abs(b.top))[0];
    };

    const waitForSettle = () => {
      let lastY = window.scrollY;
      let stableFrames = 0;
      let checks = 0;

      const poll = () => {
        checks += 1;
        const nextY = window.scrollY;
        if (Math.abs(nextY - lastY) < 2) {
          stableFrames += 1;
        } else {
          stableFrames = 0;
        }
        lastY = nextY;

        if (stableFrames >= 3 || checks >= 30) {
          snapSettling = false;
          snapSuppressUntil = performance.now() + 250;
          return;
        }

        window.setTimeout(poll, 50);
      };

      window.setTimeout(poll, 50);
    };

    const settleSoftSnap = () => {
      if (snapSettling) return;
      if (performance.now() < snapSuppressUntil) {
        clearTimeout(snapTimer);
        snapTimer = window.setTimeout(
          settleSoftSnap,
          Math.max(40, snapSuppressUntil - performance.now() + 20)
        );
        return;
      }

      const candidate = getSnapCandidate();
      if (!candidate) return;

      const targetY = Math.round(window.scrollY + candidate.top);
      if (Math.abs(targetY - window.scrollY) < 6) return;

      snapSettling = true;
      window.scrollTo({ top: targetY, behavior: "smooth" });
      waitForSettle();
    };

    const scheduleSoftSnap = () => {
      if (snapSettling) return;
      clearTimeout(snapTimer);
      snapTimer = window.setTimeout(settleSoftSnap, 140);
    };

    document.addEventListener("scroll", scheduleSoftSnap, { passive: true });
    window.addEventListener("wheel", cancelSoftSnap, { passive: true });
    window.addEventListener("touchstart", cancelSoftSnap, { passive: true });
    window.addEventListener("keydown", cancelSoftSnap, { passive: true });
  }
})();
