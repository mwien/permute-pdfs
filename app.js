import { PDFDocument } from "pdf-lib";
import { includes, shuffle } from "lodash";
import { ZipWriter, BlobWriter, BlobReader, TextReader } from "@zip.js/zip.js";

let files = [];

document
  .getElementById("pdfInput")
  .addEventListener("change", function (event) {
    let file = event.target.files[0];
    let reader = new FileReader();

    reader.onload = function (event) {
      let arrayBuffer = event.target.result;
      files.push([file, arrayBuffer]);
      const listItem = document.createElement("div");
      listItem.classList.add("filename"); // Apply the .filename styling
      listItem.textContent = `${file.name}`;
      var fileList = document.getElementById("fileList");
      fileList.appendChild(listItem);
    };

    reader.readAsArrayBuffer(file);
    this.value = null;
    let generateButton = document.getElementById("generate-button");
    generateButton.disabled = files.length === 0;
  });

async function mergePDFs(files) {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const nextPdf = await PDFDocument.load(file);
    const copiedPages = await mergedPdf.copyPages(
      nextPdf,
      nextPdf.getPageIndices(),
    );
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  const mergedPdfBytes = await mergedPdf.save();
  return mergedPdfBytes;
}

document
  .getElementById("generate-button")
  .addEventListener("click", async () => {
    try {
      let num_permutations =
        document.getElementById("num_permutations").valueAsNumber;
      let permutations = [];
      let permuted_pdfs = [];
      for (let i = 1; i <= num_permutations; i++) {
        let permutation = shuffle(files);
        // store permutation of file names in permutations
        permutations.push(permutation.map((x) => x[0]));
        // merge pdfs in permutation order
        const mergedPdfBytes = await mergePDFs(permutation.map((x) => x[1]));
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
      for (let i = 0; i < num_permutations; i++) {
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

document.getElementById("clear").addEventListener("click", () => {
  files = [];
  var fileList = document.getElementById("fileList");
  fileList.innerHTML = "";
});

includeTitle = document.getElementById("includeTitle");
includeTitle.addEventListener("change", () => {
  let titleInput = document.getElementById("titleInput");
  if (includeTitle.checked) {
    titleInput.style.visibility = "visible";
  } else {
    titleInput.style.visibility = "hidden";
  }
});

document.querySelectorAll(".faq-question").forEach((question) => {
  question.addEventListener("click", () => {
    const faqItem = question.parentElement;
    faqItem.classList.toggle("active");
  });
});
