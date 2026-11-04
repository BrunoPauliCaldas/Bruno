#!/usr/bin/env python3
"""Build the publishable page: inline the brand font as a data URI.

The font is licensed to OMNI TONE GmbH and must not be redistributed, so it is not
committed to this repository. Place OMNITONEGrotesk-Medium.woff2 next to index.html
and run:  python3 build.py <output path>
"""
import base64, pathlib, sys
here = pathlib.Path(__file__).resolve().parent
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else here / 'dist' / 'index.html'
html = (here / 'index.html').read_text(encoding='utf-8')
font = here / 'OMNITONEGrotesk-Medium.woff2'
needle = 'url("OMNITONEGrotesk-Medium.woff2")'
if not font.exists():
    sys.exit(f'Font file missing: {font}')
if needle not in html:
    sys.exit('Font reference not found in index.html')
b64 = base64.b64encode(font.read_bytes()).decode('ascii')
html = html.replace(needle, f'url("data:font/woff2;base64,{b64}")')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding='utf-8')
print(f'wrote {out} ({len(html):,} bytes)')
