// Koplow Defense — shared site behavior.
// Handles partial includes, mobile menu, and reveal-on-scroll.

(async function () {
  if (document.body) {
    document.body.classList.add("page-shell-ready");
    window.setTimeout(() => {
      document.body.classList.remove("page-shell-boot");
    }, 520);
  }

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

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ---------- Page transitions ----------
  const initPageTransitions = () => {
    if (prefersReducedMotion) return;

    document.body.classList.add("page-transition-enabled");

    let leaving = false;
    const normalizePath = (pathname) =>
      pathname.replace(/\/index\.html$/, "/").replace(/\/+$/, "/");
    const currentPath = normalizePath(window.location.pathname);

    const shouldHandlePageLink = (anchor, event) => {
      if (event.defaultPrevented || leaving) return false;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return false;
      }

      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return false;
      if (/^(#|mailto:|tel:|javascript:)/i.test(rawHref)) return false;
      if (anchor.hasAttribute("download")) return false;

      const target = anchor.getAttribute("target");
      if (target && target.toLowerCase() !== "_self") return false;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return false;

      const nextPath = normalizePath(url.pathname);
      const currentSearch = window.location.search || "";
      if (nextPath === currentPath && url.search === currentSearch) {
        return false;
      }

      return url.pathname === "/" || url.pathname.endsWith(".html");
    };

    document.querySelectorAll('a[href]').forEach((anchor) => {
      anchor.addEventListener(
        "click",
        (event) => {
          if (!shouldHandlePageLink(anchor, event)) return;

          event.preventDefault();
          leaving = true;
          closeMenu();
          document.body.classList.add("is-page-leaving");

          window.setTimeout(() => {
            window.location.href = anchor.href;
          }, 220);
        },
        true
      );
    });

    window.addEventListener("pageshow", () => {
      leaving = false;
      document.body.classList.remove("is-page-leaving");
    });
  };

  initPageTransitions();

  // ---------- Reveal on scroll ----------
  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  const disableScrollReveal =
    window.matchMedia("(max-width: 1024px)").matches || prefersReducedMotion;

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
    { threshold: 0.1, rootMargin: "0px 0px -18% 0px" }
  );
  revealEls.forEach((el) => io.observe(el));

  // ---------- Desktop motion ----------
  // Native scroll with section reveals. The hero keeps a more cinematic
  // scroll-out, but section transitions themselves are activated by
  // IntersectionObserver rather than scroll locking.
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  document.body.classList.add("motion-ready");

  const heroContent =
    document.querySelector("[data-hero-content]") ||
    document.querySelector(".hero .hero-content");
  const hero = heroContent?.closest("section") || document.querySelector(".hero");
  if (!heroContent || !hero) return;

  let frame = 0;
  const applyHero = () => {
    frame = 0;
    const heroH = hero.offsetHeight || 1;
    const y = window.scrollY;
    const tHeroOut = clamp((y - heroH * 0.08) / (heroH * 0.72), 0, 1);

    heroContent.style.setProperty(
      "--hero-fade-opacity",
      String(Math.max(0.44, 1 - tHeroOut * 0.56))
    );
    heroContent.style.setProperty(
      "--hero-fade-translate",
      `${-tHeroOut * 44}px`
    );
    heroContent.style.setProperty(
      "--hero-fade-scale",
      String(1 - tHeroOut * 0.022)
    );
    heroContent.style.setProperty(
      "--hero-fade-blur",
      `${tHeroOut * 1.65}px`
    );
  };

  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(applyHero);
  };
  document.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  applyHero();

})();
