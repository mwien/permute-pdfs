import { PDFDocument } from "pdf-lib";
import { ZipWriter, BlobWriter, BlobReader, TextReader } from "@zip.js/zip.js";
import * as seedrandom from "seedrandom";

const pdfInput = document.getElementById("pdf-input");
const fileList = document.getElementById("file-list");
const numPermutations = document.getElementById("num-permutations");
const includeTitle = document.getElementById("include-title");
const titleForm = document.getElementById("title-form");
const titleInput = document.getElementById("title-input");
const titleFilename = document.getElementById("title-filename");
const includeStamp = document.getElementById("include-stamp");
const stampForm = document.getElementById("stamp-form");
const stampOffset = document.getElementById("stamp-offset");
const stampText = document.getElementById("stamp-text");
const collapse = document.getElementById("collapse");
const makeEven = document.getElementById("make-even");
const addSeed = document.getElementById("add-seed");
const seedForm = document.getElementById("seed-form");
const seedInput = document.getElementById("seed-input");
const clearButton = document.getElementById("clear");
const processing = document.getElementById("processing");
const generateButton = document.getElementById("generate-button");

let files = [];

window.onload = function () {
  if (includeTitle.checked) {
    titleForm.style.display = "flex";
  }

  if (includeStamp.checked) {
    stampForm.style.display = "flex";
  }

  if (addSeed.checked) {
    seedForm.style.display = "flex";
  }

  pdfInput.value = null;
  titleInput.value = null;

  generateButton.disabled = files.length === 0;
};

pdfInput.addEventListener("change", function (event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    const arrayBuffer = event.target.result;
    files.push([file, arrayBuffer]);
    const listItem = document.createElement("div");
    listItem.classList.add("filename");
    listItem.textContent = file.name;
    fileList.appendChild(listItem);
  };

  reader.readAsArrayBuffer(file);
  pdfInput.value = null;
  generateButton.disabled = files.length === 0;
});

function seededShuffle(arrayIn, rng) {
  const array = [...arrayIn];
  // Fisher-Yates Shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function appendPDF(toPdf, fromPdf) {
  const newPages = await toPdf.copyPages(fromPdf, fromPdf.getPageIndices());
  newPages.forEach((page) => toPdf.addPage(page));
}

async function mergePDFs(title, files) {
  const mergedPdf = await PDFDocument.create();
  if (title != null) {
    const titlePdf = await PDFDocument.load(title);
    await appendPDF(mergedPdf, titlePdf);
  }
  for (const file of files) {
    const nextPdf = await PDFDocument.load(file);
    await appendPDF(mergedPdf, nextPdf);
  }
  return mergedPdf;
}

function getPermutationString(permutations) {
  var permutation_string = "";
  for (let i = 0; i < permutations.length; i++) {
    permutation_string += i + 1 + ": ";
    for (const file of permutations[i]) {
      permutation_string += file.name + ", ";
    }
    permutation_string += "\n";
  }
  return permutation_string;
}

const read = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });

generateButton.addEventListener("click", async () => {
  try {
    let n = numPermutations.valueAsNumber;
    if (Number.isNaN(n)) {
      console.log(
        "Did not receive number of permutations, choose default value 10",
      );
      n = 10;
    }
    const permutations = [];
    const permutedPdfBytes = [];
    let rng;
    if (addSeed.checked) {
      const seed = seedInput.valueAsNumber;
      if (Number.isNaN(seed)) {
        console.log("Did not receive seed even though one was specified!");
      }
      rng = seedrandom.default(seed);
    } else {
      rng = seedrandom.default();
    }
    let title = [null, null];
    if (includeTitle.checked && titleInput.files.length > 0) {
      const file = titleInput.files[0];
      const arrayBuffer = await read(file); // alternatively, read onchange
      title = [file, arrayBuffer];
    }
    for (let i = 1; i <= n; i++) {
      processing.innerHTML = "Permutation " + i + "...";
      const permutation = seededShuffle(files, rng);
      // store permutation of file names in permutations
      permutations.push(permutation.map((x) => x[0]));
      // merge pdfs in permutation order
      const mergedPdf = await mergePDFs(
        title[1],
        permutation.map((x) => x[1]),
      );

      if (includeStamp.checked) {
        const firstPage = mergedPdf.getPage(0);
        const { width, height } = firstPage.getSize();
        const fontSize = 20;
        let offset = stampOffset.valueAsNumber;
        if (Number.isNaN(stampOffset.valueAsNumber)) {
          console.log("Did not receive offset, choose default value 50");
          offset = 50;
        }
        if (stampText.value == "") {
          console.log(
            "No text for stamp received. Printing only permutation number.",
          );
        }
        firstPage.drawText(stampText.value + " " + i, {
          x: (offset * width) / 100,
          y: height - 2 * fontSize,
          size: fontSize,
        });
      }

      if (makeEven.checked && mergedPdf.getPages().length % 2 != 0) {
        mergedPdf.addPage();
      }

      const mergedPdfBytes = await mergedPdf.save();
      permutedPdfBytes.push(mergedPdfBytes);
    }

    if (!collapse.checked) {
      // write files to zip
      processing.innerHTML = "Creating zip file...";
      const zipWriter = new ZipWriter(new BlobWriter("application/zip"));
      for (let i = 0; i < n; i++) {
        const pdfName = i + 1 + ".pdf";
        const pdfFile = new Blob([permutedPdfBytes[i]], {
          type: "application/pdf",
        });
        await zipWriter.add(pdfName, new BlobReader(pdfFile));
      }

      zipWriter.add(
        "permutations.txt",
        new TextReader(getPermutationString(permutations)),
      );

      const zipBlob = await zipWriter.close();

      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = "files.zip";
      link.click();
    } else {
      // write files to single pdf
      processing.innerHTML = "Collapse PDFs...";
      const fullPdf = await mergePDFs(null, permutedPdfBytes);
      const fullPdfBytes = await fullPdf.save();
      const result = new Blob([fullPdfBytes], { type: "application/pdf" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(result);
      link.download = "permutations.pdf";
      link.click();
      URL.revokeObjectURL(link.href);
      const txt = new Blob([getPermutationString(permutations)], {
        type: "text/plain",
      });
      const txtLink = document.createElement("a");
      txtLink.download = "permutations.txt";
      txtLink.href = URL.createObjectURL(txt);
      txtLink.click();
      URL.revokeObjectURL(txtLink.href);
    }
    processing.innerHTML = "";
  } catch (error) {
    console.error("Error generating PDFs:", error);
  }
});

clearButton.addEventListener("click", () => {
  files = [];
  pdfInput.value = null;
  titleInput.value = null;
  titleFilename.innerHTML = "&nbsp;";
  const span = document.createElement("span");
  span.innerHTML = "Files: ";
  fileList.innerHTML = "";
  fileList.appendChild(span);
});

includeTitle.addEventListener("change", () => {
  if (includeTitle.checked) {
    titleForm.style.display = "flex";
  } else {
    titleForm.style.display = "none";
  }
});

includeStamp.addEventListener("change", () => {
  if (includeStamp.checked) {
    stampForm.style.display = "flex";
  } else {
    stampForm.style.display = "none";
  }
});

addSeed.addEventListener("change", () => {
  if (addSeed.checked) {
    seedForm.style.display = "flex";
  } else {
    seedForm.style.display = "none";
  }
});

titleInput.addEventListener("change", function (event) {
  titleFilename.innerHTML = event.target.files[0].name;
});

document.querySelectorAll(".faq-question").forEach((question) => {
  question.addEventListener("click", () => {
    const faqItem = question.parentElement;
    faqItem.classList.toggle("active");
  });
});
