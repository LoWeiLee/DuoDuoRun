/** @type {import('tailwindcss').Config} */
export default {
  // hoverOnlyWhenSupported：把所有 `hover:` 變體編成 `@media (hover: hover)`。
  //
  // 2026-07-13 紅隊 R3：codebase 有 175 處 `hover:`。觸控裝置沒有真正的 hover，
  // 瀏覽器會在 tap 後把 :hover 狀態「黏」在元素上，直到使用者點別處為止——
  // 手機上按過的按鈕會一直停在 hover 配色，看起來像被選取。
  // 這個 flag 讓 hover 樣式只在有指標裝置時套用，不必逐處改寫成
  // `[@media(hover:hover)]:` 變體。
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // body 用 system sans，混 Chinese-friendly fallback
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Microsoft JhengHei',
          'PingFang TC',
          'Roboto',
          'sans-serif',
        ],
        // 標題用 Source Serif 4（CJK fallback：宋體系 → system serif）
        serif: [
          'Source Serif 4',
          'Source Serif Pro',
          '"Songti TC"',
          '"Noto Serif CJK TC"',
          'Georgia',
          'serif',
        ],
        // 等寬：用於數值、p-value、column 名、技術標籤
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        // LED 光暈（假設檢核燈號、狀態點）
        'led-ok':   '0 0 8px rgba(47, 158, 99, 0.75)',
        'led-warn': '0 0 8px rgba(224, 148, 15, 0.75)',
        'led-bad':  '0 0 8px rgba(217, 54, 62, 0.70)',
        'led-info': '0 0 8px rgba(96, 125, 180, 0.6)',
      },
      letterSpacing: {
        // 用於 small caps section heading：UPPERCASE TRACKING
        ai: '0.18em',
      },
      colors: {
        // 多多調色盤：取自多多照片的暖色系
        // 設計原則：背景暖中性、品牌色琥珀棕、文字深咖啡、副色牛仔藍
        duo: {
          // 背景米白系（暖中性白），主要用於 page bg、surface
          cream: {
            50:  '#fffaf2',
            100: '#fbeed8', // 預設背景
            200: '#f4ddb2',
            300: '#ecc788',
          },
          // 主品牌琥珀棕（多多的主毛色）
          amber: {
            50:  '#fef3e2',
            100: '#fce0b8',
            200: '#f8c180',
            300: '#f1a14a',
            400: '#e98624',
            500: '#d97e2a', // 預設品牌色
            600: '#b9651e',
            700: '#974f1a',
            800: '#763f1c',
            900: '#5e3319',
          },
          // 深咖啡（耳朵與鼻吻 — 主文字色）
          cocoa: {
            50:  '#f9f3ec',
            100: '#ebd9c4',
            200: '#cfae89',
            300: '#a98257',
            400: '#7d5e3c',
            500: '#5a432a',
            600: '#43321f',
            700: '#3f2d1f', // 預設主文字
            800: '#2b1d14',
            900: '#1a110a',
          },
          // 牛仔藍（背心 — 副色，用於邊框、副資訊）
          denim: {
            50:  '#eef2f6',
            100: '#cfdae3',
            200: '#a9bbcc',
            300: '#7e96ad',
            400: '#5e7a91', // 預設
            500: '#496478',
            600: '#3a5061',
            700: '#2d3e4b',
            800: '#222e38',
            900: '#161e25',
          },
          // 單值口音色
          tongue: '#f4a8a8',  // 警示／前提違反 highlight
          leaf:   '#6a9a5a',  // 結果通過／成功
          // 語意訊號色（2026-07 UI 改版：統一綠黃紅、LED 燈號用）
          // 比 leaf/tongue 更飽和，供 LED 與顯著性標色；暖底上仍協調
          sig: {
            ok:   '#2f9e63',
            warn: '#e0940f',
            bad:  '#d9363e',
          },
        },
      },
    },
  },
  plugins: [],
}
