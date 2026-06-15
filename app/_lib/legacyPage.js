import fs from "node:fs";
import path from "node:path";

function bodyFromHtml(fileName) {
  const html = fs.readFileSync(path.join(process.cwd(), "web", fileName), "utf8");
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || "";
  return body.replace(/<script[\s\S]*?<\/script>/gi, "").trim();
}

export function LegacyPage({ fileName, scriptSrc }) {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: bodyFromHtml(fileName) }} />
      {scriptSrc ? <script src={scriptSrc} defer /> : null}
    </>
  );
}
