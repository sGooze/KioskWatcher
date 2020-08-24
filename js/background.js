async function getFromStorage(name){
    let stored = await browser.storage.local.get(name);
    return (stored) ? Reflect.get(stored, name) : undefined;
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

browser.windows.onCreated.addListener(async (win) => {
    console.log("Новое окно: " + win.id);
    let tab = (await browser.windows.get(win.id, {populate: true})).tabs[0];
    console.log(`Новое окно ID:${win.id} tab[0].url:${tab.url}`);
    /*let killTabs = await getFromStorage('killTabs');
    // Закрытие окон, ведущих за пределы разрешённого домена
    if (!killTabs || tab.incognito)
        return;
    if (await getFromStorage("restrictRedirect")){
        let home = await getFromStorage("kioskHome");
        let homeUrl = new URL(home);

        if (!(tab.url.includes(homeUrl.hostname))){
            console.warn(`Создано некорректное окно с url = ${tab.url}`)
            await browser.windows.remove(win.id);
        }
    }*/
});

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
const zoomMax = 2.0;
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
        // Открыть страницу настроек
        browser.tabs.create({
            active: true,
            url: "/options.html"
        });
        // -- скопировано из options.js --
        function saveToStorage(name, value){
            let set = {}; Reflect.set(set, name, value);
            browser.storage.local.set(set);
        }
        // -- скопировано из options.js::loadDefaultSettings --
        let settings = (await fetch('/ext-settings.json')).json();
        settings.forEach(async (el) =>{
            console.log(`[${el.type}]${el.id} = ${el.defaultValue}`);
            saveToStorage(el.id, el.defaultValue);
            console.log('Загружены настройки по умолчанию');
        });
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
})