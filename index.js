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
    element.className = "";
    document.getElementById('modeChange').src="/images/lightMode.webp";
}

function lightMode(element) {
    element.className = "light-mode";
    document.getElementById('modeChange').src="/images/darkMode.webp";
}


