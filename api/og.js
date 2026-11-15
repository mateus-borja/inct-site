const API = "https://publicacoes-inct-api.vercel.app";

function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Normaliza a imagem para uma URL que o WhatsApp consiga ler */
function prepararImagem(url) {
  if (!url) return null;

  // imgur.com/XXXX.jpg (página) -> i.imgur.com/XXXX.jpg (imagem direta)
  url = url.replace(/^https?:\/\/(www\.)?imgur\.com\//, "https://i.imgur.com/");

  // Cloudinary: redimensiona para 1200x630 e comprime (WhatsApp prefere < 300 KB)
  if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
    url = url.replace(
      "/image/upload/",
      "/image/upload/w_1200,h_630,c_fill,q_auto:eco,f_jpg/"
    );
  }

  return url;
}

export default async function handler(req, res) {
  const id = String(req.query.id || "").trim();
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${proto}://${host}`;
  const urlPagina = `${origin}/noticias/${encodeURIComponent(id)}`;

  let titulo = "INCT OncoTTGen";
  let resumo = "Instituto Nacional de Ciência e Tecnologia em Oncologia Translacional e Terapias Gênicas";
  let imagem = null;

  try {
    const r = await fetch(`${API}/noticias/${encodeURIComponent(id)}`);
    if (r.ok) {
      const json = await r.json();
      const n = json.data || json;
      titulo = n.titulo || titulo;
      resumo = (n.resumo || resumo).trim();
      imagem = prepararImagem(n.imagem);
    }
  } catch {
    // mantém os valores padrão
  }

  if (resumo.length > 200) resumo = resumo.slice(0, 197) + "...";

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(resumo)}" />
<link rel="canonical" href="${esc(urlPagina)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="INCT OncoTTGen" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:url" content="${esc(urlPagina)}" />
<meta property="og:title" content="${esc(titulo)}" />
<meta property="og:description" content="${esc(resumo)}" />
${imagem ? `<meta property="og:image" content="${esc(imagem)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />` : ""}
<meta name="twitter:card" content="${imagem ? "summary_large_image" : "summary"}" />
<meta name="twitter:title" content="${esc(titulo)}" />
<meta name="twitter:description" content="${esc(resumo)}" />
${imagem ? `<meta name="twitter:image" content="${esc(imagem)}" />` : ""}
</head>
<body>
<script>location.replace(${JSON.stringify(urlPagina)});</script>
<p><a href="${esc(urlPagina)}">${esc(titulo)}</a></p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(html);
}
