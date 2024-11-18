import { PDFDocument } from "pdf-lib";
import { shuffle } from "lodash";
import { ZipWriter, BlobWriter, BlobReader, TextReader } from "@zip.js/zip.js";

const pdfInput = document.getElementById("pdfInput");
const fileList = document.getElementById("fileList");
const numPermutations = document.getElementById("num_permutations");
const includeTitle = document.getElementById("includeTitle");
const titleForm = document.getElementById("titleForm");
const titleInput = document.getElementById("titleInput");
const titleFilename = document.getElementById("titleFilename");
const includeStamp = document.getElementById("includeStamp");
const stampForm = document.getElementById("stampForm");
const stampOffset = document.getElementById("stampOffset");
const stampText = document.getElementById("stampText");
const collapse = document.getElementById("collapse");
const makeEven = document.getElementById("makeEven");
const clearButton = document.getElementById("clear");
const processing = document.getElementById("processing");
const generateButton = document.getElementById("generate-button");

let files = [];

window.onload = function () {
  // initial settings for page reloads
  if (includeTitle.checked) {
    titleForm.style.display = "flex";
  }

  if (includeStamp.checked) {
    stampForm.style.display = "flex";
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
    listItem.classList.add("filename"); // Apply the .filename styling
    listItem.textContent = file.name;
    fileList.appendChild(listItem);
  };

  reader.readAsArrayBuffer(file);
  pdfInput.value = null;
  generateButton.disabled = files.length === 0;
});

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
    const n = numPermutations.valueAsNumber;
    const permutations = [];
    const permutedPdfBytes = [];
    // TODO: maybe just read title onchange and not just at generate button press
    let title = [null, null];
    if (includeTitle.checked && titleInput.files.length > 0) {
      const file = titleInput.files[0];
      const arrayBuffer = await read(file);
      title = [file, arrayBuffer];
    } // TODO: add error handling
    for (let i = 1; i <= n; i++) {
      processing.innerHTML = "Permutation " + i + "...";
      const permutation = shuffle(files);
      // store permutation of file names in permutations
      permutations.push(permutation.map((x) => x[0]));
      // merge pdfs in permutation order
      const mergedPdf = await mergePDFs(
        title[1],
        permutation.map((x) => x[1]),
      );

      if (includeStamp.checked) {
        const firstPage = mergedPdf.getPage(0);
        const height = firstPage.getHeight();
        const fontSize = 20;
        firstPage.drawText(stampText.value + " " + i, {
          x: stampOffset.valueAsNumber,
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

titleInput.addEventListener("change", function (event) {
  titleFilename.innerHTML = event.target.files[0].name;
});

document.querySelectorAll(".faq-question").forEach((question) => {
  question.addEventListener("click", () => {
    const faqItem = question.parentElement;
    faqItem.classList.toggle("active");
  });
});
