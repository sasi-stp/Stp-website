/*=========================================================
 Smart ERP Pro v1.0
 File : assets/js/login.js
=========================================================*/

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm");

    const username = document.getElementById("username");

    const password = document.getElementById("password");

    const remember = document.getElementById("rememberMe");

    const showPassword = document.getElementById("showPassword");

    const loginBtn = document.getElementById("loginBtn");

    const loginText = document.getElementById("loginText");

    const loader = document.getElementById("loader");



    /*==============================
        Remember Login
    ==============================*/

    if(localStorage.getItem("remember") === "true"){

        username.value = localStorage.getItem("username");

        remember.checked = true;

    }



    /*==============================
        Show Password
    ==============================*/

    showPassword.addEventListener("change", ()=>{

        if(showPassword.checked){

            password.type = "text";

        }else{

            password.type = "password";

        }

    });



    /*==============================
        Login
    ==============================*/

    form.addEventListener("submit",(e)=>{

        e.preventDefault();



        let user = username.value.trim();

        let pass = password.value.trim();



        if(user===""){

            alert("Please enter username");

            username.focus();

            return;

        }



        if(pass===""){

            alert("Please enter password");

            password.focus();

            return;

        }



        loginBtn.disabled=true;

        loginText.innerHTML="Signing In...";

        loader.style.display="inline-block";



        setTimeout(()=>{

            if(user==="admin" && pass==="admin123"){

                if(remember.checked){

                    localStorage.setItem("remember","true");

                    localStorage.setItem("username",user);

                }else{

                    localStorage.removeItem("remember");

                    localStorage.removeItem("username");

                }



                localStorage.setItem("loggedIn","true");



                window.location.href="dashboard.html";

            }

            else{

                alert("Invalid Username or Password");



                loginBtn.disabled=false;

                loginText.innerHTML="Login";

                loader.style.display="none";

            }

        },1500);

    });

});
