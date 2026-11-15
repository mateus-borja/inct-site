/*
 * Gera, após o "vite build", uma página estática por notícia em
 * dist/noticias/<id>/index.html com as meta tags Open Graph.
 * Pessoas são redirecionadas para o site (/#/noticias/<id>);
 * bots (WhatsApp etc.) leem só as meta tags.
 *
 * Link para compartilhar: https://oncottgen.com/noticias/<id>/
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API = "https://publicacoes-inct-api.vercel.app";
const SITE = "https://oncottgen.com";
const DIST = "dist";

function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function prepararImagem(url) {
  if (!url) return null;

  // imgur.com/X.jpg (página) -> i.imgur.com/X.jpg (imagem direta)
  url = url.replace(/^https?:\/\/(www\.)?imgur\.com\//, "https://i.imgur.com/");

  // Cloudinary: 1200x630 comprimida (WhatsApp prefere < 300 KB)
  if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
    url = url.replace(
      "/image/upload/",
      "/image/upload/w_1200,h_630,c_fill,q_auto:eco,f_jpg/"
    );
  }
  return url;
}

function gerarHtml(n) {
  const id = n.id || n._id;
  const urlPagina = `${SITE}/noticias/${id}/`;
  const urlSpa = `${SITE}/#/noticias/${id}`;
  const titulo = n.titulo || "INCT OncoTTGen";
  let resumo = (n.resumo || "Instituto Nacional de Ciência e Tecnologia em Oncologia Translacional e Terapias Gênicas").trim();
  if (resumo.length > 200) resumo = resumo.slice(0, 197) + "...";
  const imagem = prepararImagem(n.imagem);

  return `<!doctype html>
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
<script>location.replace(${JSON.stringify(urlSpa)});</script>
</head>
<body>
<p><a href="${esc(urlSpa)}">${esc(titulo)}</a></p>
</body>
</html>`;
}

async function main() {
  let noticias = [];
  try {
    const res = await fetch(`${API}/noticias`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    noticias = Array.isArray(json) ? json : json.data || [];
  } catch (e) {
    // Não derruba o build se a API estiver fora do ar
    console.warn("[og] Não foi possível buscar as notícias:", e.message);
    return;
  }

  let total = 0;
  for (const n of noticias) {
    const id = n.id || n._id;
    if (!id) continue;
    const dir = path.join(DIST, "noticias", String(id));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), gerarHtml(n), "utf8");
    total++;
  }
  console.log(`[og] ${total} páginas de notícias geradas em ${DIST}/noticias/`);
}

main();
