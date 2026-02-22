# EventLive (MVP Pipeline)

MVP-first pipeline for EventLive (OCR clean data → unified JSON → interactive HTML → GitHub Pages).

## Quick start

```bash
npm install
npm run validate
npm run build
```

## Data contract
- Schema: `data/schema.json`
- Sample unified input: `data/sample_clean.json`
- Validation report: `reports/validation-report.md`

## Build output
- Interactive page: `dist/index.html`
- Build report: `reports/build-report.md`

## CI/CD
- Workflow: `.github/workflows/deploy.yml`
- Trigger: push to `main` or manual workflow dispatch
- Deploy target: GitHub Pages
