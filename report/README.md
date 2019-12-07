# Report

## Typesetting

The report is typeset using LaTeX, using the
[OSDI 2018 submission template](https://www.usenix.org/conference/osdi18/requirements-authors).

## Diagrams

Diagrams are mainly generated using [Draw.io](https://draw.io). To export a `.pdf_tex` file for
embedding in the resultant PDF, export the diagram as SVG on Draw.io, and use Inkscape to convert it
to LaTeX format:

```sh
inkscape -D -z --file /path/to/file.svg --export-pdf /path/to/file.pdf --export-latex
```

Note that all paths must be absolute.

## Citations

All citations are written in [BibTeX format](http://www.bibtex.org/Format/), and stored in
`bibliography.bib`.
