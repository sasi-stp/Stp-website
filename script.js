document.addEventListener("DOMContentLoaded", () => {
    
    // Elements සාදා ගැනීම
    const loginForm = document.getElementById("loginForm");
    const loginPage = document.getElementById("loginPage");
    const dashboardPage = document.getElementById("dashboardPage");
    const errorMsg = document.getElementById("errorMsg");
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    const currentTabTitle = document.getElementById("currentTabTitle");
    const logoutBtn = document.getElementById("logoutBtn");

    // 1. LOGIN ANIMATION & VALIDATION
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const usernameInput = document.getElementById("username").value;
        const passwordInput = document.getElementById("password").value;

        // සරල පරීක්ෂාවක් (Username: admin / Password: admin)
        if (usernameInput === "admin" && passwordInput === "1234") {
            errorMsg.style.display = "none";
            
            // ලස්සන Fade-out/Fade-in animation එකක් සමඟ Dashboard එක පෙන්වීම
            loginPage.style.opacity = "0";
            setTimeout(() => {
                loginPage.classList.add("hidden");
                dashboardPage.classList.remove("hidden");
            }, 400);

        } else {
            // වැරදි නම් Error පණිවිඩය පෙන්වීම
            errorMsg.style.display = "block";
            errorMsg.style.animation = "fadeIn 0.3s ease";
        }
    });

    // 2. TAB CHANGING LOGIC WITH ANIMATION
    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Active ක්ලාස් එක Buttons වලින් ඉවත් කිරීම
            tabButtons.forEach(btn => btn.classList.remove("active"));
            // Active ක්ලාස් එක දැනට ක්ලික් කල බටන් එකට එකතු කිරීම
            button.classList.add("active");

            const targetTab = button.getAttribute("data-tab");

            // සියලුම content සඟවා අදාල Content එක පමණක් Smooth ලෙස පෙන්වීම
            tabContents.forEach(content => {
                content.classList.remove("active");
                if (content.id === targetTab) {
                    content.classList.add("active");
                }
            });

            // Header එකේ ඇති මාතෘකාව වෙනස් කිරීම
            currentTabTitle.innerText = button.innerText;
        });
    });

    // 3. LOGOUT LOGIC
    logoutBtn.addEventListener("click", () => {
        dashboardPage.classList.add("hidden");
        loginPage.classList.remove("hidden");
        loginPage.style.opacity = "1";
        loginForm.reset();
    });
});
