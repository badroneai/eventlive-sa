# INSAIGHTS PDF capability verification

## Result

`PASS_WITH_MINOR_BIDI_NOTE`

The direct `POST /api/generate-pdf` probe returned a valid, one-page A4 PDF rather than the zero-byte body observed by the browser response interceptor.

- HTTP: `200`
- Content type: `application/pdf`
- Bytes: `63,941`
- SHA-256: `762973242a29248c6e705f1cadf6826689e8c41742a108240d5aca68e8b35f72`
- Generator: `react-pdf`
- PDF version: `1.3`
- Pages: `1`
- Encrypted: `no`
- JavaScript: `no`

## Visual inspection

The PDF was rendered at 140 DPI with Poppler and inspected at original resolution.

- INSAIGHTS and DataSaudi/MEP marks render cleanly.
- The question, answer, table, source link, disclaimer, and page number are present.
- No text is clipped or overlapped.
- Table borders and wrapped cells remain legible.
- The Saudi-riyal symbol renders.
- Footer and margins fit within the A4 page.
- Minor note: the mixed Arabic/UTC timestamp line uses visually awkward bidirectional ordering, but remains readable and does not affect the report body.

Text extraction also succeeded (`3,449` bytes), confirming that the PDF contains selectable text rather than a flat image.

## Boundary

This verifies the PDF-generation surface and the rendering of one English parity answer. It does not prove that every long Arabic conversation or every embedded visualization will paginate correctly.
