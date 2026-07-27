#!/usr/bin/env python3
"""Autonomous content translation for EventLive (plan T7.1).

Reads reports/content-translation-pending.json (written by the site build),
translates every pending row with open-source offline models (Argos Translate,
opus-mt family, $0, no API keys), and writes chunk files compatible with
scripts/merge-content-translations.mjs so the same validated merge path is
used for machine and human batches alike.

Designed to run unattended inside GitHub Actions: any failure exits 0 with a
report so the sync never breaks because of translation — untranslated rows
simply stay in the visible pending backlog until the next run.
"""

import json
import sys
from pathlib import Path

ROOT = Path.cwd()
PENDING = ROOT / "reports" / "content-translation-pending.json"
OUT_DIR = ROOT / "workspaces" / "_auto-translate"
DIRECTIONS = [("en", "ar"), ("ar", "en")]


def log(message):
    print(f"AUTO_TRANSLATE {message}", flush=True)


def fail_soft(message):
    log(f"SKIPPED {message}")
    sys.exit(0)


def main():
    if not PENDING.exists():
        fail_soft("no pending report — run the site build first")
    report = json.loads(PENDING.read_text(encoding="utf-8"))
    pending = report.get("pending") or []
    if not pending:
        log("OK nothing pending")
        sys.exit(0)

    try:
        import argostranslate.package
        import argostranslate.translate
    except ImportError:
        fail_soft("argostranslate not installed (pip install argostranslate)")

    installed = {
        (lang.code)
        for lang in argostranslate.translate.get_installed_languages()
    }
    needed_pairs = {(row["source_lang"], row["target_lang"]) for row in pending}
    missing = [pair for pair in needed_pairs if pair[0] not in installed or pair[1] not in installed]
    if missing:
        log(f"installing language packages for {sorted(missing)}")
        try:
            argostranslate.package.update_package_index()
            available = argostranslate.package.get_available_packages()
            for source, target in needed_pairs:
                package = next(
                    (p for p in available if p.from_code == source and p.to_code == target),
                    None,
                )
                if package:
                    argostranslate.package.install_from_path(package.download())
        except Exception as error:  # noqa: BLE001 — degrade gracefully by design
            fail_soft(f"package install failed: {error}")

    translators = {}
    languages = argostranslate.translate.get_installed_languages()
    by_code = {lang.code: lang for lang in languages}
    for source, target in needed_pairs:
        if source in by_code and target in by_code:
            translation = by_code[source].get_translation(by_code[target])
            if translation:
                translators[(source, target)] = translation
    if not translators:
        fail_soft("no usable translation models installed")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    chunk_in = OUT_DIR / "chunk-01.json"
    chunk_out = OUT_DIR / "chunk-01.out.json"
    translated = {}
    skipped = 0
    for row in pending:
        translator = translators.get((row["source_lang"], row["target_lang"]))
        if not translator:
            skipped += 1
            continue
        try:
            result = translator.translate(row["source"]).strip()
        except Exception:  # noqa: BLE001
            skipped += 1
            continue
        if result:
            translated[row["key"]] = result
        else:
            skipped += 1

    handled = [row for row in pending if row["key"] in translated]
    chunk_in.write_text(json.dumps(handled, ensure_ascii=False, indent=1), encoding="utf-8")
    chunk_out.write_text(json.dumps(translated, ensure_ascii=False, indent=1), encoding="utf-8")
    log(f"OK translated={len(translated)} skipped={skipped} out={OUT_DIR}")


if __name__ == "__main__":
    main()
