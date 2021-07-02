var docLibrary = {
    "default":{
        title: "",
        href: "",
        presHref: ""
    },
    "fmesi": {
        title: "Институт математики, информационных систем и цифровой экономики",
        href: "https://www.rea.ru/ru/org/faculties/Pages/fmesi.aspx",
        presHref: "https://www.rea.ru/images/temp/pres/pres-1.pdf"
    },
    "finfak": {
        title: "Финансовый факультет",
        href: "https://www.rea.ru/ru/org/faculties/Pages/finfak.aspx",
        presHref: "https://www.rea.ru/images/temp/pres/pres-2.pdf"
    }
};


var locationUrl = new URL(window.location);
var facInfo = docLibrary[locationUrl.searchParams.get("fac") ?? "default"];

// Loaded via <script> tag, create shortcut to access PDF.js exports.
var pdfjsLib = window['pdfjs-dist/build/pdf'];

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.js';

var pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    pageNumPending = null,
    scale = 1.5,
    canvas = document.getElementById('the-canvas'),
    ctx = canvas.getContext('2d');

/**
* Get page info from document, resize canvas accordingly, and render page.
* @param num Page number.
*/
async function renderPage(num) {
    pageRendering = true;
    canvas.classList.add("opacity-0");
    // Using promise to fetch the page
    let page = await pdfDoc.getPage(num);
    var viewport = page.getViewport({ scale: scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    setTimeout(async function(){
        // Render PDF page into canvas context
        var renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        var renderTask = page.render(renderContext);
    
        // Wait for rendering to finish
        renderTask.promise.then(function () {
            pageRendering = false;
            if (pageNumPending !== null) {
                // New page rendering is pending
                renderPage(pageNumPending);
                pageNumPending = null;
            }
            canvas.classList.remove("opacity-0");
        });
    
        // Update page counters
        //document.getElementById('page_num').textContent = num;
    }, 500);
}

/**
* If another page rendering in progress, waits until the rendering is
* finised. Otherwise, executes rendering immediately.
*/
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

/**
* Displays previous page.
*/
function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    queueRenderPage(pageNum);
}
//document.getElementById('prev').addEventListener('click', onPrevPage);

/**
* Displays next page.
*/
function onNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        pageNum = 1;
    }
    else{
        pageNum++;
    }
    queueRenderPage(pageNum);
}
//document.getElementById('next').addEventListener('click', onNextPage);

document.getElementById("fac-title").innerText = facInfo.title;
if (facInfo.href){
    let a = document.createElement("a");
    a.href = facInfo.href;
    a.innerText = "О факультете";
    document.querySelector(".kiosk-home-links").append(a);
}
/**
* Asynchronously downloads PDF.
*/
if (facInfo.presHref){
    pdfjsLib.getDocument(facInfo.presHref).promise.then(function (pdfDoc_) {
        pdfDoc = pdfDoc_;
        //document.getElementById('page_count').textContent = pdfDoc.numPages;
    
        // Initial/first page rendering
        renderPage(pageNum);
        setInterval(onNextPage, 2000);
    });
}
else{
    canvas.style.visibility = 'hidden';
}