# Rewrites the ?v= version on each asset link in index.html to a hash of the
# file's contents, so browsers fetch the new file right after a deploy.
# Run before committing: python3 bump.py
import hashlib, re
page = "index.html"
html = open(page).read()
for asset in ["styles.css", "main.js", "field.js", "message.js"]:
    digest = hashlib.sha1(open(asset, "rb").read()).hexdigest()[:8]
    html = re.sub(r'(href|src)="' + re.escape(asset) + r'(\?v=[0-9a-f]+)?"',
                  lambda m: f'{m.group(1)}="{asset}?v={digest}"', html)
open(page, "w").write(html)
