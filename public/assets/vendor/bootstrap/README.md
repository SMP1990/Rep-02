# Vendored Bootstrap 5.3.3

Self-hosted rather than loaded from a CDN — see
docs/media-platform/phase-5-frontend.md §5.4 for why. Only the minified
CSS/JS bundle + source maps are kept (not the full Sass/source tree).

To upgrade: fetch the new version's `dist/css/bootstrap.min.css{,.map}`
and `dist/js/bootstrap.bundle.min.js{,.map}` from the official Bootstrap
release and replace these files — update this README's version number
and the layout's cache-busting query string (if one is added) at the
same time.

Source: https://getbootstrap.com/ (MIT License, see LICENSE in this directory)
Version: 5.3.3
