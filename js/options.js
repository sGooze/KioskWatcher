async function getFromStorage(name){
    if (name === undefined)
        return undefined;
    let stored = await browser.storage.local.get(name);
    return (stored) ? Reflect.get(stored, name) : undefined;
}
function saveToStorage(name, value){
    let set = {}; Reflect.set(set, name, value);
    browser.storage.local.set(set);
}

// TODO: Внедряемый на страницу кастомный JS/CSS код

const initLabel = "_initSettings";

// Захват файла с настройками
var settings = null;

async function readSettings(){
    try {
        return  (await fetch('/ext-settings.json')).json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

// Сброс настроек на значения по умолчанию
async function loadDefaultSettings(){
    /*let defs = await (await fetch('/default.json')).json();
    console.log('Default settings:');
    console.table(defs);
    for (key in defs){
        saveToStorage(key, defs[key]);
    }
    saveToStorage(initLabel, true);*/
    if (!settings)
        settings = await readSettings();

    settings.forEach(async (el) =>{
        let input = document.getElementById(el.id);
        if (!input){
            console.error(`Элемент с id "${el.id} не найден на странице!"`);
        }
        else 
            switch(el.type){
                case "boolean":
                    input.checked = el.defaultValue;
                    break;
                case "number":
                case "string":
                case "url":
                    input.value = el.defaultValue;
                    break;
            }
        saveToStorage(el.id, el.defaultValue);
        console.log('Загружены настройки по умолчанию');
    });
}

// Загрузка содержимого страницы
document.addEventListener('DOMContentLoaded', async (e) => {
    settings = await readSettings();
    document.getElementById('extVersion').innerText = `Версия ${browser.runtime.getManifest().version}`;
    // Инициализация инпутов для каждого параметра
    let makeControl = async function (el){
        // Добавление подзаголовка
        if(el.type == "hr"){
            let div = document.createElement('div');
            div.appendChild(document.createElement("hr"));
            if (el.title){
                let title = document.createElement("h2");
                title.innerText = el.title;
                title.classList.add("settings-subheader");
                div.appendChild(title);
            }
            return div;
        }

        let val = await getFromStorage(el.id);
        if (val === undefined)
            val = el.defaultValue;

        let label = document.createElement('label');
        let input = document.createElement('input');
        label.for = el.id;
        input.id = el.id;
        label.appendChild(input);

        switch(el.type){
            case "boolean":
                input.type = "checkbox";
                label.append(el.title);
                input.checked = val;
                break;
            case "number":
                input.type = "number";
                input.before(el.title + ": ");
                input.value = val;
                break;
            case "string":
                input.type = "text";
                input.before(el.title + ": ");
                input.value = val;
                break;
            case "url":
                input.type = "url";
                input.before(el.title + ": ");
                input.value = val;
                break;
            default:
                input.type = "hidden";
                input.id = "";
                label.style.backgroundColor = "red";
                break;
        }
        // Добавление блока с описанием параметра, если оно есть
        if (el.subtitle){
            let sub = document.createElement('small');
            sub.innerText = el.subtitle;
            label.appendChild(sub);
        }
        return label;
    };
    // Необходимо, чтобы получать элементы в порядке их следования в файле настроек
    const inputPromises = [];
    settings.forEach((s) => inputPromises.push( makeControl(s) ));
    await Promise.all(inputPromises).then(inputs => inputs.forEach( 
        i => document.getElementById('options').appendChild(i) 
    ));

    document.getElementById('settingsPlaceholder').remove();
    // Загрузка настроек по умолчанию
    /*let _first = await getFromStorage(initLabel);
    if (!_first)
        await loadDefaultSettings();

    document.querySelectorAll('input').forEach(async (x) => {
        if (!x.id) return;
        let value = await getFromStorage(x.id);
        if (x.type == 'checkbox')
            x.checked = value;
        else
            x.value = value;
        console.log('from storage: ' + x.id + ' = ' + value);
    });*/
});

// Кнопка СОХРАНИТЬ
document.getElementById('savebtn').addEventListener('click', async (e) => {
    e.preventDefault();
    /*document.querySelectorAll('input').forEach((x) =>{
        if (!x.id) return;
        if (x.type == 'checkbox')
            saveToStorage(x.id, x.checked);
        else
            saveToStorage(x.id, x.value);
        getFromStorage(x.id).then((val) => console.log('saved to storage: ' + x.id + ' -> ' + val + '[' + x.value + ']'));
    });*/
    if (!settings)
    {
        alert('Объект настроек не был загружен! Повторите попытку позднее.')
        console.warn('Объект настроек не был загружен.', settings);
        readSettings().then(() => alert('Объект настроек загружен'));
    }

    for(var el of settings){
        try{
            if (el.id === undefined){
                continue;
            }
            let input = document.getElementById(el.id);
            input.classList.remove("saved-success");
            if (!input){
                console.error(`Элемент с id "${el.id} не найден на странице!"`);
                continue;
            }
            else{ 
                switch(el.type){
                    case "boolean":
                        saveToStorage(el.id, input.checked);
                        break;
                    case "number":
                    case "string":
                    case "url":
                        saveToStorage(el.id, input.value);
                        break;
                }
            }
            input.classList.add("saved-success");
        }
        catch(err){
            console.error(err);
        }
    };

    // Отправка сообщений об обновлении настроек другим компонентам
    browser.runtime.sendMessage({type:  "updateblocker"});


    let tempText = e.target.innerText;
    e.target.innerText = 'Сохранено!';
    setTimeout(() => {e.target.innerText = tempText}, 3 * 1000);
});

// КНОПКА СБРОСИТЬ
document.getElementById('defaultsbtn').addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm('Вы точно хотите сбросить настройки?')){
        await loadDefaultSettings();
        window.location.reload();
    }
});