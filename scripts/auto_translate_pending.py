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
import re
import sys
from pathlib import Path

ROOT = Path.cwd()
PENDING = ROOT / "reports" / "content-translation-pending.json"
OUT_DIR = ROOT / "workspaces" / "_auto-translate"
DIRECTIONS = [("en", "ar"), ("ar", "en")]

SENTENCE_SPLIT = re.compile(r"(?<=[.!?؟])\s+|\s*•\s*")
ARABIC = re.compile(r"[ء-ي]")
LATIN = re.compile(r"[A-Za-z]")


MIXED_RUN_AR_TARGET = re.compile(r"[A-Za-z][A-Za-z0-9 ,;:'’&/()\-]{39,}")
MIXED_RUN_EN_TARGET = re.compile(r"[ء-ي][ء-ي0-9 ،؛:'’&/()\-]{39,}")


def has_source_language_run(text, target_lang):
    """True when the text still carries a long copied-through run of the
    source language (an untranslated sentence). Short Latin brand tokens in
    Arabic output (or Arabic proper nouns in English output) are fine —
    mirrors isMixedTranslationText in the node merge validator."""
    pattern = MIXED_RUN_AR_TARGET if target_lang == "ar" else MIXED_RUN_EN_TARGET
    return bool(pattern.search(text))


def normalize_hard_tokens(text):
    """Loosen tokens that make opus-mt copy a sentence verbatim instead of
    translating it (slashed compounds, digit-hyphen words)."""
    loosened = re.sub(r"(\w)/(\w)", r"\1 / \2", text)
    loosened = re.sub(r"(\d)-(\w)", r"\1 \2", loosened)
    return loosened


def translate_segmented(translator, text, target_lang):
    """Translate sentence by sentence so one hard sentence cannot poison the
    whole entry with copied-through source text. Returns None when any
    segment still comes back in the source language — a rejected row stays
    visibly pending rather than shipping mixed-language output."""
    segments = [seg for seg in SENTENCE_SPLIT.split(text) if seg and seg.strip()]
    if not segments:
        return None
    translated_parts = []
    for segment in segments:
        result = translator.translate(segment).strip()
        if has_source_language_run(result, target_lang):
            result = translator.translate(normalize_hard_tokens(segment)).strip()
        if has_source_language_run(result, target_lang):
            return None
        translated_parts.append(result)
    return " ".join(translated_parts).strip()


GLOSSARY_PATH = ROOT / "data" / "mt_glossary.json"


def load_glossary_entries():
    """Raw arabic->english dict from data/mt_glossary.json. Missing/broken
    file degrades to empty — translation must never break because of the
    glossary."""
    try:
        return json.loads(GLOSSARY_PATH.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001 — degrade gracefully by design
        return {}


def load_glossary(entries):
    """Curated ar->en entity glossary. Applied BEFORE machine translation so
    the engine never gets to hallucinate Saudi entity names (argos rendered
    'رقابة الهيئة' as 'control of UN-Women'). Longest terms first so compound
    names win over their substrings."""
    compiled = []
    for arabic, english in sorted(entries.items(), key=lambda item: -len(item[0])):
        # Standalone occurrences only: an Arabic term must not match inside a
        # longer word ('جدة' is a substring of 'المستجدة'). Attached-prefix
        # forms (بجدة، لجدة) are deliberately missed rather than risk
        # corrupting unrelated words.
        compiled.append((re.compile(rf"(?<![ء-ي]){re.escape(arabic)}(?![ء-ي])"), english))
    return compiled


def apply_glossary(text, glossary):
    """Replace known Arabic entity names with their canonical English before
    ar->en MT; argos copies Latin tokens through untranslated, which is
    exactly what we want for proper nouns."""
    for pattern, english in glossary:
        text = pattern.sub(english, text)
    return text


def load_reverse_glossary(entries):
    """WO-10: the ar->en substitution above relies on argos copying an
    embedded Latin token through an Arabic sentence unchanged — a behavior
    proven safe by the SFDA hallucination fix. The mirror image (embedding an
    Arabic token mid-sentence into an EN->AR model's input) has no such
    precedent and is a real risk: an en->ar model was never validated on
    mixed-script input and could mangle the surrounding English instead of
    passing the Arabic through. So the en->ar direction only gets a much
    narrower, much safer protection: an EXACT, WHOLE-VALUE match (the entire
    pending row, not a substring inside a longer sentence) bypasses MT
    entirely and uses the glossary's Arabic form directly. This is exactly
    the shape of the actual bug (event.venue = 'Qassim', event.organizer =
    'Saudi Tourism Authority' — short standalone values, not sentences).
    Generic institutional glosses ('the Authority', anything with a
    parenthetical acronym) are excluded: they are deliberately not proper
    nouns and would false-match too many unrelated short pending rows."""
    reverse = {}
    for arabic, english in entries.items():
        core = english.strip()
        if not core or core.lower().startswith("the ") or "(" in core:
            continue
        reverse[core.lower()] = arabic
    return reverse


def apply_reverse_glossary(text, reverse_glossary):
    """Exact whole-value glossary bypass for en->ar rows (see
    load_reverse_glossary). Returns the canonical Arabic form, or None when
    the row is not an exact glossary hit — callers fall back to MT."""
    return reverse_glossary.get(text.strip().lower())


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

    needed_pairs = {(row["source_lang"], row["target_lang"]) for row in pending}

    # Model availability is PER DIRECTION PAIR, not per language code: the
    # en->ar package alone registers both "en" and "ar" as installed languages
    # while ar->en rows silently skip every run. Probe the actual translation
    # object for each needed pair and install exactly the pairs that lack one.
    def usable_translators():
        languages = argostranslate.translate.get_installed_languages()
        by_code = {lang.code: lang for lang in languages}
        pairs = {}
        for source, target in needed_pairs:
            if source in by_code and target in by_code:
                translation = by_code[source].get_translation(by_code[target])
                if translation:
                    pairs[(source, target)] = translation
        return pairs

    translators = usable_translators()
    missing = sorted(pair for pair in needed_pairs if pair not in translators)
    if missing:
        log(f"installing language packages for {missing}")
        try:
            argostranslate.package.update_package_index()
            available = argostranslate.package.get_available_packages()
            for source, target in missing:
                package = next(
                    (p for p in available if p.from_code == source and p.to_code == target),
                    None,
                )
                if package:
                    argostranslate.package.install_from_path(package.download())
        except Exception as error:  # noqa: BLE001 — degrade gracefully by design
            fail_soft(f"package install failed: {error}")
        translators = usable_translators()
        still_missing = sorted(pair for pair in needed_pairs if pair not in translators)
        if still_missing:
            log(f"WARNING no model available for {still_missing} — their rows stay pending")
    if not translators:
        fail_soft("no usable translation models installed")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    chunk_in = OUT_DIR / "chunk-01.json"
    chunk_out = OUT_DIR / "chunk-01.out.json"
    glossary_entries = load_glossary_entries()
    glossary = load_glossary(glossary_entries)
    reverse_glossary = load_reverse_glossary(glossary_entries)
    if glossary:
        log(f"glossary loaded with {len(glossary)} entity terms ({len(reverse_glossary)} reverse-eligible)")
    translated = {}
    glossary_hits = 0
    skipped = 0
    for row in pending:
        # Exact-value glossary hits (WO-10: venue/organizer entity names like
        # 'Qassim') bypass MT entirely — no installed model required, no risk
        # of the en->ar model mangling an embedded Arabic token.
        if row["target_lang"] == "ar":
            exact = apply_reverse_glossary(row["source"], reverse_glossary)
            if exact:
                translated[row["key"]] = exact
                glossary_hits += 1
                continue
        translator = translators.get((row["source_lang"], row["target_lang"]))
        if not translator:
            skipped += 1
            continue
        try:
            source_text = row["source"]
            if row["target_lang"] == "en":
                source_text = apply_glossary(source_text, glossary)
            result = translate_segmented(translator, source_text, row["target_lang"])
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
    log(f"OK translated={len(translated)} glossary_exact={glossary_hits} skipped={skipped} out={OUT_DIR}")


if __name__ == "__main__":
    main()
