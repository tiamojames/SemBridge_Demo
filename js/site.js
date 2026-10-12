(() => {
  "use strict";
  const icons = window.SemBridgeIcons;
  icons?.mount();
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const status = document.getElementById("page-status");

  function tabs(list, onSelect) {
    const buttons = [...list.querySelectorAll('[role="tab"]')];
    function select(button) {
      buttons.forEach((item) => {
        item.setAttribute("aria-selected", String(item === button));
        item.tabIndex = item === button ? 0 : -1;
      });
      onSelect(button);
    }
    buttons.forEach((button, index) => {
      button.addEventListener("click", () => select(button));
      button.addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
        if (event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = buttons.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        select(buttons[next]);
        buttons[next].focus();
      });
    });
  }

  const tables = [...document.querySelectorAll("#tts .sample-table")];
  const language = document.getElementById("speech-language");
  let category = "standard";
  function filterSamples(announce = true) {
    let visible = 0;
    tables.forEach((table) => {
      let count = 0;
      table.querySelectorAll(".sample-row:not(.sample-header)").forEach((row) => {
        const lang = row.querySelector("strong").textContent.trim().slice(0, 2);
        row.hidden = language.value !== "all" && language.value !== lang;
        if (!row.hidden) count++;
      });
      table.hidden = table.dataset.collection !== category || count === 0;
      if (!table.hidden) visible += count;
    });
    document.querySelectorAll("#tts audio").forEach((audio) => {
      if (!audio.paused && (audio.closest(".sample-table").hidden || audio.closest(".sample-row").hidden)) {
        audio.pause();
        window.SemBridgeAudio?.close();
      }
    });
    document.getElementById("empty-samples").hidden = visible > 0;
    if (announce) {
      status.textContent = `${visible} speech samples shown.`;
      if (!reduceMotion.matches) document.getElementById("speech-samples").animate(
        [{ opacity: .45, transform: "translateY(7px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 230, easing: "ease-out" },
      );
    }
  }
  document.querySelectorAll(".sample-tabs button").forEach((button) => {
    const count = tables.filter((table) => table.dataset.collection === button.dataset.category)
      .reduce((sum, table) => sum + table.querySelectorAll(".sample-row:not(.sample-header)").length, 0);
    const label = document.createElement("span");
    label.textContent = String(count).padStart(2, "0");
    button.append(label);
  });
  tabs(document.querySelector(".sample-tabs"), (button) => {
    category = button.dataset.category;
    document.getElementById("speech-samples").setAttribute("aria-labelledby", button.id);
    filterSamples();
  });
  language.addEventListener("change", () => filterSamples());
  document.documentElement.classList.add("enhanced");
  document.querySelector(".sample-toolbar").hidden = false;
  filterSamples(false);

  const featured = document.getElementById("featured-audio");
  const features = {
    speech: { src: "audio/emotion/outputs/db6_happy_1.wav", text: "太好了，我们终于成功了！今晚一定要好好庆祝一下！", title: "Expressive speech / Happiness" },
    singing: { src: "audio/sembridge/outputs/SVS_ZH_R001.wav", text: "像我这样庸俗的人从不喜欢装深沉", title: "Singing / ZH R001" },
    unified: { src: "audio/unified/unified_zh_robust_caihong/generated.wav", text: "夜深了，送给大家一段《彩虹》，也送给那个让我一直牵挂的人。", title: "Unified / 彩虹" },
  };
  if (window.SemBridgeAudio) {
    document.querySelector(".hero-listen").hidden = false;
    tabs(document.querySelector(".hero-modes"), (button) => {
      const feature = features[button.dataset.feature];
      document.getElementById("featured-text").textContent = feature.text;
      document.getElementById("featured-panel").setAttribute("aria-labelledby", button.id);
      window.SemBridgeAudio.changeSource(featured, feature.src, feature.title);
      drawHero();
    });
  }

  const navLinks = [...document.querySelectorAll("nav a")];
  const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));
  let scrollQueued = false;
  function updateScroll() {
    scrollQueued = false;
    const line = document.querySelector(".site-header").offsetHeight + 90;
    let current = null;
    sections.forEach((section) => { if (section.getBoundingClientRect().top <= line) current = section.id; });
    navLinks.forEach((link) => {
      if (link.hash === `#${current}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    const max = document.documentElement.scrollHeight - innerHeight;
    document.querySelector(".reading-progress").style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  }
  addEventListener("scroll", () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });
  addEventListener("resize", updateScroll);
  updateScroll();

  if (!reduceMotion.matches && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove("is-pending");
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .07 });
    document.querySelectorAll(".reveal").forEach((element) => {
      if (element.getBoundingClientRect().top > innerHeight) element.classList.add("is-pending");
      observer.observe(element);
    });
  }

  const dialog = document.getElementById("architecture-dialog");
  if (typeof dialog.showModal === "function") {
    document.querySelector(".architecture-link").addEventListener("click", (event) => {
      event.preventDefault();
      dialog.showModal();
    });
    dialog.querySelector("button").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  }

  const copy = document.getElementById("copy-citation");
  copy.hidden = false;
  copy.addEventListener("click", async () => {
    const text = document.getElementById("bibtex").textContent;
    try {
      let copied = false;
      if (location.protocol !== "file:" && navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(text); copied = true; } catch { /* Fall back to a user-initiated selection copy. */ }
      }
      if (!copied) {
        const area = document.createElement("textarea");
        area.value = text;
        area.className = "sr-only";
        document.body.append(area);
        area.select();
        copied = document.execCommand("copy");
        area.remove();
        copy.focus({ preventScroll: true });
        if (!copied) throw new Error("Clipboard unavailable");
      }
      copy.replaceChildren(icons.make("check"));
      copy.title = "Copied";
      copy.setAttribute("aria-label", "BibTeX copied");
      status.textContent = "BibTeX copied to clipboard.";
      setTimeout(() => {
        copy.replaceChildren(icons.make("copy"));
        copy.title = "Copy BibTeX";
        copy.setAttribute("aria-label", "Copy BibTeX");
      }, 2200);
    } catch {
      const selection = getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.getElementById("bibtex"));
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = "Clipboard unavailable. Citation text selected for copying.";
    }
  });

  const hero = document.querySelector(".hero");
  const canvas = document.getElementById("hero-wave");
  const context = canvas.getContext("2d");
  let visible = true;
  let frame = 0;
  let pointer = .5;
  const tracks = Object.values(features).map((feature) => window.SEMBRIDGE_AUDIO?.[feature.src]?.peaks || []);
  function drawHero() {
    if (!context) return;
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const colors = ["#94bd88", "#d49a7f", "#91b6c8"];
    const playing = !featured.paused && !featured.ended;
    const progress = featured.currentTime / (featured.duration || 1);
    tracks.forEach((peaks, track) => {
      const center = height * (.32 + track * .21);
      const amplitude = width < 760 ? 28 : 65;
      for (let i = 0; i < 230; i++) {
        const x = i / 229 * width;
        const source = (i / 229 * (peaks.length - 1));
        const peak = peaks[Math.floor(source)] || 0;
        const edge = Math.pow(Math.abs(x / width - .5) * 2, 2);
        const focus = playing ? Math.max(0, 1 - Math.abs(i / 229 - progress) * 10) : Math.max(0, 1 - Math.abs(i / 229 - pointer) * 7);
        context.globalAlpha = (.025 + edge * (width < 760 ? .17 : .42)) + focus * .06;
        context.strokeStyle = colors[track];
        context.lineWidth = 1;
        const size = 3 + peak * amplitude;
        context.beginPath();
        context.moveTo(x, center - size);
        context.lineTo(x, center + size);
        context.stroke();
      }
    });
    context.globalAlpha = 1;
  }
  function animate() {
    cancelAnimationFrame(frame);
    drawHero();
    if (visible && !document.hidden && !featured.paused && !reduceMotion.matches) frame = requestAnimationFrame(animate);
  }
  hero.addEventListener("pointermove", (event) => {
    if (reduceMotion.matches) return;
    pointer = event.clientX / hero.clientWidth;
    if (featured.paused) drawHero();
  }, { passive: true });
  featured.addEventListener("play", animate);
  featured.addEventListener("pause", () => { cancelAnimationFrame(frame); drawHero(); });
  document.addEventListener("visibilitychange", animate);
  reduceMotion.addEventListener("change", animate);
  if ("ResizeObserver" in window) new ResizeObserver(drawHero).observe(hero);
  if ("IntersectionObserver" in window) new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; animate(); }).observe(hero);
  drawHero();
})();
