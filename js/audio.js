(() => {
  "use strict";
  const icons = window.SemBridgeIcons;
  const waveformData = window.SEMBRIDGE_AUDIO || {};
  const audios = [...document.querySelectorAll("audio")];
  const controllers = new Map();
  const dock = document.getElementById("player-dock");
  const dockToggle = document.getElementById("dock-toggle");
  const dockSeek = document.getElementById("dock-seek");
  const dockMute = document.getElementById("dock-mute");
  let active = null;

  function time(value) {
    const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function iconButton(button, name, label) {
    button.replaceChildren(icons.make(name));
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  function updateDock() {
    if (!active) return;
    const state = controllers.get(active);
    const duration = state.duration();
    dockSeek.max = duration || 1;
    dockSeek.value = active.currentTime || 0;
    dockSeek.setAttribute("aria-valuetext", `${time(active.currentTime)} of ${time(duration)}`);
    document.getElementById("dock-time").textContent = `${time(active.currentTime)} / ${time(duration)}`;
    const playing = !active.paused && !active.ended;
    if (dockToggle.dataset.playing !== String(playing)) {
      iconButton(dockToggle, playing ? "pause" : "play", playing ? "Pause audio" : "Play audio");
      dockToggle.dataset.playing = String(playing);
    }
    iconButton(dockMute, active.muted ? "volume-x" : "volume-2", active.muted ? "Unmute audio" : "Mute audio");
  }

  function showDock(audio) {
    active = audio;
    const state = controllers.get(audio);
    document.getElementById("dock-title").textContent = state.title;
    document.getElementById("dock-subtitle").textContent = state.label;
    document.getElementById("dock-download").href = audio.src;
    dock.hidden = false;
    document.body.classList.add("has-player");
    updateDock();
  }

  function closeDock() {
    const audio = active;
    active = null;
    if (audio) audio.pause();
    dock.hidden = true;
    document.body.classList.remove("has-player");
  }

  async function play(audio) {
    audios.forEach((other) => { if (other !== audio) other.pause(); });
    try {
      await audio.play();
    } catch (error) {
      if (error.name !== "AbortError") controllers.get(audio).showError();
    }
  }

  function createPlayer(audio) {
    const card = audio.closest(".sample-row, .unified-example");
    const isPrompt = /\/prompts?\//.test(audio.getAttribute("src")) || /\/prompt\.wav$/.test(audio.getAttribute("src"));
    const state = {
      title: card?.querySelector(".sample-meta, h3")?.textContent.trim().replace(/\s+/g, " ") || "Featured speech",
      label: isPrompt ? "Prompt" : "SemBridge",
      data: waveformData[audio.getAttribute("src")] || { duration: 0, peaks: [] },
      duration() { return Number.isFinite(audio.duration) ? audio.duration : this.data.duration; },
    };
    const player = document.createElement("div");
    player.className = "audio-player";
    player.dataset.kind = isPrompt ? "prompt" : "generated";
    player.innerHTML = '<div class="audio-label"><span></span><span class="audio-time"></span></div><div class="audio-controls"><button class="play-button" type="button"></button><div class="waveform-control"><canvas aria-hidden="true"></canvas><input type="range" min="0" max="1" value="0" step="0.05"></div></div>';
    const button = player.querySelector("button");
    const seek = player.querySelector("input");
    const canvas = player.querySelector("canvas");
    const clock = player.querySelector(".audio-time");
    const context = canvas.getContext("2d");
    let pendingSeek = null;

    function draw() {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height || !context) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(bounds.width * dpr) || canvas.height !== Math.round(bounds.height * dpr)) {
        canvas.width = Math.round(bounds.width * dpr);
        canvas.height = Math.round(bounds.height * dpr);
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);
      const color = getComputedStyle(player).getPropertyValue("--audio-color").trim();
      const progress = audio.currentTime / (state.duration() || 1);
      const count = Math.min(state.data.peaks.length, Math.floor(bounds.width / 4));
      if (!count) {
        context.fillStyle = color;
        context.globalAlpha = .25;
        context.fillRect(0, bounds.height / 2, bounds.width, 1);
        context.globalAlpha = 1;
        return;
      }
      for (let i = 0; i < count; i++) {
        const peak = state.data.peaks[Math.floor(i * state.data.peaks.length / count)];
        const height = Math.max(2, Math.pow(peak, .7) * (bounds.height - 3));
        context.fillStyle = color;
        context.globalAlpha = i / count <= progress ? 1 : .32;
        context.fillRect(i * bounds.width / count, (bounds.height - height) / 2, 2, height);
      }
      context.globalAlpha = 1;
    }

    function update() {
      const playing = !audio.paused && !audio.ended;
      player.classList.toggle("is-playing", playing);
      const label = `${playing ? "Pause" : "Play"} ${state.label}: ${state.title}`;
      if (button.getAttribute("aria-label") !== label) iconButton(button, playing ? "pause" : "play", label);
      seek.max = state.duration() || 1;
      if (pendingSeek === null) seek.value = audio.currentTime || 0;
      seek.setAttribute("aria-label", `Seek ${state.label}: ${state.title}`);
      seek.setAttribute("aria-valuetext", `${time(audio.currentTime)} of ${time(state.duration())}`);
      clock.textContent = audio.currentTime > 0 ? `${time(audio.currentTime)} / ${time(state.duration())}` : time(state.duration());
      player.querySelector(".audio-label > span").textContent = state.label;
      draw();
      if (active === audio) updateDock();
    }

    function seekTo(value) {
      const target = Math.min(Math.max(0, value), state.duration() || 0);
      if (audio.readyState >= 1) {
        audio.currentTime = target;
        update();
      } else {
        pendingSeek = target;
        audio.load();
      }
    }

    state.showError = () => {
      player.classList.add("is-error");
      player.removeAttribute("aria-busy");
      clock.textContent = "Audio unavailable";
      document.getElementById("page-status").textContent = `${state.title}: audio could not be played. Please try again.`;
    };
    state.reset = () => {
      pendingSeek = null;
      player.classList.remove("is-error");
      state.data = waveformData[audio.getAttribute("src")] || { duration: 0, peaks: [] };
      update();
    };
    state.seek = seekTo;
    state.player = player;
    controllers.set(audio, state);
    button.addEventListener("click", () => {
      player.classList.remove("is-error");
      if (audio.paused) play(audio);
      else audio.pause();
    });
    seek.addEventListener("input", () => seekTo(Number(seek.value)));
    audio.addEventListener("play", () => {
      showDock(audio);
      update();
    });
    audio.addEventListener("loadedmetadata", () => {
      if (pendingSeek !== null) {
        audio.currentTime = Math.min(pendingSeek, audio.duration);
        pendingSeek = null;
      }
      update();
    });
    ["timeupdate", "pause", "ended", "durationchange", "volumechange", "emptied"].forEach((event) => audio.addEventListener(event, update));
    audio.addEventListener("waiting", () => player.setAttribute("aria-busy", "true"));
    audio.addEventListener("playing", () => player.removeAttribute("aria-busy"));
    audio.addEventListener("pause", () => player.removeAttribute("aria-busy"));
    audio.addEventListener("error", state.showError);
    audio.after(player);
    audio.hidden = true;
    audio.controls = false;
    new ResizeObserver(draw).observe(canvas);
    update();
  }

  if (!icons || !window.ResizeObserver) return;
  audios.forEach(createPlayer);
  dockToggle.addEventListener("click", () => {
    if (!active) return;
    if (active.paused) play(active);
    else active.pause();
  });
  dockSeek.addEventListener("input", () => { if (active) controllers.get(active).seek(Number(dockSeek.value)); });
  dockMute.addEventListener("click", () => { if (active) active.muted = !active.muted; });
  document.getElementById("dock-close").addEventListener("click", () => {
    const stopped = active;
    const state = controllers.get(active);
    closeDock();
    if (stopped) stopped.currentTime = 0;
    if (state?.player.getClientRects().length) state.player.querySelector("button").focus({ preventScroll: true });
  });
  window.SemBridgeAudio = {
    close: closeDock,
    changeSource(audio, src, title) {
      if (active === audio) closeDock();
      audio.pause();
      audio.src = src;
      audio.load();
      const state = controllers.get(audio);
      state.title = title;
      state.reset();
    },
  };
})();
