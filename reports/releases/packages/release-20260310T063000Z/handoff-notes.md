# Handoff Notes
- Release ID: release-20260310T063000Z
- Program title: الملتقى السعودي لتجربة المستفيد 2026
- Organizer: جمعية التحول المؤسسي
- Status: latest approved release
- Latest release meaning: this is the only release that should be shared as the current official visitor-facing version.
- Live site base URL: https://example.test/eventlive-sa/

## What the organizer receives
- Program page: https://example.test/eventlive-sa/
- Print view: https://example.test/eventlive-sa/print.html
- Share landing: https://example.test/eventlive-sa/share.html
- Delivery manifest: dist/current-delivery-manifest.md
- Share kit: dist/share-kit.md
- Release bundle: dist/current-release-bundle.json
- Live site metadata: dist/current-live-site.json

## When to use each file
- Use the program page as the main live visitor-facing program.
- Use the print view for reception desks, signage support, and quick printable review.
- Use the share landing for short-link or QR based distribution.
- Use the delivery manifest and release bundle for operational review and audit.

## Event-day updates
- Any same-day change requires a new approved publish cycle with updated `program.updated_at`.
- The latest approved release always replaces the previous official live version.
- Superseded approved releases should be archived and must not remain the active shared version.

## Organizer action required for a new release
- Confirm the updated sessions, rooms, speakers, and timing changes.
- Approve the preview or diff before the new release is shared publicly.
- Stop sharing any previous QR or short-link if it points to a superseded release.

## Operational notes
- This package is static-first and contains no backend workflow.
- Current live URLs are resolved from EVENTLIVE_PUBLIC_BASE_URL during publish/deploy.
- QR output remains a placeholder note until an image asset is generated.
