async function getFromStorage(name){
    let stored = await browser.storage.local.get(name);
    return (stored) ? Reflect.get(stored, name) : undefined;
}
function saveToStorage(name, value){
    let set = {}; Reflect.set(set, name, value);
    browser.storage.local.set(set);
}

var kioskWindowId = null;

// Немедленное закрытие всех новых вкладок. Для удобства не распространяется на about:newtab и приватные окна/вкладки
// Регулируется параметром killTabs
browser.tabs.onCreated.addListener(async (tab) => {
    let killTabs = await getFromStorage('killTabs');
    if (!killTabs || tab.incognito)
        return;
    console.log(tab.url);
    // Таймаут, чтобы браузер успел хоть как то зарезолвить адрес
    setTimeout(async () =>{
        if (tab.url == 'about:newtab' || tab.url == 'about:blank') 
            return;
        if (tab.url == await getFromStorage('kioskHome'))
            return;
        await browser.tabs.remove(tab.id);
    }, 500)
});

// Переключение открытых окон в режим "На весь экран"
async function createKioskWindow(){
    if (kioskWindowId)
        await destroyKioskWindow();

    let home = await getFromStorage("kioskHome");
    let win = await browser.windows.create({
        url: home,
        state: "fullscreen",
        type: "panel"
    });
    kioskWindowId = win.id;
}

async function destroyKioskWindow(){
    if (!kioskWindowId) return;
    let temp = kioskWindowId;
    kioskWindowId = null;
    browser.windows.remove(temp);
}

// browser.windows.onCreated.addListener(async (win) => {
//     console.log("Новое окно: " + win.id);
//     let tab = (await browser.windows.get(win.id, {populate: true})).tabs[0];
//     console.log(`Новое окно ID:${win.id} tab[0].url:${tab.url}`);
//     let killTabs = await getFromStorage('killTabs');
//     // // Закрытие окон, ведущих за пределы разрешённого домена
//     // if (!killTabs || tab.incognito)
//     //     return;
//     // if (await getFromStorage("restrictRedirect")){
//     //     let home = await getFromStorage("kioskHome");
//     //     let homeUrl = new URL(home);

//     //     if (!(tab.url.includes(homeUrl.hostname))){
//     //         console.warn(`Создано некорректное окно с url = ${tab.url}`)
//     //         await browser.windows.remove(win.id);
//     //     }
//     // }
// });

browser.windows.onRemoved.addListener((windowId) => {
    if (windowId == kioskWindowId)
        createKioskWindow();
});

browser.windows.onFocusChanged.addListener(async (windowId) => {
    if (!kioskWindowId) return;
    if (!(await getFromStorage("kioskAlwaysInFocus")))
        return;
    if (windowId == kioskWindowId || windowId == browser.windows.WINDOW_ID_NONE)
        return;
    console.log(`Фокус изменён на ${windowId}, kioskId = ${kioskWindowId}`);
    browser.windows.update(kioskWindowId, {focused: true, state: "fullscreen"});
});

// Автоматическое открытие окна киоска при запуске
getFromStorage("fullscreenOnStartup").then(async (val) =>{
    if(!val) return;
    await createKioskWindow();
});



// Управление зумом
var zoom = 1.0;
const zoomMax = 1.8;
const zoomMin = 1.0;

browser.runtime.onMessage.addListener(
    function(e){
        if (!e)
            return;
        if (e.zoom){
            zoom += Number(e.zoom);
            zoom = Math.max(zoomMin, Math.min(zoomMax, zoom));
            browser.tabs.setZoom(zoom);
        }
    }
)

// При первом запуске
browser.runtime.onInstalled.addListener(
    async function(e){
        // Выполняется только если доплнение загружено как временное (через about:debugging)
        if (e.temporary)
            console.log("Ни что в мире не постоянно.. .. .. ..... - Чехов");
        // -- скопировано из options.js --
        function saveToStorage(name, value){
            let set = {}; Reflect.set(set, name, value);
            browser.storage.local.set(set);
        }
        // -- скопировано из options.js::loadDefaultSettings --
        let settings = await (await fetch('/ext-settings.json')).json();
        let reset = (await getFromStorage("noResetAfterUpdate"));
        if (!reset){
            // Сброс к значениям по умолчанию - при первой установке и если не стоит ключ noResetAfterUpdate
            settings.forEach(async (el) =>{
                console.log(`[${el.type}]${el.id} = ${el.defaultValue}`);
                saveToStorage(el.id, el.defaultValue);
            });
            console.log('Загружены настройки по умолчанию');
        }
        // Открыть страницу настроек
        if (await getFromStorage("setupAfterUpdate") == true){
            browser.tabs.create({
                active: true,
                url: "/options.html"
            });
        }
        // Изменить доступные настройки браузера
        try {
            await browser.browserSettings.webNotificationsDisabled.set({value: false});
        } catch (error) {
            console.error(error);
        }
    }
);

browser.menus.create(
    {
        id: "kioskOpenKiosk",
        title: "Открыть новое окно киоска",
        contexts: ["all"]
    }
);

browser.menus.create(
    {
        id: "kioskCloseKiosk",
        title: "Закрыть окно киоска",
        contexts: ["all"]
    }
);

browser.menus.create(
    {
        id: "kioskSettings",
        title: "Изменить настройки киоска",
        contexts: ["all"]
    }
);

browser.menus.onClicked.addListener((info) => {
    switch(info.menuItemId){
        case "kioskOpenKiosk": createKioskWindow(); break;
        case "kioskCloseKiosk": destroyKioskWindow(); break;
        case "kioskSettings": destroyKioskWindow(); browser.runtime.openOptionsPage(); break;
    }
});

// Синхронизация настроек с файлом на сервере
async function syncSettingsWithServer(){
    let remote = await (await fetch(await getFromStorage('syncSettingsUrl'))).json();
    
    for(rs in remote){
        // Защита от инъекции неизвестных настроек
        let prev = await getFromStorage(rs);
        if (prev != undefined && prev != remote[rs]){
            saveToStorage(rs, remote[rs]);
            console.log(`updated from server: ${rs} = ${remote[rs]}`);
        }
    }

}


// Синхронизация 
getFromStorage('syncSettings').then(
    async function (sync){
        if (!sync) return;
        let synctime = await getFromStorage('syncSettingsInterval') * 1000;
        syncSettingsWithServer();
        setInterval(syncSettingsWithServer, synctime);
    }
);



// Телеметрия
async function sendTelemetry(serverUrl, customMessage){
    if (!serverUrl){
        return false;
    }
    // Не засоряем сервер сообщениями о переходе на главную
    if (customMessage === undefined && location.pathname == "/"){
        return true;
    }
    var message = (customMessage !== undefined) ? customMessage : location.href;
    var response = await fetch(serverUrl, { 
        body: JSON.stringify({ requestPath: message }),
        headers: {     "Content-Type": "application/json"   },
        method: "POST"
    });
    if (!response.ok){
        console.error(response.status);
    }
    return response.ok;
}

getFromStorage('telemetryOn').then(async(s) => {
    if (s === undefined) s = true; // мне так жаль
    if (!s) return;
    let serverUrl = await getFromStorage('telemetryServerURL');
    // Проверка сервера
    var result = await sendTelemetry(serverUrl, "Init OK");
    if (!result){
        console.warn("Не удалось установить связь с сервером телеметрии. Отправка сообщений отключена.");
        return;
    }
    // HistoryStateUpdated - при внутрисайтовых обновлениях локации через History API
    browser.webNavigation.onHistoryStateUpdated.addListener(async dtl => {
        let meme = await sendTelemetry(serverUrl, decodeURI( dtl.url ));
        if (meme)
            console.log(`onHistoryStateUpdated Sent message: ${dtl.url}`);
    })

    var homeURL = new URL( await getFromStorage("kioskHome") );
    // BeforeNavigate - при навигации с одной страницы на другую
    browser.webNavigation.onBeforeNavigate.addListener(async dtl => {
        let naviURL = new URL(dtl.url);
        if (naviURL.protocol == "about:" || naviURL.protocol == "moz-extension:"){
            return;
        }
        // Переходы в корень домашней страницы игнорируются
        if (naviURL.origin == homeURL.origin && naviURL.pathname == "/"){
            return;
        }
        let meme = await sendTelemetry(serverUrl, decodeURI( dtl.url ));
        if (meme)
            console.log(`onBeforeNavigate Sent message: ${dtl.url}`);
    })
});

browser.runtime.onStartup.addListener(function(){
    console.log("hello from onStartup");
});