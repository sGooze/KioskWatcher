// main_inject.js
// Внедряется в код всех сайтов
async function getFromStorage(name){
    let stored = await browser.storage.local.get(name);
    return (stored) ? Reflect.get(stored, name) : undefined;
}

// browser.storage.local.get('restrictRedirect').then(async (set) => {
//     if (!set.restrictRedirect) return;
//     /*if (!(window.location.href.includes("student.rea") || !window.location.href.includes("abitlist.rea") 
//         || window.location.href.includes("intkiosk.rea"))){*/
//     let home = await getFromStorage("kioskHome");
//     let homeUrl = new URL(home);

//     if (!(window.location.href.includes(homeUrl.hostname))){
//         //location.href = "https://intkiosk.rea.ru/logged_home.aspx";
//         location.href = home;
//     }
//     else if (window.location.href.includes('https://student.rea.ru/index.php')){
//         location.href = home;
//     }
// })
async function getHomeUrl(){
    let param = await getFromStorage("otherHomeParams");
    return (await getFromStorage("useInternalHomePage"))
    ? (browser.runtime.getURL("kiosk-home.html") + (param) ? `?${param}` : "")
    : (await getFromStorage("kioskHome") + (param) ? `?${param}` : "");
}

// Context menu
getFromStorage('allowContext').then((set) => {
    if (set) return;
    window.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        console.log('Контекстное меню отключено.');
      }, false);
});

function addStyle(aCss) {
    'use strict';
    let head = document.getElementsByTagName('head')[0];
    if (head) {
        let style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.textContent = aCss;
        head.appendChild(style);
        return style;
    }
    return null;
};

 function loadButtons() {
    var shift = 5;
    function makeButton(innerHTML, onclick){
        let btn = document.createElement('button');
        btn.className = 'extButton';
        btn.innerHTML = innerHTML;
        btn.style.left = shift + 'px';
        shift -= (-65);
        btn.addEventListener('click', onclick);
        return btn;
    }

    var cont = document.body.appendChild(document.createElement('div'));
    cont.className = "extContainer";

    cont.appendChild(makeButton('<i class="custom-material-icons">arrow_back</i>', (e)=>{
        if (!location.origin.match('intkiosk.rea.ru'))
            history.back();
    }));
    cont.appendChild(makeButton('<i class="custom-material-icons">autorenew</i>', (e)=>location.reload()));
    cont.appendChild(makeButton('<i class="custom-material-icons">home</i>', 
        async (e)=>{ location.href = await getHomeUrl() }));
    cont.appendChild(makeButton('<i class="custom-material-icons">zoom_in</i>', (e)=>{  browser.runtime.sendMessage({zoom:  0.2}); }));
    cont.appendChild(makeButton('<i class="custom-material-icons">zoom_out</i>', (e)=>{ browser.runtime.sendMessage({zoom: -0.2}); })); 
}



 

 (function (){
    loadButtons();
 })();
 


// Автоматическое обновление страницы
getFromStorage('autoRedirectToMain').then(async(s) => {
    if (!s) return;
    let timeout = await getFromStorage("autoRedirectTimeout") * 1000;
    let home = await getHomeUrl();

    timeleft = timeout;
    const updfreq = 500;
    setInterval(() => {
        var hrefClean = window.location.href.split('#')[0].split('?')[0];
        timeleft -= updfreq;
        if (timeleft <= 0){
            if (hrefClean != home)
                hrefClean = home;
            else
                timeleft = timeout;
        }
    }, updfreq);
    document.body.addEventListener('click',   () => timeleft = timeout);
    document.body.addEventListener('touchend', () => timeleft = timeout);
    document.body.addEventListener('pointerup', () => timeleft = timeout);
})

