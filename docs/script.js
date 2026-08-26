(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = Array.from(document.querySelectorAll(".reveal"));

  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12,
      },
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const menuToggle = document.querySelector("#menu-toggle");
  const mobileNav = document.querySelector("#mobile-nav");

  if (menuToggle && mobileNav) {
    const closeMenu = () => {
      menuToggle.setAttribute("aria-expanded", "false");
      mobileNav.hidden = true;
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      mobileNav.hidden = isOpen;
    });

    mobileNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });
  }

  const copyButton = document.querySelector("#copy-install");
  const copyStatus = document.querySelector("#copy-status");

  if (copyButton && copyStatus) {
    const originalLabel = copyButton.textContent.trim();

    copyButton.addEventListener("click", async () => {
      const value = copyButton.dataset.copy || "";

      try {
        await navigator.clipboard.writeText(value);
        copyButton.textContent = "Copied";
        copyStatus.textContent = "Commands copied to your clipboard.";
      } catch {
        copyStatus.textContent = "Copy was blocked. Select the two commands above.";
      }

      window.setTimeout(() => {
        copyButton.textContent = originalLabel;
        copyStatus.textContent = "";
      }, 2200);
    });
  }
})();
