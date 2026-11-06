"""Render the three C4 blocks from the architecture README using Mermaid CLI.

Python 3.9+ and Node.js are required. Use @mermaid-js/mermaid-cli 11.17.1
(Mermaid 11.17.2) and supply its src/cli.js plus a Chromium executable:

python render.py --cli /path/to/mermaid-cli/src/cli.js --browser /path/to/chrome

The package and browser are external tools; this does not install project dependencies.
"""

import argparse
import re
import subprocess
import tempfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cli", type=Path, required=True)
    parser.add_argument("--browser", type=Path, required=True)
    parser.add_argument("--diagram", choices=("c1-context", "c2-containers", "c3-components"))
    arguments = parser.parse_args()
    cli = arguments.cli.resolve(strict=True)
    browser = arguments.browser.resolve(strict=True)
    evidence = Path(__file__).resolve().parent
    repository = evidence.parents[4]
    architecture = repository / "docs/architecture/README.md"
    source = architecture.read_text(encoding="utf-8")
    names = ("c1-context", "c2-containers", "c3-components")
    headings = ("## C4 system context", "## C4 containers", "## C4 components (C3)")
    exports = repository / "docs/architecture/exports"
    exports.mkdir(exist_ok=True)

    # Only extract the C4 sections, leaving class/sequence/ERD exports untouched.
    with tempfile.TemporaryDirectory(prefix="connectsphere-c4-") as temporary:
        work = Path(temporary)
        import json

        puppeteer = work / "puppeteer.json"
        puppeteer.write_text(json.dumps({"executablePath": str(browser), "headless": True}))
        for heading, name in zip(headings, names):
            if arguments.diagram and arguments.diagram != name:
                continue
            section = source.split(heading + "\n", 1)[1].split("\n## ", 1)[0]
            blocks = re.findall(r"```mermaid\s*\n(.*?)```", section, re.S)
            if len(blocks) != 1:
                raise ValueError("Expected exactly one Mermaid block under " + heading)
            if "title:" not in blocks[0] or 'key["Legend' not in blocks[0]:
                raise ValueError("Missing standalone title or legend: " + name)
            diagram = work / (name + ".mmd")
            diagram.write_text(blocks[0], encoding="utf-8")
            for extension in ("svg", "png"):
                staged = work / (name + "." + extension)
                command = [
                    "node", str(cli), "-i", str(diagram), "-o", str(staged),
                    "-c", str(evidence / "mermaid-config.json"),
                    "-p", str(puppeteer), "-w", "2400", "-H", "1600", "-s", "1.5",
                ]
                subprocess.run(command, cwd=repository, check=True, timeout=90)
                # Rendering to a fresh temporary file avoids a viewer holding the target
                # open while Chromium is producing the next image.
                target = exports / staged.name
                target.write_bytes(staged.read_bytes())
                print("Rendered " + str(target.relative_to(repository)), flush=True)


if __name__ == "__main__":
    main()
