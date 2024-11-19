# PDF Permutations

A simple static webpage to generate random permutations of your PDF documents.

The site can be accessed at [https://permute-pdfs.pages.dev/](https://permute-pdfs.pages.dev/).

## Usage

In the simplest form you just upload your PDFs, specify the number of permutations you want and get a zip file with the PDFs merged in random orders.

Additionally, there are options to:

- add a title page to each permutation
- put some extra text on the first page that includes the number of the permutation
- get the permutations in one large PDF
- make the number of pages per permutation even by having a blank page added at the end if necessary
- setting a seed for the random generation to reproduce the same permutations later on

## Building the site

If you want to build the site yourself, just run:

```bash
npm install
npm run build
```

Afterwards, the site is available in the ```build``` folder.
