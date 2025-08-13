// signup handler
const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        const response = await fetch("http://localhost:3000/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const result = await response.json();

        if (result.success) {
            document.getElementById("message").innerText = "Sign up successful! Redirecting...";
            setTimeout(() => {
                window.location.href = "signin.html";
            }, 1500);
        } else {
            document.getElementById("message").innerText = result.message;
        }
    });
}

// signin handler
const signinForm = document.getElementById("signinForm");

if (signinForm) {
    signinForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        const response = await fetch("http://localhost:3000/auth/signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (result.success) {
            localStorage.setItem("token", result.data.token);
            document.getElementById("message").innerText = "Sign in successful! Redirecting...";
            setTimeout(() => {
                window.location.href = "tasks.html";
            }, 1500);
        } else {
            document.getElementById("message").innerText = result.message;
        }
    });
}

function togglePassword() {
  const passwordField = document.getElementById("password");
  passwordField.type = passwordField.type === "password" ? "text" : "password";
}
