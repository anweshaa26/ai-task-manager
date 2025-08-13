function logout() {
    localStorage.removeItem("token");
    window.location.href = "signin.html";
}

function backToTasks() {
    window.location.href = "tasks.html";
}

async function loadTrash() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "signin.html";
    }

    const response = await fetch("http://localhost:3000/trash", {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    const result = await response.json();

    const container = document.getElementById("trashContainer");
    container.innerHTML = "";

    if (result.success && result.data.tasks.length > 0) {
        result.data.tasks.forEach(task => {
            const card = document.createElement("div");
            card.className = "task-card";
            card.innerHTML = `
            <h3>${task.title}</h3>
            <p>${task.description}</p>
            <p><strong>Due:</strong> ${task.dueDate}</p>
            <p><strong>Priority:</strong> ${task.priority}</p>
            <p><strong>Status:</strong> ${task.status}</p>
            <button onclick="deletePermanently('${task._id}')">🗑️ Delete Permanently</button>
            `;
            container.appendChild(card);
        });
    } else {
        container.innerHTML = "<p>Trash is empty.</p>";
    }
}

async function deletePermanently(taskId) {
    const token = localStorage.getItem("token");

    await fetch(`http://localhost:3000/tasks/${taskId}?permanent=true`, {
        method: "DELETE",
        headers: {
            "Authorization": "Bearer " + token
        }
    });
    loadTrash();
}

loadTrash();