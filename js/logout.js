// logout.js
// Автоматический выход из ЛКС после периода неактивности

HOMEPAGE = "https://intkiosk.rea.ru/logout.aspx"
LOGGED_HOMEPAGE = "https://intkiosk.rea.ru/logged_home.html"


// === AUTO LOGOUT WHEN INACTIVE STARTS HERE ===

function LogOut(){
	location.href = "https://student.rea.ru/?logout=yes"; 
}

function GoHome(){
  location.href = HOMEPAGE;
}

browser.storage.local.get('autoLogout').then(async (param) => {
  if (!param.autoLogout) return;
  var max_possible_time = (await browser.storage.local.get('autoLogoutTime')).autoLogoutTime;
  if (window.location != HOMEPAGE && window.location != LOGGED_HOMEPAGE){
    var time = 0;
    
    // TIME COUNTER START
    function add_time(){
      time += 5;
      console.log(time);
      if (time >= max_possible_time) LogOut();
      //setTimeout(add_time, 5000);
    }
    //add_time();
    setInterval(add_time, 5000);
    // TIME COUNTER END

    document.onmousemove = function(){
      time = 0; 
    }
    document.onkeydown = function(){
      time = 0; 
    }
    document.onload = function(){
      time = 0; 
    }
    
  }

  if (window.location == "https://student.rea.ru/index.php" || window.location == "https://student.rea.ru/?logout=yes"){
    GoHome();
  }
});

// === AUTO LOGOUT WHEN INACTIVE ENDS HERE ===