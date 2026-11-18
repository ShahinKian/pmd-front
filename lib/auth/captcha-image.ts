import { randomInt } from "node:crypto";

const glyphs: Record<string, string> = {
  "0": "M11 2C1 2 1 30 11 30C21 30 21 2 11 2Z",
  "1": "M5 8L11 2V30M5 30H17",
  "2": "M3 8C3-1 20-1 20 8C20 14 7 20 3 30H20",
  "3": "M3 4C14-2 23 5 17 12L11 15C25 16 22 35 3 28",
  "4": "M17 30V2L2 21H21",
  "5": "M20 2H4L3 15C23 7 25 36 3 28",
  "6": "M18 3C1-3-2 32 11 30C25 30 22 10 6 15",
  "7": "M2 2H21L8 30",
  "8": "M11 15C-3 10 1 2 11 2C21 2 25 10 11 15C-5 20 0 30 11 30C22 30 27 20 11 15Z",
  "9": "M17 17C1 23-2 2 11 2C25 0 22 33 4 29",
  "+": "M3 16H19M11 8V24",
  "-": "M3 16H19",
  "=": "M3 11H19M3 21H19",
  "?": "M3 8C3-1 20-1 20 8C20 14 11 14 11 21M11 29V30",
};

export function renderCaptchaSvg(expression: string): string {
  const characters = Array.from(expression.replaceAll(" ", ""));
  const start = (240 - characters.length * 30) / 2;
  const paths = characters.map((character, index) => {
    const path = glyphs[character];
    if (!path) throw new Error("Unsupported captcha character.");
    const x = start + index * 30;
    const y = 17 + randomInt(-2, 3);
    const angle = randomInt(-5, 6);
    return `<g transform="translate(${x} ${y}) rotate(${angle} 11 16)"><path d="${path}" /></g>`;
  }).join("");
  const lines = Array.from({ length: 5 }, () =>
    `<line x1="4" y1="${randomInt(8, 58)}" x2="236" y2="${randomInt(8, 58)}" />`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="66" viewBox="0 0 240 66" preserveAspectRatio="xMidYMid meet">
    <rect width="240" height="66" rx="10" fill="#f8f7ff" />
    <g stroke="#6d28d9" stroke-width="1" opacity="0.14">${lines}</g>
    <g fill="none" stroke="#6d28d9" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
  </svg>`;
}
