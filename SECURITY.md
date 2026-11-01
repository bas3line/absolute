# Security

Please don't report security problems in a public issue. Use GitHub's private reporting instead: [report a vulnerability](https://github.com/bas3line/absolute/security/advisories/new). It reaches [@bas3line](https://github.com/bas3line) directly.

absolute's site is static. The landing page and the control panel load their own files and nothing else: the fonts are served from the site, and the panel's demo session lives in the tab's memory, sends nothing anywhere and writes no cookies or storage. Reports about anything that could run someone else's code on the page, or about a dependency with a known hole, are especially welcome.

Fixes land on `main` and go live with the next deploy.
