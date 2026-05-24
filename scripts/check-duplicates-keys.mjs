import { XMLParser } from "fast-xml-parser";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const LANG_DIR = "./langs";

const parser = new XMLParser({
  ignoreAttributes: false,
  preserveOrder: true,
});

function readXml(lang) {
  return fs.readFileSync(`${LANG_DIR}/Cafe_${lang}.xml`).toString();
}

function getLang(file) {
  return file.match(/^Cafe_([a-z]{2})\.xml$/)?.[1];
}

function collectIds(nodes, seen, duplicates) {
  nodes.forEach((node) => {
    const id = node[":@"]?.["@_id"];
    if (id) {
      if (seen.has(id)) {
        duplicates.push(id);
      } else {
        seen.add(id);
      }
    } else {
      const key = Object.keys(node).find((k) => k !== ":@");
      if (key && Array.isArray(node[key])) {
        collectIds(node[key], seen, duplicates);
      }
    }
  });
}

function checkLang(lang) {
  const xml = readXml(lang);
  const parsed = parser.parse(xml);
  const seen = new Set();
  const duplicates = [];

  collectIds(parsed[1].cafe, seen, duplicates);

  if (duplicates.length > 0) {
    console.log(
      `✖  Cafe_${lang}.xml — ${duplicates.length} duplicate key(s) found:`,
    );
    duplicates.forEach((id) => console.log(`     ~ ${id}`));
  } else {
    console.log(`✓  Cafe_${lang}.xml — no duplicates`);
  }

  return duplicates.length;
}

(function checkAll() {
  const files = fs.readdirSync(LANG_DIR);
  const changedFiles = process.env.CHANGED_FILES
    ? new Set(process.env.CHANGED_FILES.split(" ").map((f) => path.basename(f)))
    : null;

  const filesToCheck = files.filter((file) => {
    const lang = getLang(file);

    if (!lang) {
      return false;
    }

    if (changedFiles && !changedFiles.has(`Cafe_${lang}.xml`)) {
      return false;
    }

    return true;
  });

  const checkedNames = filesToCheck.map((f) => f).join(", ");
  console.log(
    `Checking ${filesToCheck.length} file(s): ${checkedNames}\n`,
  );

  let totalDuplicates = 0;
  filesToCheck.forEach((file) => {
    const lang = getLang(file);
    if (!lang) {
      console.log(`⚠  ${file} — skipping (lang not found)`);
      return;
    }
    totalDuplicates += checkLang(lang);
  });

  if (totalDuplicates > 0) {
    console.log(
      `\n✖  ${totalDuplicates} total duplicate(s) across ${filesToCheck.length} file(s)`,
    );
    process.exit(1);
  } else {
    console.log(
      `\n✓  All ${filesToCheck.length} checked file(s) are duplicate-free`,
    );
  }
})();
