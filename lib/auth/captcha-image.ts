import { randomInt } from "node:crypto";
import { PNG } from "pngjs";

const glyphs: Record<string, string> = {
  "0": "01110/10001/10011/10101/11001/10001/01110",
  "1": "00100/01100/00100/00100/00100/00100/01110",
  "2": "01110/10001/00001/00010/00100/01000/11111",
  "3": "11110/00001/00001/01110/00001/00001/11110",
  "4": "00010/00110/01010/10010/11111/00010/00010",
  "5": "11111/10000/10000/11110/00001/00001/11110",
  "6": "01110/10000/10000/11110/10001/10001/01110",
  "7": "11111/00001/00010/00100/01000/01000/01000",
  "8": "01110/10001/10001/01110/10001/10001/01110",
  "9": "01110/10001/10001/01111/00001/00001/01110",
  "+": "00000/00100/00100/11111/00100/00100/00000",
  "-": "00000/00000/00000/11111/00000/00000/00000",
  "=": "00000/00000/11111/00000/11111/00000/00000",
  "?": "01110/10001/00001/00010/00100/00000/00100",
};

export function renderCaptchaPng(expression: string): Buffer {
  const width = 240;
  const height = 66;
  const image = new PNG({ width, height });
  const characters = Array.from(expression.replaceAll(" ", ""));
  const start = (width - characters.length * 30) / 2;

  function pixel(x: number, y: number, red: number, green: number, blue: number) {
    const offset = (y * width + x) * 4;
    image.data[offset] = red;
    image.data[offset + 1] = green;
    image.data[offset + 2] = blue;
    image.data[offset + 3] = 255;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) pixel(x, y, 248, 247, 255);
  }

  for (let line = 0; line < 5; line++) {
    const left = randomInt(8, 58);
    const right = randomInt(8, 58);
    for (let x = 4; x < width - 4; x++) {
      const y = Math.round(left + (right - left) * (x - 4) / (width - 8));
      pixel(x, y, 226, 218, 250);
    }
  }

  characters.forEach((character, index) => {
    const glyph = glyphs[character];
    if (!glyph) throw new Error("Unsupported captcha character.");
    const left = start + index * 30 + 4 + randomInt(-1, 2);
    const top = 19 + randomInt(-2, 3);
    glyph.split("/").forEach((row, rowIndex) => {
      Array.from(row).forEach((cell, column) => {
        if (cell !== "1") return;
        for (let y = 0; y < 4; y++) {
          for (let x = 0; x < 4; x++) {
            pixel(left + column * 4 + x, top + rowIndex * 4 + y, 109, 40, 217);
          }
        }
      });
    });
  });

  return PNG.sync.write(image, { colorType: 2 });
}
