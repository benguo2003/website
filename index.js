function changeMode() {
    var element = document.body;
    if( (' ' + element.className + ' ').indexOf(' light-mode ') > -1 ){
        darkMode(element);
    }
    else{
        lightMode(element);
    }
}

function darkMode(element) {
    document.getElementById('modeChange').src="/images/lightMode.webp";
    element.className = "";
}

function lightMode(element) {
    document.getElementById('modeChange').src="/images/darkMode.webp";
    element.className = "light-mode";
}


