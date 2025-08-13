let currentSkip = 0;
const pageSize = 10;
let currentEditingTaskId = null;

// fetch token
function getToken() {
    return localStorage.getItem("token");
}

// load tasks on page load
loadTasks();

// add task
document.getElementById("addTaskBtn").addEventListener("click", () => {
    openTaskOverlay("Create New Task");
    resetTaskForm();
    document.getElementById("formSubmitBtn").innerText = "create Task";
    document.getElementById("taskForm").onsubmit = (e) => {
        e.preventDefault();
        addNewTask();
    };
});

// next/prev buttons for pagination
document.getElementById("nextPageBtn").addEventListener("click", () => {
    currentSkip += pageSize;
    loadTasks();
});

document.getElementById("prevPageBtn").addEventListener("click", () => {
    if (currentSkip >= pageSize) {
        currentSkip -= pageSize;
        loadTasks();
    }
});

// add new task function
function addNewTask() {
    const token = getToken();
    if (!token) {
        window.location.href = "signin.html";
    }

    const taskData = getTaskFormData();
    if (!taskData) return;

    fetch("http://localhost:3000/tasks", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            ...taskData,
            status: "pending"
        })
    }).then(response => response.json())
    .then((result) => {
        if (result.success) {
            loadTasks();        // reload the task list
            closeTaskOverlay();

            // // hide form after adding
            // document.getElementById("taskFormSection").style.display = "none";

            // setTimeout(() => {
            //     document.getElementById("createMsg").innerText = "";
            // }, 1500);
        } else {
        document.getElementById("createMsg").innerText = result.message;
        }
    });
}

function openAIToolsOverlay() {
  document.getElementById("aiToolsOverlay").style.display = "flex";
}

function closeAIToolsOverlay() {
  document.getElementById("aiToolsOverlay").style.display = "none";
}

function showAIPrompt() {
    closeAIToolsOverlay();          // close ai tools overlay first
    document.getElementById("aiPromptOverlay").style.display = "flex";
}

function closeAIPromptOverlay() {
    document.getElementById("aiPromptOverlay").style.display = "none";
}

function parseTaskWithAI() {
    const prompt = document.getElementById("aiTaskPrompt").value;
    const token = getToken();

    if (!prompt) return alert("Please enter a task description.");

    fetch("http://localhost:3000/ai/parse-task", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ prompt })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            const { title, dueDate, priority } = result.data.result;

            if (!title || !dueDate) {
                return alert("AI couldn't extract mandatory fields. Please adjust the description.");
            }

            // check if dueDate is in the future
            const dueDateObj = new Date(dueDate);
            const now = new Date();
            if (dueDateObj <= now) {
                return alert("Due date must be in the future.");
            }

            // populate task form
            document.getElementById("title").value = title;
            document.getElementById("dueDate").value = dueDate.slice(0, 16);    // for datetime local input
            document.getElementById("priority").value = priority || "low";

            openTaskOverlay("Create New Task");
        } else {
            alert(result.message);
        }
    });
}

function generateDayPlan() {
    const token = getToken();
    if (!token) return window.location.href = "signin.html";

    fetch("http://localhost:3000/tasks?limit=100", {
        headers: { Authorization: "Bearer " + token }
    })
    .then(res => res.json())
    .then(result => {
        const taskList = result.data.tasks.map(task => ({
            title: task.title,
            priority: task.priority
        }));

        return fetch("http://localhost:3000/ai/generate-day-plan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify({ tasks: taskList })
        });
    })
    .then(res => res.json())
    .then(data => showToast(data.data.plan || "AI couldn't generate a plan."))
    .catch(err => console.error(err));
}

function generateSummary() {
    const token = getToken();
    if (!token) return window.location.href = "signin.html";

    fetch("http://localhost:3000/tasks/summary", { headers: { Authorization: "Bearer " + token }})
    .then(res => res.json())
    .then(result => {
        return fetch("http://localhost:3000/ai/generate-summary", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify({ summaryData: result.data })
        });
    })
    .then(res => res.json())
    .then(data => showToast(data.data.summary))
    .catch(err => console.error(err));
}

// function analyzeTrends() {
//   const token = getToken();
//   if (!token) return window.location.href = "signin.html";

//   fetch("http://localhost:3000/tasks/trends", { headers: { Authorization: "Bearer " + token } })
//   .then(res => res.json())
//   .then(result => {
//     return fetch("http://localhost:3000/ai/analyze-productivity-trends", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: "Bearer " + token
//       },
//       body: JSON.stringify({ trendsData: result.data })
//     });
//   })
//   .then(res => res.json())
//   .then(data => showToast(data.data.trends))
//   .catch(err => console.error(err));
// }

// function showBreakTaskPrompt() {
//     closeAIToolsOverlay();
//     document.getElementById("breakTaskOverlay").style.display = "flex";
// }

// function closeBreakTaskOverlay() {
//     document.getElementById("breakTaskOverlay").style.display = "none";
// }

// function breakDownTask() {
//   const taskDescription = document.getElementById("breakTaskPrompt").value;
//   if (!taskDescription.trim()) return alert("Please enter a task description.");;

//   const token = getToken();
//   fetch("http://localhost:3000/ai/suggest-task-breakdown", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: "Bearer " + token
//     },
//     body: JSON.stringify({ prompt: taskDescription })
//   })
//   .then(res => res.json())
//   .then(data => {
//     if (data.success) {
//         showToast("Task breakdown generated successfully.");
//         console.log("Subtasks:", data.result);
//     } else {
//         showToast(data.message || "Failed to break down task.");
//     }
//   })
//   .catch(err => {
//     console.error("Error breaking down task:", err);
//     showToast("Something went wrong!");
//   });
//   closeBreakTaskOverlay();
// }

// function getMotivation() {
//   const token = getToken();
//   fetch("http://localhost:3000/ai/generate-motivational-quote", {
//     headers: { Authorization: "Bearer " + token }
//   })
//   .then(res => res.json())
//   .then(data => showToast(data.data.quote))
//   .catch(err => console.error(err));
// }

function prioritizeTasksWithAI() {
    const token = getToken();

    // fetch all tasks
    fetch("http://localhost:3000/tasks?limit=100&sortBy=dueDate&sortOrder=asc", {
        headers: { "Authorization": "Bearer " + token }
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            const tasks = result.data.tasks.filter(task => task.status !== "completed");

            const simplifiedTasks = tasks.map(t => ({
                id: t._id,
                title: t.title,
                dueDate: t.dueDate,
                priority: t.priority
            }));

            // call ai api
            fetch("http://localhost:3000/ai/prioritize-tasks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({ tasks: simplifiedTasks })
            })
            .then(res => res.json())
            .then(aiResult => {
                console.log("AI Prioritized Order:", aiResult.data.result);
                alert("Prioritized order: " + aiResult.data.result);
            });
        } else {
            alert("Failed to fetch tasks.");
        }
    });
}

function recommedNextTask() {
    const token = getToken();

    // fetch all tasks
    fetch("http://localhost:3000/tasks?limit=100&sortBy=dueDate&sortOrder=asc", {
        headers: { "Authorization": "Bearer " + token }
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            const tasks = result.data.tasks.filter(task => task.status !== "completed");

            const simplifiedTasks = tasks.map(t => ({
                id: t._id,
                title: t.title,
                dueDate: t.dueDate,
                priority: t.priority,
                status: t.status
            }));

            // call ai api
            fetch("http://localhost:3000/ai/recommend-next-task", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({ tasks: simplifiedTasks })
            })
            .then(res => res.json())
            .then(aiResult => {
                console.log("AI recommends:", aiResult.data.result);
                alert("Recommended next task: " + aiResult.data.result);
            });
        } else {
            alert("Failed to fetch tasks.");
        }
    });
}

// function suggestTasksToDelete() {
//     const token = getToken();

//     // fetch all tasks
//     fetch("http://localhost:3000/tasks?limit=100&sortBy=dueDate&sortOrder=asc", {
//         headers: { "Authorization": "Bearer " + token }
//     })
//     .then(res => res.json())
//     .then(result => {
//         if (result.success) {
//             const tasks = result.data.tasks.filter(task => task.status !== "completed");

//             const simplifiedTasks = tasks.map(t => ({
//                 id: t._id,
//                 title: t.title,
//                 dueDate: t.dueDate,
//                 priority: t.priority,
//                 status: t.status
//             }));

//             // call ai api
//             fetch("http://localhost:3000/ai/suggest-deletions", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": "Bearer " + token
//                 },
//                 body: JSON.stringify({ tasks: simplifiedTasks })
//             })
//             .then(res => res.json())
//             .then(aiResult => {
//                 console.log("Tasks AI suggests deleting:", aiResult.data.result);
//                 alert("Suggested deletions: " + aiResult.data.result);
//             });
//         } else {
//             alert("Failed to fetch tasks.");
//         }
//     });
// }

function isToday(date) {
    const today = new Date();
    const checkDate = new Date(date);

    return (
        checkDate.getDate() === today.getDate() &&
        checkDate.getMonth() === today.getMonth() &&
        checkDate.getFullYear() === today.getFullYear()
    );
}

// load tasks list
function loadTasks() {
    const token = getToken();
    const sortBy = document.getElementById("sortTasks").value;
    const url = `http://localhost:3000/tasks?limit=${pageSize}&skip=${currentSkip}&sortBy=${sortBy}&sortOrder=asc`;

    if (!token) {
        window.location.href = "signin.html";
    }

    fetch(url, {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token
        }
    })
    .then(res => res.json())
    .then(result => {
        const container = document.getElementById("taskContainer");
        container.innerHTML = "";

        if (result.success && result.data.tasks.length > 0) {
            let todayCount = 0;

            result.data.tasks.forEach(task => {
                const dueDate = new Date(task.dueDate);
                const now = new Date();
                const dueDateIST = dueDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

                // check for today's date
                if (isToday(dueDate)) todayCount++;

                const card = document.createElement("div");
                card.className = "task-card";
                if (task.status === "completed") card.classList.add("completed");

                // check for overdue
                const isOverdue = dueDate < now && task.status !== "completed";
                const overdueBadge = isOverdue ? `<span class="badge badge-overdue">⚠️ Overdue</span>` : "";

                // priority badge
                const priorityBadge = `<span class="badge badge-${task.priority}">${task.priority}</span>`;

                card.innerHTML = `
                <div class="task-card-header">
                    <h3>${task.title}</h3>
                    <button onclick="togglePinTask('${task._id}')" class="pin-btn">${task.isPinned ? '📌' : '📍'}</button>
                </div>
                <p>${task.description}</p>
                <p><strong>Due:</strong> ${dueDateIST} ${overdueBadge}</p>
                <p><strong>Priority:</strong> ${priorityBadge}</p>
                <p><strong>Status:</strong> ${task.status}</p>
                <button onclick="editTask('${task._id}')">✏️ Edit</button>
                <button onclick="markDone('${task._id}')">✅ Mark Done</button>
                <button onclick="deleteTask('${task._id}')">🗑️ Delete</button>
                `;
                container.appendChild(card);
            });
            document.getElementById("tasksTodayCount").innerText = `📅 ${todayCount} tasks due today`;
        } else {
            container.innerHTML = "<p>No tasks yet!</p>";
        }
    });
}

// check for due or overdue tasks
function checkDueTasks() {
    const token = getToken();
    
    if (!token) return;

    fetch("http://localhost:3000/tasks?limit=10&sortBy=dueDate&sortOrder=asc", {
        method: "GET",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token 
        }
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            const now = new Date();
            result.data.tasks.forEach(task => {
                const dueDate = new Date(task.dueDate);
                const timeDiff = dueDate - now;

                if (timeDiff <= 15 * 60 * 1000 && timeDiff > 0 && task.status !== "completed") {
                    showNotification(`🔔 Task "${task.title}" is due soon!`);
                    console.log("checking soon due tasks..." + task.title);
                }

                if (timeDiff < 0 && task.status !== "completed") {
                    showNotification(`⚠️ Task "${task.title}" is overdue!`);
                    console.log("checking overdue tasks..." + task.title);
                }
            });
        }
    });
}

function showNotification(message) {
    if ("Notification" in window && Notification.permission === "granted") {
        try {
            new Notification(message);
            console.log("sending notifications: ", message);
        } catch (e) {
            console.error("Notification API issue", e);
            showToast(message);     //fallback
        }
    } else {
        showToast(message);             // fallback if desktop notifications unavailable
    }
}

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const text = document.createElement("span");
    toast.innerText = message;

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = () => toast.remove();

    toast.appendChild(text);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    // avoiding clutter
    if (container.childElementCount >= 5) {
        container.firstChild.remove();
    }
}

// fetch task details and pre-fill form for editing
function editTask(taskId) {
    const token = getToken();

    fetch(`http://localhost:3000/tasks/${taskId}`, {
        method: "GET",
        headers: { "Authorization": "Bearer " + token }
    })
    .then(response => response.json())
    .then((result) => {
        if (result.success) {
            const task = result.data.task;
            document.getElementById("title").value = task.title;
            document.getElementById("description").value = task.description;
            document.getElementById("dueDate").value = task.dueDate.slice(0, 16);   // for datetime-local input
            document.getElementById("priority").value = task.priority;
            document.getElementById("repeat").value = task.repeat;

            openTaskOverlay("Edit Task");
            document.getElementById("formSubmitBtn").innerText = "Update Task";

            currentEditingTaskId = taskId;
            document.getElementById("taskForm").onsubmit = (e) => {
                e.preventDefault();
                updateTask(taskId);
            };
        }
    });
}

// update task function
function updateTask(taskId) {
  const token = getToken();
  const taskData = getTaskFormData();
  if (!taskData) return;

  fetch(`http://localhost:3000/tasks/${taskId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify(taskData)
  })
    .then(response => response.json())
    .then((result) => {
      if (result.success) {
        loadTasks();
        closeTaskOverlay();
      }
    });
}

function markDone(taskId) {
    const token = getToken();

    fetch(`http://localhost:3000/tasks/${taskId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ status: "completed" })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) loadTasks();
    });
}

function deleteTask(taskId) {
    const token = getToken();

    fetch(`http://localhost:3000/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
            "Authorization": "Bearer " + token
        }
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) loadTasks();
    });
}

function togglePinTask(taskId) {
    const token = getToken();
    if (!token) {
        window.location.href = "signin.html";
    }

    fetch(`http://localhost:3000/tasks/${taskId}/toggle-pin`, {
        method: "PATCH",
        headers: {
            "Authorization": "Bearer " + token 
        }
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            loadTasks();
        } else {
            console.error(result.message);
        }
    });
}

function openTaskOverlay(heading) {
    document.getElementById("overlayHeading").innerText = heading;
    document.getElementById("taskOverlay").style.display = "flex";
}

function closeTaskOverlay() {
    document.getElementById("taskOverlay").style.display = "none";
}

function resetTaskForm() {
    document.getElementById("taskForm").reset();
    document.getElementById("createMsg").innerText = "";
    currentEditingTaskId = null;
}

function getTaskFormData() {
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const dueDate = document.getElementById("dueDate").value;
    const priority = document.getElementById("priority").value;
    const repeat = document.getElementById("repeat").value;

    const selectedDate = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        document.getElementById("createMsg").innerText = "Due date cannot be in the past!";
        return null;
    }
    return { title, description, dueDate, priority, repeat };
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "signin.html";
}

function goToTrash() {
    window.location.href = "trash.html";
}

// whenever user changes sort option - reload tasks
document.getElementById("sortTasks").addEventListener("change", () => {
    loadTasks();
});

// ask for notification permission on page load
if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission().then(permission => {
        console.log("Notification permission status: ", permission);

        if (permission === "granted") {
            new Notification("✅ Notifications enabled!");
        }
    });
} 

setInterval(checkDueTasks, 60000);      // every 60 seconds

function searchTasks() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const taskCards = document.querySelectorAll(".task-card");

  taskCards.forEach(card => {
    const title = card.querySelector("h3").innerText.toLowerCase();
    const description = card.querySelector("p").innerText.toLowerCase();

    if (title.includes(keyword) || description.includes(keyword)) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

function openChangePasswordOverlay() {
    document.getElementById("changePasswordOverlay").style.display = "flex";

    const changeForm = document.getElementById("changePasswordForm");
    if (changeForm && !changeForm.hasAttribute("listener-attached")) {
        changeForm.addEventListener("submit", (e) => {
            e.preventDefault();
            handlePasswordChange();
        });
        changeForm.setAttribute("listener-attached", "true");               // so it won’t add multiple listeners
    }
}

function closeChangePasswordOverlay() {
    document.getElementById("changePasswordOverlay").style.display = "none";
}

function handlePasswordChange() {
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;

  fetch("http://localhost:3000/change-password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ currentPassword, newPassword })
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showToast("Password updated successfully ✅", "success");
        closeChangePasswordOverlay();
      } else {
        showToast(data.message || "Failed to update password ❌", "error");
      }
    })
    .catch((err) => {
      console.error("Error changing password:", err);
      showToast("Something went wrong!", "error");
    });

    // reset form after submission
    document.getElementById("changePasswordForm").reset();
}
