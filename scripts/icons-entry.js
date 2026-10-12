import {
  createElement, AudioLines, ArrowUpRight, ArrowDownRight, ArrowDown, ArrowUp,
  FileText, Code2, Box, Mic, Music2, Waves, Plus, Expand, Languages,
  ChevronDown, Copy, Check, Pause, Play, Volume2, VolumeX, Download, X,
} from "lucide";

const icons = {
  "audio-lines": AudioLines, "arrow-up-right": ArrowUpRight,
  "arrow-down-right": ArrowDownRight, "arrow-down": ArrowDown, "arrow-up": ArrowUp,
  "file-text": FileText, github: Code2, box: Box, mic: Mic, "music-2": Music2,
  waves: Waves, plus: Plus, expand: Expand, languages: Languages,
  "chevron-down": ChevronDown, copy: Copy, check: Check, pause: Pause,
  play: Play, "volume-2": Volume2, "volume-x": VolumeX, download: Download, x: X,
};
window.SemBridgeIcons = {
  make(name) { return createElement(icons[name], { "aria-hidden": "true" }); },
  mount(root = document) {
    root.querySelectorAll("[data-lucide]").forEach((node) => {
      const icon = icons[node.dataset.lucide];
      if (icon) node.replaceWith(createElement(icon, { "aria-hidden": "true" }));
    });
  },
};
