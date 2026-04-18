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
    { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
  );
  revealEls.forEach((el) => io.observe(el));
})();
