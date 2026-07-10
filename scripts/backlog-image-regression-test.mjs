import assert from 'node:assert/strict';
import { highResImage, imageQualityScore, isStillImage, preferredEventImage } from './backlog-image-utils.mjs';

const pinnedIcon = 'https://hayyjameel.org/wp-content/themes/JACD/safari-pinned-tab.png';
const highResolutionArtwork = 'https://hayyjameel.org/wp-content/uploads/2026/07/Pharah-3-1100x500.jpg';
const genericArtwork = 'https://example.org/uploads/event.jpg';

assert.equal(isStillImage(pinnedIcon), false, 'browser pinned-tab icons must never qualify as event artwork');
assert.equal(isStillImage(highResolutionArtwork), true);
assert.ok(imageQualityScore(highResolutionArtwork) > imageQualityScore(genericArtwork), 'explicit high-resolution artwork must outrank a generic image');
assert.equal(preferredEventImage(pinnedIcon, highResolutionArtwork), highResolutionArtwork, 'a browser icon must not replace high-resolution source artwork');
assert.equal(preferredEventImage(genericArtwork, highResolutionArtwork), highResolutionArtwork, 'lower-quality page metadata must not replace high-resolution source artwork');
assert.match(highResImage('https://assets.example.scene7.com/is/image/demo/event'), /wid=1600/);

console.log('BACKLOG_IMAGE_OK pinned_rejected=1 high_resolution_preserved=1');
