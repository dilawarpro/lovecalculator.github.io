const $ = (id) => document.getElementById(id);
const form = $("love-form"), name1Input = $("name1"), name2Input = $("name2");
const calculating = $("calculating"), results = $("results"), loveResults = $("love-results");
const resultTitle = $("result-title"), shareStatus = $("share-status"), installButton = $("install-button");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let lastResult = null, shareUrl = "";

function focusNameInput() {
  if (!form.hidden) name1Input.focus();
}
focusNameInput();

// Same two names always give the same score, in any order (30 to 100).
function score(a, b, salt = 0) {
  const pair = [a, b].map((n) => n.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")).sort().join("|");
  let h = (2166136261 ^ Math.imul(salt, 2654435761)) >>> 0;
  for (let i = 0; i < pair.length; i += 1) { h ^= pair.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 30 + ((h >>> 0) % 71);
}

function verdict(p) {
  if (p >= 90) return "A rare match. Strong chemistry and easy understanding.";
  if (p >= 70) return "A great match with lots of shared energy.";
  if (p >= 50) return "A promising match that grows with honest talks.";
  return "Different styles. Patience and humor go a long way.";
}

function runHeartConfetti() {
  if (!window.confetti || reduceMotion) return;
  const o = { spread: 360, ticks: 100, gravity: 0, decay: 0.94, startVelocity: 30, shapes: ["heart"], colors: ["#FFC0CB", "#FF69B4", "#FF1493", "#C71585"] };
  window.confetti({ ...o, particleCount: 50, scalar: 2 });
  window.confetti({ ...o, particleCount: 25, scalar: 3 });
}

function showResult(a, b, p) {
  const strong = document.createElement("strong");
  strong.textContent = `${p}%`;
  loveResults.replaceChildren(document.createTextNode(`${a} and ${b} have a `), strong, document.createTextNode(` playful compatibility score. ${verdict(p)}`));

  const box = $("bars");
  box.replaceChildren();
  ["Trust", "Chemistry", "Friendship", "Communication"].forEach((label, i) => {
    const v = Math.round((p + score(a, b, i + 1)) / 2);
    const row = document.createElement("div"); row.className = "bar";
    const name = document.createElement("span"); name.textContent = label;
    const track = document.createElement("i"), fillBar = document.createElement("b"); track.append(fillBar);
    const val = document.createElement("em"); val.textContent = `${v}%`;
    row.append(name, track, val); box.append(row);
    setTimeout(() => { fillBar.style.width = `${v}%`; }, 700 + i * 250);
  });

  lastResult = { a, b, p };
  shareUrl = `https://lovecalcu.com/?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;
  $("shareWa").href = `https://wa.me/?text=${encodeURIComponent(`${a} and ${b} scored ${p}% on the love calculator. See the full result: ${shareUrl}`)}`;
  saveRecent(a, b, p);

  calculating.hidden = true;
  results.hidden = false;
  resultTitle.focus({ preventScroll: true });

  $("pct").textContent = "0%";
  $("fill").style.transform = "translateY(180px)";
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $("fill").style.transform = `translateY(${180 - p * 1.7}px)`;
    const start = performance.now(), dur = reduceMotion ? 1 : 2200;
    const tick = (t) => {
      const k = Math.min((t - start) / dur, 1);
      $("pct").textContent = `${Math.round(p * (1 - (1 - k) ** 3))}%`;
      if (k < 1) requestAnimationFrame(tick); else runHeartConfetti();
    };
    requestAnimationFrame(tick);
  }));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const a = name1Input.value.trim(), b = name2Input.value.trim();
  if (!a || !b) {
    const empty = a ? name2Input : name1Input;
    empty.setCustomValidity("Please enter both names.");
    empty.reportValidity();
    empty.addEventListener("input", () => empty.setCustomValidity(""), { once: true });
    return;
  }
  name1Input.setCustomValidity(""); name2Input.setCustomValidity("");
  const msgs = ["Comparing your names…", "Matching the letters…", "Measuring the spark…"];
  let i = 0; $("div-msg").textContent = msgs[0];
  form.hidden = true; results.hidden = true; calculating.hidden = false;
  const timer = setInterval(() => { $("div-msg").textContent = msgs[++i % msgs.length]; }, 450);
  setTimeout(() => { clearInterval(timer); showResult(a, b, score(a, b)); }, 1400);
});

$("try-again").addEventListener("click", () => {
  results.hidden = true; form.hidden = false; form.reset();
  $("copyLink").textContent = "Copy result link";
  name1Input.focus();
});

// Famous pairs and recent matches (stored only in this browser)
document.addEventListener("click", (e) => {
  const rm = e.target.closest("[data-remove]");
  if (rm) { removeRecent(rm.dataset.remove); return; }
  const b = e.target.closest(".pairs button[data-a]");
  if (!b) return;
  name1Input.value = b.dataset.a; name2Input.value = b.dataset.b;
  form.requestSubmit();
});
const readRecent = () => { try { return JSON.parse(localStorage.getItem("lc_recent") || "[]"); } catch { return []; } };
function saveRecent(a, b, p) {
  try {
    const l = readRecent().filter((r) => r.a !== a || r.b !== b);
    localStorage.setItem("lc_recent", JSON.stringify([{ a, b, p }, ...l].slice(0, 4)));
  } catch { /* storage unavailable */ }
  renderRecent();
}
function renderRecent() {
  const l = readRecent(), el = $("recent");
  el.replaceChildren(); el.hidden = !l.length;
  if (!l.length) return;
  const t = document.createElement("span"); t.textContent = "Recent:"; el.append(t);
  l.forEach((r, i) => {
    const chip = document.createElement("div"); chip.className = "chip";
    const b = document.createElement("button"); b.type = "button";
    b.dataset.a = String(r.a).slice(0, 30); b.dataset.b = String(r.b).slice(0, 30);
    b.textContent = `${b.dataset.a} + ${b.dataset.b} ${r.p}%`;
    const x = document.createElement("button"); x.type = "button"; x.className = "chip-x";
    x.dataset.remove = String(i); x.textContent = "×";
    x.setAttribute("aria-label", `Remove ${b.dataset.a} + ${b.dataset.b} from recent`);
    chip.append(b, x); el.append(chip);
  });
  const clear = document.createElement("button"); clear.type = "button"; clear.className = "clear-recent";
  clear.dataset.remove = "all"; clear.textContent = "Clear all"; el.append(clear);
}

function removeRecent(key) {
  try {
    const l = key === "all" ? [] : readRecent().filter((_, i) => i !== Number(key));
    localStorage.setItem("lc_recent", JSON.stringify(l));
  } catch { /* storage unavailable */ }
  renderRecent();
}
renderRecent();

$("copyLink").addEventListener("click", async () => {
  $("copyLink").textContent = (await copyShareUrl(shareUrl)) ? "Link copied" : "Copy failed";
});

// Save or share the same generated result image
function resultCanvas() {
  const { a, b, p } = lastResult;
  const c = document.createElement("canvas"); c.width = c.height = 1080;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 1080, 1080); g.addColorStop(0, "#c9356b"); g.addColorStop(1, "#30232c");
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1080);
  const h = new Path2D("M100 170C40 125 10 92 10 55 10 30 30 12 54 12c18 0 35 10 46 28C111 22 128 12 146 12c24 0 44 18 44 43 0 37-30 70-90 115z");
  x.save(); x.translate(180, 200); x.scale(3.6, 3.6);
  x.fillStyle = "rgba(255,255,255,.18)"; x.fill(h); x.clip(h);
  x.fillStyle = "#fff"; x.fillRect(0, 180 - p * 1.7, 200, 180); x.restore();
  x.textAlign = "center"; x.fillStyle = "#30232c";
  x.font = "800 130px -apple-system, 'Segoe UI', sans-serif"; x.fillText(`${p}%`, 540, 500);
  x.fillStyle = "#fff"; x.font = "700 56px -apple-system, 'Segoe UI', sans-serif"; x.fillText(`${a} + ${b}`, 540, 950, 960);
  x.fillStyle = "#ffd6e6"; x.font = "500 36px -apple-system, 'Segoe UI', sans-serif"; x.fillText("lovecalcu.com", 540, 1020);
  return c;
}

$("saveImg").addEventListener("click", () => {
  if (!lastResult) return;
  const link = document.createElement("a"); link.download = "love-result.png"; link.href = resultCanvas().toDataURL("image/png"); link.click();
});

$("shareWa").addEventListener("click", async (event) => {
  if (!lastResult) return;
  event.preventDefault();
  const waUrl = event.currentTarget.href;
  const { a, b, p } = lastResult;
  const text = `${a} and ${b} scored ${p}% on the love calculator. See the full result: ${shareUrl}`;
  const data = resultCanvas().toDataURL("image/png").split(",")[1];
  const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
  const image = new File([bytes], "love-result.png", { type: "image/png" });

  if (image && navigator.canShare?.({ files: [image] }) && navigator.share) {
    try {
      await navigator.share({ files: [image], title: `${a} + ${b}: ${p}%`, text });
      shareStatus.textContent = "Choose WhatsApp to send your result image and link.";
    } catch (error) {
      if (error.name !== "AbortError") {
        shareStatus.textContent = "Sharing was unavailable. WhatsApp will open with your result link.";
        window.location.href = waUrl;
      }
    }
    return;
  }

  shareStatus.textContent = "WhatsApp will open with your result link. Save the image separately to attach it.";
  window.location.href = waUrl;
});

async function copyShareUrl(url) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(url); return true; } catch { /* fall back */ }
  }
  const f = document.createElement("textarea");
  f.value = url; f.setAttribute("readonly", ""); f.style.cssText = "position:fixed;opacity:0";
  document.body.append(f); f.select();
  try { return document.execCommand("copy"); } catch { return false; } finally { f.remove(); }
}

$("share-button").addEventListener("click", async () => {
  const data = { title: document.title, text: "Try this fun love calculator by name!", url: "https://lovecalcu.com/" };
  if (navigator.share) {
    try { await navigator.share(data); shareStatus.textContent = "Thanks for sharing LoveCalcu."; return; }
    catch (error) { if (error.name === "AbortError") { shareStatus.textContent = "Sharing cancelled."; return; } }
  }
  shareStatus.textContent = (await copyShareUrl(data.url)) ? "Link copied. Share it with a friend!" : "Couldn't copy the link. Please copy the page address from your browser.";
});

let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstallPrompt = e; installButton.hidden = false; });
installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  try {
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    shareStatus.textContent = choice.outcome === "accepted" ? "LoveCalcu was added to your apps." : "App installation was dismissed.";
  } catch { shareStatus.textContent = "The app couldn't be installed from this browser."; }
  finally { deferredInstallPrompt = null; installButton.hidden = true; }
});
window.addEventListener("appinstalled", () => { deferredInstallPrompt = null; installButton.hidden = true; shareStatus.textContent = "LoveCalcu was added to your apps."; });

$("current-year").textContent = new Date().getFullYear();

// Shared links like /?a=Heer&b=Ranjha open straight on the result
const q = new URLSearchParams(location.search);
const qa = (q.get("a") || "").trim().slice(0, 30), qb = (q.get("b") || "").trim().slice(0, 30);
if (qa && qb) { name1Input.value = qa; name2Input.value = qb; form.requestSubmit(); }