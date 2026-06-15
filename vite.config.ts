import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 本番ビルドのHTMLにだけ CSP を注入する。
// dev は HMR が inline script / eval / websocket を使うため適用しない。
// 当アプリは完全ローカル（外部通信・CDN・Webフォントなし）なので強く絞れる。
// - script-src 'self'        : バンドル済み同一オリジンのみ（inline/eval禁止）
// - style-src  'unsafe-inline': React の style属性・Chart.js のcanvasインラインstyleに必要
// - img-src/blob/data         : favicon(svg)・グラフ・Excelダウンロード(blob:)用
// - connect-src 'self'        : XHR/fetchの外部送信を禁止
const cspPlugin: Plugin = {
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml(html) {
    // 注: frame-ancestors / sandbox / report-uri は <meta> では無視される（HTTPヘッダー専用）。
    // クリックジャッキング対策が必要なら配信側で frame-ancestors か X-Frame-Options を設定する。
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
    ].join('; ');
    return html.replace(
      '</title>',
      `</title>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
    );
  },
};

export default defineConfig({
  plugins: [react(), cspPlugin],
  test: {
    environment: 'node',
  },
})
