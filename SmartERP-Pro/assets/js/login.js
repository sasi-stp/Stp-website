/*=========================================
  Smart ERP Pro
  Login JavaScript v1.0
=========================================*/

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm");
    const username = document.getElementById("username");
    const password = document.getElementById("password");

    const rememberMe = document.getElementById("rememberMe");
    const showPassword = document.getElementById("showPassword");

    const loginBtn = document.getElementById("loginBtn");
    const loginText = document.getElementById("loginText");
    const loader = document.getElementById("loader");

    // =========================================
    // Remember Username
    // =========================================

    if (localStorage.getItem("rememberMe") === "true") {

        username.value = localStorage.getItem("savedUsername") || "";
        rememberMe.checked = true;

    }

    // =========================================
    // Show Password
    // =========================================

    showPassword.addEventListener("change", () => {

        password.type = showPassword.checked ? "text" : "password";

    });

    // =========================================
    // Login
    // =========================================

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        const user = username.value.trim();
        const pass = password.value.trim();

        if (user === "") {

            alert("Please enter username.");
            username.focus();
            return;

        }

        if (pass === "") {

            alert("Please enter password.");
            password.focus();
            return;

        }

        loginBtn.disabled = true;

        loginText.style.display = "none";
        loader.style.display = "inline";

        // Demo Login
        // Later Database එකට connect කරනවා

        setTimeout(() => {

            if (user === "admin" && pass === "admin123") {

                // Remember Me

                if (rememberMe.checked) {

                    localStorage.setItem("rememberMe", "true");
                    localStorage.setItem("savedUsername", user);

                } else {

                    localStorage.removeItem("rememberMe");
                    localStorage.removeItem("savedUsername");

                }

                // Login Session

                localStorage.setItem("loggedIn", "true");
                localStorage.setItem("currentUser", user);

                window.location.href = "dashboard.html";

            } else {

                alert("Invalid Username or Password");

                loginBtn.disabled = false;

                loginText.style.display = "inline";
                loader.style.display = "none";

            }

        }, 1500);

    });

});
