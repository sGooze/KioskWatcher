async function getFromStorage(name){
    let stored = await browser.storage.local.get(name);
    return (stored) ? Reflect.get(stored, name) : undefined;
}

let internalHomeUrl = browser.runtime.getURL("kiosk-home.html");
let homeUrl = null;
let homeParams = null;
let allowPatterns = null;

// Callback
function UrlBlocklistCallback(e){
    
    let extUrl = homeUrl;
    for (let ptr of allowPatterns){
        let re = new RegExp(ptr);
        if (re.test(e.url)){
            console.log(`${e.url}: подходит под шаблон ${ptr}`);
            return;
        }
    }

    /*
    TODO: Блокировать ВСЕ ресурсы извне, а не только страницы и фреймы, как опцию?
    https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/ResourceType
    e.type
    return { cancel: true }
    */

    if (homeParams) { extUrl += "?" + homeParams };
    console.log(`перенаправление - ${e.url} -> ${extUrl}`);
    
    // Page name MUST be mentioned inside the 'web_accessible_resources' manifest key
    return {
        redirectUrl: extUrl
    };
    
}

// Загрузка из памяти параметров перенаправления
async function updateParams(){
    
    homeUrl = (await getFromStorage("useInternalHomePage"))
        ? internalHomeUrl
        : await getFromStorage("kioskHome");
    homeParams = await getFromStorage("otherHomeParams");
    return true;
}

function setupBlocker(e){
    // Определение типа события
    if (!e.type || e.type != "updateblocker"){
        return;
    }
    
    getFromStorage("redirectFilter").then(async (list) => {

        if (browser.webRequest.onBeforeRequest.hasListener(UrlBlocklistCallback)){
            console.log('Previous listener removed');
            browser.webRequest.onBeforeRequest.removeListener(UrlBlocklistCallback);
        }
        if (!(await getFromStorage("restrictRedirect"))){
            console.log("Перенаправление отключено");
            return;
        }
        if (!list) { 
            console.log("Blocklist is empty - not adding the listener")
            return;
        }
        if (!(await updateParams())){
            return;
        }
        allowPatterns = list.split('|');
        browser.webRequest.onBeforeRequest.addListener(
            UrlBlocklistCallback,
            //{urls: list.split('|'), types: ['main_frame', 'sub_frame']},
            {urls: ["<all_urls>", "*://*/*"], types: ['main_frame', 'sub_frame']},
            ["blocking"]
        );
        console.log("Listener added. Listening to the following URLs:");
        console.table(list);
    });

};

browser.runtime.onMessage.addListener(setupBlocker);

setupBlocker({type: "updateblocker"});