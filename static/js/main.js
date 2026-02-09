const gpaSection = document.getElementById("gpaSection");
const cgpaSection = document.getElementById("cgpaSection");
const gpaModeBtn = document.getElementById("gpaModeBtn");
const cgpaModeBtn = document.getElementById("cgpaModeBtn");
const gpaCourses = document.getElementById("gpaCourses");
const addGpaCourseBtn = document.getElementById("addGpaCourse");
const calculateGpaBtn = document.getElementById("calculateGpa");
const resetGpaBtn = document.getElementById("resetGpa");
const semesterList = document.getElementById("semesterList");
const addSemesterBtn = document.getElementById("addSemester");
const calculateCgpaBtn = document.getElementById("calculateCgpa");
const resetCgpaBtn = document.getElementById("resetCgpa");
const resultBox = document.getElementById("resultBox");
const errorBox = document.getElementById("errorBox");

function setMode(mode) {
    const isGpa = mode === "gpa";
    gpaSection.classList.toggle("card--hidden", !isGpa);
    cgpaSection.classList.toggle("card--hidden", isGpa);
    gpaModeBtn.classList.toggle("pill--active", isGpa);
    cgpaModeBtn.classList.toggle("pill--active", !isGpa);
    gpaModeBtn.setAttribute("aria-pressed", String(isGpa));
    cgpaModeBtn.setAttribute("aria-pressed", String(!isGpa));
    clearMessages();
}

gpaModeBtn.addEventListener("click", () => setMode("gpa"));
cgpaModeBtn.addEventListener("click", () => setMode("cgpa"));

function createCourseRow() {
    const row = document.createElement("div");
    row.className = "course-row";
    row.innerHTML = `
        <input type="text" name="name" placeholder="Course name" aria-label="Course name" required>
        <input type="number" name="credit" placeholder="Credit hours" min="0" step="0.5" aria-label="Credit hours" required>
        <input type="number" name="marks" placeholder="Marks (0-100)" min="0" max="100" step="1" aria-label="Obtained marks" required>
        <button class="remove-btn" type="button">Remove</button>
    `;
    row.querySelector(".remove-btn").addEventListener("click", () => row.remove());
    return row;
}

function createSemesterBlock(index) {
    const wrapper = document.createElement("div");
    wrapper.className = "semester-card";
    wrapper.innerHTML = `
        <div class="semester-header">
            <div>
                <strong>Semester ${index}</strong>
                <p class="muted" style="margin: 0;">Add courses below</p>
            </div>
            <button class="remove-btn" type="button">Remove semester</button>
        </div>
        <label class="toggle">
            <input type="checkbox" class="use-agg" />
            <span>Enter semester GPA directly</span>
        </label>
        <div class="aggregate-block hidden">
            <div class="aggregate-grid">
                <input type="number" name="aggGpa" placeholder="Semester GPA (0-4)" min="0" max="4" step="0.01" aria-label="Semester GPA">
                <input type="number" name="aggCredits" placeholder="Total credit hours" min="0" step="0.5" aria-label="Total credit hours for semester">
            </div>
        </div>
        <div class="course-grid"></div>
        <div class="actions courses-actions">
            <button class="btn btn--add" type="button">Add Course</button>
        </div>
    `;
    const courseGrid = wrapper.querySelector(".course-grid");
    const addCourseBtn = wrapper.querySelector(".btn");
    const removeSemBtn = wrapper.querySelector(".remove-btn");
    const toggle = wrapper.querySelector(".use-agg");
    const aggBlock = wrapper.querySelector(".aggregate-block");
    const coursesActions = wrapper.querySelector(".courses-actions");

    const addCourse = () => courseGrid.appendChild(createCourseRow());
    addCourse();
    addCourse();

    addCourseBtn.addEventListener("click", addCourse);
    removeSemBtn.addEventListener("click", () => wrapper.remove());

    const setAggregateMode = (on) => {
        aggBlock.classList.toggle("hidden", !on);
        courseGrid.classList.toggle("hidden", on);
        coursesActions.classList.toggle("hidden", on);
    };

    toggle.addEventListener("change", (e) => setAggregateMode(e.target.checked));
    setAggregateMode(false);

    return wrapper;
}

function bootstrapGpaRows() {
    gpaCourses.innerHTML = "";
    gpaCourses.className = "course-grid";
    gpaCourses.appendChild(createCourseRow());
    gpaCourses.appendChild(createCourseRow());
}

function bootstrapCgpa() {
    semesterList.innerHTML = "";
    semesterList.className = "semester-block";
    addSemester();
}

function addSemester() {
    const index = semesterList.children.length + 1;
    semesterList.appendChild(createSemesterBlock(index));
}

addGpaCourseBtn.addEventListener("click", () => gpaCourses.appendChild(createCourseRow()));
calculateGpaBtn.addEventListener("click", () => submitGpa());
resetGpaBtn.addEventListener("click", () => { bootstrapGpaRows(); clearMessages(); });

addSemesterBtn.addEventListener("click", addSemester);
calculateCgpaBtn.addEventListener("click", () => submitCgpa());
resetCgpaBtn.addEventListener("click", () => { bootstrapCgpa(); clearMessages(); });

function collectCourses(container) {
    const rows = Array.from(container.querySelectorAll(".course-row"));
    return rows.map((row) => {
        const name = row.querySelector("input[name='name']").value.trim();
        const credit = parseFloat(row.querySelector("input[name='credit']").value);
        const marks = parseFloat(row.querySelector("input[name='marks']").value);
        return { name, credit_hours: credit, marks };
    });
}

function submitGpa() {
    clearMessages();
    const courses = collectCourses(gpaCourses);
    postCalculation({ mode: "gpa", courses });
}

function submitCgpa() {
    clearMessages();
    const semesters = Array.from(semesterList.querySelectorAll(".semester-card")).map((card) => {
        const courseGrid = card.querySelector(".course-grid");
        const useAgg = card.querySelector(".use-agg").checked;
        if (useAgg) {
            const gpa = parseFloat(card.querySelector("input[name='aggGpa']").value);
            const credits = parseFloat(card.querySelector("input[name='aggCredits']").value);
            return { mode: "aggregate", gpa, credits };
        }
        return { mode: "courses", courses: collectCourses(courseGrid) };
    });
    postCalculation({ mode: "cgpa", semesters });
}

async function postCalculation(payload) {
    try {
        const res = await fetch("/api/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to calculate");
        renderResult(data);
    } catch (err) {
        showError(err.message);
    }
}

function renderResult(data) {
    const { result, totalCredits, type, pass } = data;
    const isCgpa = type === "CGPA";
    resultBox.innerHTML = `
        <div class="result-value">${type}: ${Number(result).toFixed(2)}</div>
        <p class="muted">Total credit hours: ${totalCredits}</p>
        ${isCgpa ? renderPassBadge(pass, result) : ""}
    `;
}

function renderPassBadge(pass, result) {
    const label = pass ? "Pass" : "Below 2.00 (Fail)";
    const cls = pass ? "badge badge--pass" : "badge badge--fail";
    return `<span class="${cls}">${label}</span>`;
}

function showError(message) {
    errorBox.textContent = message;
}

function clearMessages() {
    errorBox.textContent = "";
    resultBox.innerHTML = '<p class="muted">No calculation yet.</p>';
}

bootstrapGpaRows();
bootstrapCgpa();
setMode("gpa");
