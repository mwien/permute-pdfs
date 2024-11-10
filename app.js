import { PDFDocument } from "pdf-lib";
import { shuffle } from "lodash";
import { ZipWriter, BlobWriter, BlobReader, TextReader } from "@zip.js/zip.js";

let pdfInput = document.getElementById("pdfInput");
let fileList = document.getElementById("fileList");
let numPermutations = document.getElementById("num_permutations");
let includeTitle = document.getElementById("includeTitle");
let titleForm = document.getElementById("titleForm");
let titleInput = document.getElementById("titleInput");
let includeStamp = document.getElementById("includeStamp");
let stampForm = document.getElementById("stampForm");
let stampOffset = document.getElementById("stampOffset");
let stampText = document.getElementById("stampText");
let collapse = document.getElementById("collapse");
let makeEven = document.getElementById("makeEven");
let clearButton = document.getElementById("clear");
let generateButton = document.getElementById("generate-button");

// initial settings for page reloads
if (includeTitle.checked) {
  titleForm.style.display = "flex";
}

if (includeStamp.checked) {
  stampForm.style.display = "flex";
}

let files = [];

pdfInput.addEventListener("change", function (event) {
  let file = event.target.files[0];
  let reader = new FileReader();

  reader.onload = function (event) {
    let arrayBuffer = event.target.result;
    files.push([file, arrayBuffer]);
    const listItem = document.createElement("div");
    listItem.classList.add("filename"); // Apply the .filename styling
    listItem.textContent = `${file.name}`;
    fileList.appendChild(listItem);
  };

  reader.readAsArrayBuffer(file);
  this.value = null;
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

generateButton.addEventListener("click", async () => {
  try {
    let n = numPermutations.valueAsNumber;
    let permutations = [];
    let permutedPdfBytes = [];
    let title = [null, null];
    if (includeTitle.checked && titleInput.files.length > 0) {
      let file = titleInput.files[0];
      let reader = new FileReader();

      reader.onload = function (event) {
        let arrayBuffer = event.target.result;
        title = [file, arrayBuffer];
      };

      reader.readAsArrayBuffer(file);
    } // add error handling
    for (let i = 1; i <= n; i++) {
      let permutation = shuffle(files);
      // store permutation of file names in permutations
      permutations.push(permutation.map((x) => x[0]));
      // merge pdfs in permutation order
      let mergedPdf = await mergePDFs(
        title[1],
        permutation.map((x) => x[1]),
      );

      let firstPage = mergedPdf.getPage(0);
      const height = firstPage.getHeight();
      const fontSize = 20;
      firstPage.drawText(stampText.value + " " + i, {
        x: stampOffset.valueAsNumber,
        y: height - 2 * fontSize,
        size: fontSize,
      });

      if (makeEven.checked && mergedPdf.getPages().length % 2 != 0) {
        mergedPdf.addPage();
      }

      const mergedPdfBytes = await mergedPdf.save();
      permutedPdfBytes.push(mergedPdfBytes);
    }

    if (!collapse.checked) {
      // write files to zip
      const zipWriter = new ZipWriter(new BlobWriter("application/zip"));
      for (let i = 0; i < n; i++) {
        let pdfName = i + 1 + ".pdf";
        let pdfFile = new Blob([permutedPdfBytes[i]], {
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
      let fullPdf = await mergePDFs(null, permutedPdfBytes);
      let fullPdfBytes = await fullPdf.save();
      let result = new Blob([fullPdfBytes], { type: "application/pdf" });

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
  } catch (error) {
    console.error("Error generating PDFs:", error);
  }
});

clearButton.addEventListener("click", () => {
  files = [];
  fileList.innerHTML = "";
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

document.querySelectorAll(".faq-question").forEach((question) => {
  question.addEventListener("click", () => {
    const faqItem = question.parentElement;
    faqItem.classList.toggle("active");
  });
});
