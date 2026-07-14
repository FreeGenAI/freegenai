// ================================
// FreeGenAI - Image Generation Script
// Uses Pollinations.ai (free AI image API)
// ================================

// Cloudflare Worker proxy URL (key yahan nahi, Worker ke andar safe hai)
const WORKER_URL = "https://black-freegenai-api-0317.shahid-baloch-ss96.workers.dev";

const MODEL = "flux"; // genuinely free aur unlimited model

// Daily free limits
const DAILY_LIMIT_NO_SIGNUP = 100;
const DAILY_LIMIT_SIGNED_IN = 300;

function getDailyLimit() {
  const isLoggedIn = localStorage.getItem("freegenai_logged_in") === "true";
  return isLoggedIn ? DAILY_LIMIT_SIGNED_IN : DAILY_LIMIT_NO_SIGNUP;
}

// ---------- Style keywords (better/realistic results ke liye) ----------
const STYLE_KEYWORDS = {
  "Realistic": "photorealistic, high detail, professional photography, 8k",
  "Cinematic": "cinematic lighting, movie still, dramatic atmosphere",
  "Anime": "anime style, vibrant colors, detailed illustration",
  "3D": "3D render, octane render, high quality",
  "Watercolor": "watercolor painting, soft brush strokes, artistic",
  "Cyberpunk": "cyberpunk style, neon lights, futuristic, high-tech",
  "Fantasy Art": "fantasy art, magical atmosphere, dramatic lighting, epic",
  "Minimalist": "minimalist design, clean, simple, negative space",
  "Vintage": "vintage style, retro aesthetic, film grain, nostalgic",
  "Pop Art": "pop art style, bold colors, comic style, high contrast"
};

// ---------- Aspect ratio -> width/height ----------
const ASPECT_DIMENSIONS = {
  "16:9": { w: 1024, h: 576 },
  "1:1": { w: 1024, h: 1024 },
  "9:16": { w: 576, h: 1024 }
};

// ---------- Resolution -> scale factor ----------
const RESOLUTION_SCALE = {
  "1024px": 1,
  "1536px": 1.5,
  "2048px": 2
};

// ================================
// DAILY LIMIT TRACKING (localStorage)
// ================================
function getTodayKey() {
  const today = new Date().toISOString().split("T")[0];
  return `freegenai_usage_${today}`;
}

function getUsageCount() {
  return parseInt(localStorage.getItem(getTodayKey()) || "0", 10);
}

function incrementUsage(count) {
  localStorage.setItem(getTodayKey(), getUsageCount() + count);
}

function checkAndConsumeLimit(count) {
  const limit = getDailyLimit();
  const used = getUsageCount();
  if (used + count > limit) {
    alert(
      `Aapki aaj ki free limit (${limit} images) khatam ho gayi hai.\nKal wapis ayein, ya login karke zyada limit paayein.`
    );
    return false;
  }
  incrementUsage(count);
  return true;
}

// ================================
// BUILD IMAGE URL
// ================================
function buildImageUrl(prompt, style, aspectRatio, resolution, referenceImageUrl) {
  const styleText = STYLE_KEYWORDS[style] || "";
  const fullPrompt = `${prompt}, ${styleText}`;

  const dims = ASPECT_DIMENSIONS[aspectRatio] || ASPECT_DIMENSIONS["1:1"];
  const scale = RESOLUTION_SCALE[resolution] || 1;
  const width = Math.round(dims.w * scale);
  const height = Math.round(dims.h * scale);

  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(fullPrompt);

  // nanobanana text-to-image aur reference-based dono handle karta hai
  let url =
    `${WORKER_URL}?prompt=${encodedPrompt}&model=${MODEL}` +
    `&width=${width}&height=${height}&seed=${seed}`;

  if (referenceImageUrl) {
    url += `&image=${encodeURIComponent(referenceImageUrl)}`;
  }

  return url;
}

// ================================
// DOWNLOAD HELPER
// ================================
async function downloadImage(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    window.open(url, "_blank");
  }
}

// ================================
// SOCIAL PROOF COUNTER
// (Note: ye is browser tak mehdood hai — sab users ke liye
// shared/real-time counter ke liye baad mein Firestore/KV add kar sakte hain)
// ================================
const COUNTER_BASE = 12400; // shuruati boost number

function updateCounterDisplay() {
  const el = document.getElementById("freegenai-counter-number");
  if (!el) return;
  const localTotal = parseInt(localStorage.getItem("freegenai_total_generated") || "0", 10);
  el.textContent = (COUNTER_BASE + localTotal).toLocaleString();
}

function incrementGlobalCounterDisplay(count) {
  const localTotal = parseInt(localStorage.getItem("freegenai_total_generated") || "0", 10);
  localStorage.setItem("freegenai_total_generated", localTotal + count);
  updateCounterDisplay();
}

updateCounterDisplay();

// ================================
// WATERMARK (FreeGenAI branding)
// ================================
function addWatermark(img) {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(14, Math.floor(canvas.width * 0.025));
      const text = "FreeGenAI";
      ctx.font = `600 ${fontSize}px Poppins, sans-serif`;
      const padding = fontSize * 0.5;
      const metrics = ctx.measureText(text);
      const boxWidth = metrics.width + padding * 2;
      const boxHeight = fontSize + padding * 1.4;
      const x = canvas.width - boxWidth - fontSize * 0.6;
      const y = canvas.height - boxHeight - fontSize * 0.6;

      ctx.fillStyle = "rgba(8,12,22,0.55)";
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, boxHeight / 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + padding, y + boxHeight / 2);

      resolve(canvas.toDataURL("image/png"));
    } catch (err) {
      // Agar watermark fail ho (CORS waghera), original image hi use ho jaye
      resolve(img.src);
    }
  });
}

// ================================
// SINGLE IMAGE STUDIO (left panel)
// ================================
const singlePanel = document.querySelector(".single-panel");

if (singlePanel) {
  const singleTextarea = singlePanel.querySelector("textarea");
  const singleSelects = singlePanel.querySelectorAll(".settings select");
  const singleStyleSelect = singleSelects[0];
  const singleAspectSelect = singleSelects[1];
  const singleResolutionSelect = singleSelects[2];
  const singleGenerateBtn = singlePanel.querySelector("button.generate");
  const singlePreview = singlePanel.querySelector(".preview");
  const singleDownloadBtn = singlePanel.querySelector("button.download");

  // "Prompt Library" button ko "Use as Reference" (character consistency) banaya
  const singleTools = singlePanel.querySelectorAll(".tools button");
  const referenceToggleBtn = singleTools[1]; // 2nd tool button = "📚 Prompt Library"

  let lastGeneratedImageUrl = null;
  let useReference = false;

  if (referenceToggleBtn) {
    referenceToggleBtn.textContent = "🔗 Reference";
    referenceToggleBtn.title = "Use last generated image as reference";
    referenceToggleBtn.addEventListener("click", () => {
      if (!lastGeneratedImageUrl) {
        alert("Pehle ek image generate karein, phir usay reference ke tor par use kar sakte hain.");
        return;
      }
      useReference = !useReference;
      referenceToggleBtn.classList.toggle("active-toggle", useReference);
      referenceToggleBtn.textContent = useReference ? "🔗 ON" : "🔗 Reference";
    });
  }

  // ---------- Category chips (Thumbnail, Logo, Poster, etc.) ----------
  const categoryChips = singlePanel.querySelectorAll(".category-chip");
  let activeCategoryKeywords = "";

  categoryChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const isAlreadyActive = chip.classList.contains("active");

      categoryChips.forEach((c) => c.classList.remove("active"));

      if (isAlreadyActive) {
        // Dobara dabane se category off ho jati hai
        activeCategoryKeywords = "";
        return;
      }

      chip.classList.add("active");
      singleStyleSelect.value = chip.dataset.style;
      singleAspectSelect.value = chip.dataset.aspect;
      activeCategoryKeywords = chip.dataset.keywords || "";
    });
  });

  singleGenerateBtn.addEventListener("click", () => {
    const prompt = singleTextarea.value.trim();
    if (!prompt) {
      alert("Pehle prompt likhein.");
      return;
    }
    if (!checkAndConsumeLimit(1)) return;

    singlePreview.innerHTML = "Generating...";

    const finalPrompt = activeCategoryKeywords
      ? `${prompt}, ${activeCategoryKeywords}`
      : prompt;

    const url = buildImageUrl(
      finalPrompt,
      singleStyleSelect.value,
      singleAspectSelect.value,
      singleResolutionSelect.value,
      useReference ? lastGeneratedImageUrl : null
    );

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.style.maxWidth = "100%";
    img.style.borderRadius = "inherit";

    img.onload = async () => {
      img.onload = null; // recursion se bachne ke liye
      const watermarkedSrc = await addWatermark(img);
      img.src = watermarkedSrc;
      singlePreview.innerHTML = "";
      singlePreview.appendChild(img);
      lastGeneratedImageUrl = url;
      incrementGlobalCounterDisplay(1);
    };
    img.onerror = () => {
      singlePreview.innerHTML = "Image generate nahi ho saki. Dobara try karein.";
    };
    img.src = url;
  });

  singleDownloadBtn.addEventListener("click", () => {
    const img = singlePreview.querySelector("img");
    if (!img) {
      alert("Pehle image generate karein.");
      return;
    }
    downloadImage(img.src, "freegenai-image.jpg");
  });
}

// ================================
// MULTI IMAGE GENERATOR (right panel)
// ================================
const multiPanel = document.querySelector(".multi-panel");

if (multiPanel) {
  const multiTextareas = multiPanel.querySelectorAll(".multi-prompts textarea");
  const multiSelects = multiPanel.querySelectorAll(".settings select");
  const multiStyleSelect = multiSelects[0];
  const multiAspectSelect = multiSelects[1];
  const multiResolutionSelect = multiSelects[2];
  const multiGenerateBtn = multiPanel.querySelector("button.generate");
  const multiPreviewDivs = multiPanel.querySelectorAll(".multi-preview > div");
  const multiDownloadBtn = multiPanel.querySelector("button.download");

  // Ek image load karne ka helper (Promise-based, taake sequentially await kar saken)
  function loadOneImage(prompt, index) {
    return new Promise((resolve) => {
      const container = multiPreviewDivs[index];
      const textSpan = container.querySelector(".preview-text");
      const miniBtn = container.querySelector(".mini-download");
      if (textSpan) textSpan.textContent = "Generating...";
      if (miniBtn) miniBtn.style.display = "none";

      const url = buildImageUrl(
        prompt,
        multiStyleSelect.value,
        multiAspectSelect.value,
        multiResolutionSelect.value
      );

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.style.maxWidth = "100%";
      img.style.borderRadius = "inherit";

      img.onload = async () => {
        img.onload = null; // recursion se bachne ke liye
        const watermarkedSrc = await addWatermark(img);
        img.src = watermarkedSrc;

        // Purani img (agar ho) hata kar nayi daalein, button ko preserve karein
        const oldImg = container.querySelector("img");
        if (oldImg) oldImg.remove();
        if (textSpan) textSpan.remove();
        container.insertBefore(img, container.firstChild);

        if (miniBtn) {
          miniBtn.style.display = "flex";
          miniBtn.onclick = () => downloadImage(img.src, `freegenai-image-${index + 1}.jpg`);
        }

        incrementGlobalCounterDisplay(1);
        resolve(true);
      };
      img.onerror = () => {
        if (textSpan) textSpan.textContent = "Fail. Dobara try karein.";
        resolve(false);
      };
      img.src = url;
    });
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  multiGenerateBtn.addEventListener("click", async () => {
    const prompts = Array.from(multiTextareas).map((t) => t.value.trim());
    const nonEmptyCount = prompts.filter((p) => p).length;

    if (nonEmptyCount === 0) {
      alert("Kam az kam ek prompt likhein.");
      return;
    }
    if (!checkAndConsumeLimit(nonEmptyCount)) return;

    // Sequentially generate — ek image ke baad thora ruk kar agli,
    // taake anonymous rate-limit hit na ho
    for (let i = 0; i < prompts.length; i++) {
      if (!prompts[i]) continue;
      await loadOneImage(prompts[i], i);
      await wait(1500); // 1.5 second gap
    }
  });

  multiDownloadBtn.addEventListener("click", () => {
    const imgs = Array.from(multiPreviewDivs)
      .map((div) => div.querySelector("img"))
      .filter(Boolean);

    if (imgs.length === 0) {
      alert("Pehle images generate karein.");
      return;
    }
    imgs.forEach((img, i) => downloadImage(img.src, `freegenai-image-${i + 1}.jpg`));
  });
}

// ================================
// BACKGROUND REMOVER (100% client-side, free, unlimited)
// ================================
const bgRemoveBtn = document.getElementById("bg-remove-btn");
if (bgRemoveBtn) {
  const bgInput = document.getElementById("bg-remove-input");
  const bgPreview = document.getElementById("bg-remove-preview");
  const bgDownloadBtn = document.getElementById("bg-remove-download");
  let bgResultUrl = null;

  bgRemoveBtn.addEventListener("click", async () => {
    if (!bgInput.files || !bgInput.files[0]) {
      alert("Pehle ek image upload karein.");
      return;
    }
    bgPreview.innerHTML = "Processing... (pehli baar thora time lag sakta hai)";
    try {
      const { removeBackground } = await import(
        "https://esm.sh/@imgly/background-removal@1.5.5"
      );
      const blob = await removeBackground(bgInput.files[0]);
      bgResultUrl = URL.createObjectURL(blob);
      bgPreview.innerHTML = "";
      const img = new Image();
      img.style.maxWidth = "100%";
      img.src = bgResultUrl;
      bgPreview.appendChild(img);
    } catch (err) {
      bgPreview.innerHTML = "Background remove nahi ho saka. Dobara try karein.";
    }
  });

  bgDownloadBtn.addEventListener("click", () => {
    if (!bgResultUrl) {
      alert("Pehle background remove karein.");
      return;
    }
    const link = document.createElement("a");
    link.href = bgResultUrl;
    link.download = "freegenai-no-background.png";
    link.click();
  });
}

// ================================
// AI AVATAR GENERATOR
// ================================
const avatarBtn = document.getElementById("avatar-btn");
if (avatarBtn) {
  const avatarInput = document.getElementById("avatar-input");
  const avatarStyleSelect = document.getElementById("avatar-style");
  const avatarPreview = document.getElementById("avatar-preview");
  const avatarDownloadBtn = document.getElementById("avatar-download");

  const AVATAR_STYLE_PROMPTS = {
    "Cartoon": "turn this photo into a fun cartoon avatar, clean lines, vibrant colors",
    "Anime": "turn this photo into an anime style avatar portrait",
    "Pixar 3D": "turn this photo into a Pixar-style 3D animated character avatar",
    "Professional Headshot": "turn this into a polished professional headshot avatar, studio lighting",
    "Fantasy Character": "turn this photo into a fantasy character avatar, magical style"
  };

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  avatarBtn.addEventListener("click", async () => {
    if (!avatarInput.files || !avatarInput.files[0]) {
      alert("Pehle apni photo upload karein.");
      return;
    }
    if (!checkAndConsumeLimit(1)) return;

    avatarPreview.innerHTML = "Generating avatar...";

    try {
      const file = avatarInput.files[0];
      const base64 = await fileToBase64(file);
      const prompt = AVATAR_STYLE_PROMPTS[avatarStyleSelect.value];

      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          imageBase64: base64,
          mimeType: file.type || "image/jpeg"
        })
      });

      if (!response.ok) throw new Error("Avatar generation failed");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      avatarPreview.innerHTML = "";
      const img = new Image();
      img.style.maxWidth = "100%";
      img.src = objectUrl;
      avatarPreview.appendChild(img);

      avatarDownloadBtn.onclick = () => {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = "freegenai-avatar.png";
        link.click();
      };

      incrementGlobalCounterDisplay(1);
    } catch (err) {
      avatarPreview.innerHTML = "Avatar generate nahi ho saka. Dobara try karein.";
    }
  });
}
