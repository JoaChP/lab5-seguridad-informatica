// libs/unalib.js
// Validadores + sanitización y clasificación segura

const URL_REGEX = /https?:\/\/[^\s'"<>]+/gi;
const DATA_IMG_REGEX = /^data:image\/(png|jpe?g|gif|bmp|webp|svg\+xml);base64,[a-z0-9+/=]+$/i;
const FILE_IMG_REGEX = /^(http(s?):\/\/[^\s'"<>]+?\.(?:jpg|jpeg|png|gif|bmp|webp|svg))(?:[?#][^\s'"<>]*)?$/i;

// YouTube: watch, youtu.be, embed, shorts + playlist/list + start/t
const YT_ID = "([\\w-]{11})";
const YT_REGEX = new RegExp(
  "^(?:https?:\\/\\/)?(?:www\\.)?(?:youtu\\.be\\/" + YT_ID +
  "|youtube\\.com\\/(?:embed\\/" + YT_ID +
  "|shorts\\/" + YT_ID +
  "|v\\/" + YT_ID +
  "|watch\\?(?:.*?v=" + YT_ID + ".*)?))", "i"
);

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function decodeEntities(s) {
  // por ahora solo necesitamos &amp; -> &
  return String(s).replace(/&amp;/g, "&");
}

function firstUrl(raw) {
  const urls = raw.match(URL_REGEX) || [];
  return urls.length ? urls[0] : null;
}

// -------- Google/Bing extractors (robustos) --------
function safeDecodeOnce(x) {
  try { return decodeURIComponent(x); } catch { return x; }
}
function safeDecodeTwice(x) {
  return safeDecodeOnce(safeDecodeOnce(x));
}

// Intenta leer ?imgurl= o ?mediaurl= con URL()
function extractViaURL(u) {
  try {
    const url = new URL(u);
    const v = url.searchParams.get("imgurl") || url.searchParams.get("mediaurl");
    return v ? safeDecodeTwice(v) : null;
  } catch { return null; }
}

// Regex fallback por si el & sigue escapado o el parser falla
function extractViaRegex(u) {
  const m = u.match(/[?&](?:imgurl|mediaurl)=([^&#]+)/i);
  if (!m) return null;
  return safeDecodeTwice(m[1]);
}

function extractImageFromRedirectAny(rawCandidate) {
  // prueba con decodeEntities y sin decode, y con regex
  const probe = decodeEntities(rawCandidate);
  const passA = extractViaURL(probe);
  if (passA) return passA;

  const passB = extractViaURL(rawCandidate);
  if (passB) return passB;

  const passC = extractViaRegex(probe) || extractViaRegex(rawCandidate);
  return passC || null;
}

// -------- Bing thumbnails sin extensión --------
function looksLikeBingThumb(u) {
  try {
    const url = new URL(u);
    const hostOk = /(^|\.)mm\.bing\.net$/i.test(url.hostname);
    const pathOk = /^\/th\/id\//i.test(url.pathname);
    const pid = url.searchParams.get("pid");
    return hostOk && (pathOk || (pid && /ImgDetMain/i.test(pid)));
  } catch { return false; }
}

// -------- YouTube helpers --------
function parseTimeToSeconds(t) {
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (!m) return NaN;
  const h = parseInt(m[1] || "0", 10);
  const min = parseInt(m[2] || "0", 10);
  const s = parseInt(m[3] || "0", 10);
  return h * 3600 + min * 60 + s;
}

function parseYouTube(u) {
  try {
    const url = new URL(u);
    let id = null, list = null, start = null;

    if (/youtu\.be$/i.test(url.hostname)) id = url.pathname.slice(1);
    if (/youtube\.com$/i.test(url.hostname)) {
      if (/^\/embed\//i.test(url.pathname))   id = url.pathname.split("/")[2];
      if (/^\/shorts\//i.test(url.pathname))  id = url.pathname.split("/")[2];
      if (/^\/v\//i.test(url.pathname))       id = url.pathname.split("/")[2];
      if (/^\/watch/i.test(url.pathname) && url.searchParams.get("v")) id = url.searchParams.get("v");
    }

    list = url.searchParams.get("list") || null;

    const t = url.searchParams.get("t") || url.searchParams.get("start");
    if (t) {
      const secs = parseTimeToSeconds(t);
      if (!isNaN(secs) && secs > 0) start = secs;
    }

    if (!id && !list) return null;
    if (id && !/^[\w-]{11}$/.test(id)) id = null;

    return { id, list, start };
  } catch {
    return null;
  }
}

// -------------------------------------------------

module.exports = {

  is_valid_phone: function (phone) {
    let ok = false;
    const re = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/i;
    try { ok = re.test(phone); } catch (e) { console.log(e); } finally { return ok; }
  },

  is_valid_url_image: function (url) {
    if (!url) return false;
    try {
      const probe = decodeEntities(url);

      if (DATA_IMG_REGEX.test(probe)) return true;
      if (FILE_IMG_REGEX.test(probe)) return true;
      if (looksLikeBingThumb(probe)) return true;

      const embedded = extractImageFromRedirectAny(probe);
      return embedded
        ? (DATA_IMG_REGEX.test(embedded) || FILE_IMG_REGEX.test(embedded) || looksLikeBingThumb(embedded))
        : false;
    } catch (e) { console.log(e); return false; }
  },

  is_valid_yt_video: function (url) {
    if (!url) return false;
    try {
      const probe = decodeEntities(url);
      if (YT_REGEX.test(probe)) return true;
      const yt = parseYouTube(probe);
      return !!yt;
    } catch (e) { console.log(e); return false; }
  },

  parseYouTube,

  validateMessage: function (msg) {
    if (!msg || typeof msg !== "string") {
      return JSON.stringify({ nombre: "Anonimo", color: "#000000", mensaje: "", type: "text", url: null });
    }
    try {
      const obj = JSON.parse(msg);
      const nombre = escapeHTML(obj.nombre ?? "Anonimo").slice(0, 50);
      const color  = String(obj.color ?? "#000000").slice(0, 16);
      const raw    = String(obj.mensaje ?? "");

      const mensaje = escapeHTML(raw).slice(0, 2000);

      let type = "text", url = null, yt = null;

      if (DATA_IMG_REGEX.test(raw.trim())) {
        type = "image"; url = raw.trim();
      } else {
        const probe = decodeEntities(raw);          // texto con &amp; → &
        const u = firstUrl(probe);                  // primera URL (ya sin &amp;)
        if (u) {
          // 1) Si hay imgurl/mediaurl en cualquier variante → SIEMPRE usamos esa
          const embedded = extractImageFromRedirectAny(u) || extractImageFromRedirectAny(raw);
          if (embedded) {
            type = "image"; url = embedded;
          } else if (module.exports.is_valid_url_image(u)) {
            type = "image"; url = u;
          } else if (module.exports.is_valid_yt_video(u)) {
            type = "video"; url = u; yt = parseYouTube(u);
          }

          // --- SUPRESIÓN DE TEXTO MEJORADA ---
          // Si el mensaje SOLO contiene esa URL (ya sea la de Google/Bing o la final),
          // no repetimos el texto (como con una URL directa de imagen).
          if (type !== "text") {
            const decodedTrim = probe.trim();
            const rawTrim     = String(raw).trim(); // puede tener &amp;
            // suprimir si coincide con la URL detectada u (decodificada),
            // o con la URL final 'url', o con el texto original exacto
            if (
              decodedTrim === u ||
              decodedTrim === (url || "") ||
              rawTrim === u ||
              rawTrim === (url || "")
            ) {
              // mensaje queda vacío
            } else {
              // dejamos el mensaje escapado (ya estaba en 'mensaje')
            }
          }
        }
      }

      // Recalcular suppress (el bloque anterior solo decidió semánticamente;
      // aquí aplicamos dejando mensaje vacío si corresponde)
      let finalMensaje = mensaje;
      if (type !== "text") {
        const decodedTrim = decodeEntities(raw).trim();
        if (decodedTrim === (url || "").trim()) {
          finalMensaje = "";
        } else {
          // también si el texto es exactamente la URL cruda encontrada (u) aunque url sea embebida
          const u2 = firstUrl(decodeEntities(raw)) || "";
          if (decodedTrim === u2.trim()) {
            finalMensaje = "";
          }
        }
      }

      const result = { nombre, color, mensaje: finalMensaje, type, url };
      if (yt) result.yt = yt;
      return JSON.stringify(result);
    } catch (e) {
      console.log("Error processing message:", e);
      return JSON.stringify({ nombre: "Anonimo", color: "#000000", mensaje: escapeHTML(String(msg)), type: "text", url: null });
    }
  }
};
