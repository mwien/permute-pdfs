import { PDFDocument } from "pdf-lib";
import { shuffle } from "underscore";
import { ZipWriter, BlobWriter } from "zip-js";

let files = [];

document
  .getElementById("fileInput")
  .addEventListener("change", function (event) {
    let file = event.target.files[0];
    let reader = new FileReader();

    reader.onload = function (event) {
      let arrayBuffer = event.target.result;
      files.push([file, arrayBuffer]);
      var fileList = document.getElementById("fileList");
      var fileName = document.createTextNode(file.name + ", ");
      fileList.appendChild(fileName);
    };

    reader.readAsArrayBuffer(file);
    this.value = null;
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
        // copy files
        let permutation = shuffle(files);
        permutations.push(permutation.map((x) => x[0]));
        const mergedPdfBytes = await mergePDFs(permutation.map((x) => x[1]));
        permuted_pdfs.push(
          `$(i).pdf`,
          new Blob([mergedPdfBytes], { type: "application/pdf" }),
        );
      }
      const zipWriter = new ZipWriter(new BlobWriter("application/zip"));

      files.forEach(async (file) => {
        await zipWriter.add(file[0], new BlobReader(file[1]));
      });
      var json_string = JSON.stringify(permutations, undefined, 2);
      zip.file("permutation.txt", new TextReader(json_string));
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
  console.log("hi");
});
