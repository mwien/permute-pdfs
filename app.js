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
  const mergedPdfBytes = await mergedPdf.save();
  return mergedPdfBytes;
}

// get title file directly from titleInput TODO:
generateButton.addEventListener("click", async () => {
  try {
    let n = numPermutations.valueAsNumber;
    let permutations = [];
    let permuted_pdfs = [];
    var title = ["", ""];
    console.log(title);
    if (includeTitle.checked) {
      console.log(titleFile);
      title = titleFile;
    }
    for (let i = 1; i <= n; i++) {
      let permutation = shuffle(files);
      // store permutation of file names in permutations
      permutations.push(permutation.map((x) => x[0]));
      // merge pdfs in permutation order
      console.log(title);
      const mergedPdfBytes = await mergePDFs(
        title[1],
        permutation.map((x) => x[1]),
      );
      // store merged pdf in permuted_pdfs
      permuted_pdfs.push([
        i + ".pdf",
        new Blob([mergedPdfBytes], { type: "application/pdf" }),
      ]);
    }

    // write files to zip
    const zipWriter = new ZipWriter(new BlobWriter("application/zip"));
    permuted_pdfs.forEach(async (pdf) => {
      await zipWriter.add(pdf[0], new BlobReader(pdf[1]));
    });

    var permutation_string = "";
    for (let i = 0; i < n; i++) {
      permutation_string += i + 1 + ": ";
      for (const file of permutations[i]) {
        permutation_string += file.name + ", ";
      }
      permutation_string += "\n";
    }
    zipWriter.add("permutation.txt", new TextReader(permutation_string));

    const zipBlob = await zipWriter.close();

    const link = document.createElement("a");
    link.href = URL.createObjectURL(zipBlob);
    link.download = "files.zip";
    link.click();
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
