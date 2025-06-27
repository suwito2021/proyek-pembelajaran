// Deklarasi variabel
var loginModal = document.getElementById('loginModal');
var registerModal = document.getElementById('registerModal');
var statusMessageDiv = document.getElementById('statusMessage');
var initialWelcome = document.getElementById('initialWelcome');
var initialButtons = document.getElementById('initialButtons');
var questionPage = document.getElementById('questionPage');
var logoutButtonContainer = document.getElementById('logoutButtonContainer');

const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxx2ew_SwKu5ZIZyEsam_mcHUi7VSlQETkfT5Y1tO7ewsK86LKYb1BKSJL1hinwFoO8/exec'; 
const GOOGLE_SHEET_QUIZ_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSfMGt_mG-TuwlRaQy76nBcbTSsWgOiuvRvrVlE9ehZqFkAEcpiuOOTZAz44qgFbA2FhUpJ9loiXEpl/pub?gid=299264193&single=true&output=csv';

let questions = [];

// Fungsi helper
function showStatusMessage(message, type = '') {
    statusMessageDiv.textContent = message;
    statusMessageDiv.className = 'statusMessage';
    if (type) statusMessageDiv.classList.add(type);
    statusMessageDiv.style.display = 'block';
    setTimeout(() => {
        statusMessageDiv.style.display = 'none';
    }, 5000);
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == loginModal) closeModal('loginModal');
    if (event.target == registerModal) closeModal('registerModal');
}

async function loadQuizData() {
    showStatusMessage('Memuat soal...', 'info');
    try {
        const response = await fetch(GOOGLE_SHEET_QUIZ_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csvText = await response.text();
        questions = parseCSV(csvText);
        if (questions.length === 0) throw new Error('Tidak ada soal.');
        showStatusMessage('Soal berhasil dimuat!', 'success');
        return true;
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage(`Gagal memuat soal: ${error.message}.`, 'error');
        return false;
    }
}

function parseCSV(csv) {
    const lines = csv.split('\n').slice(1);
    const p = [];
    for (const l of lines) {
        const t = l.trim();
        if (t) {
            const c = t.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            if (c.length >= 6) {
                const cl = c.map(col => col.replace(/^"|"$/g, '').trim());
                p.push({
                    question: cl[0],
                    options: [cl[1], cl[2], cl[3], cl[4]],
                    answer: cl[5]
                });
            }
        }
    }
    return p;
}

// Fungsi render semua soal
function renderAllQuestions() {
    const container = document.getElementById('allQuestionsContainer');
    container.innerHTML = '';
    let allQuestionsHTML = '';

    questions.forEach((q, index) => {
        allQuestionsHTML += `<div class="question-block" id="q-block-${index}">`;
        allQuestionsHTML += `<p class="question-text">${index + 1}. ${q.question}</p>`;
        allQuestionsHTML += `<div class="options-container">`;
        q.options.forEach(option => {
            if (option) {
                allQuestionsHTML += `
                    <label>
                        <input type="radio" name="answer_${index}" value="${option}">
                        <span>${option}</span>
                    </label>`;
            }
        });
        allQuestionsHTML += `</div></div>`;
    });
    container.innerHTML = allQuestionsHTML;
}

// Event Listener Login
document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    showStatusMessage('Mencoba login...', 'info');
    const formData = new FormData(event.target);
    formData.append('formType', 'login');
    try {
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.status === 'success') {
            showStatusMessage('Login berhasil! Memuat soal...', 'success');
            closeModal('loginModal');
            event.target.reset();
            const loadSuccess = await loadQuizData();
            if (loadSuccess) {
                initialWelcome.style.display = 'none';
                initialButtons.style.display = 'none';
                questionPage.style.display = 'block';
                logoutButtonContainer.style.display = 'block';
                renderAllQuestions();
            }
        } else {
            showStatusMessage(result.message || 'Username/password salah!', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('Terjadi kesalahan jaringan.', 'error');
    }
});

// Event Listener Registrasi
document.getElementById('registerForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    showStatusMessage('Mendaftarkan...', 'info');
    if (document.getElementById('reg_psw').value !== document.getElementById('reg_psw_repeat').value) {
        showStatusMessage('Password tidak cocok!', 'error');
        return;
    }
    const formData = new FormData(event.target);
    formData.append('formType', 'registration');
    try {
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.status === 'success') {
            showStatusMessage(result.message, 'success');
            closeModal('registerModal');
            event.target.reset();
        } else {
            showStatusMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('Gagal mendaftar.', 'error');
    }
});

// Event Listener Submit Semua Jawaban
document.getElementById('submitAllBtn').addEventListener('click', function() {
    let score = 0;
    if (!confirm('Apakah Anda yakin ingin mengumpulkan jawaban?')) {
        return;
    }

    questions.forEach((q, index) => {
        const selectedRadio = document.querySelector(`input[name="answer_${index}"]:checked`);
        let correctOptionText = '';
        const correctAnswerKey = q.answer.toUpperCase();
        switch (correctAnswerKey) {
            case 'A': correctOptionText = q.options[0]; break;
            case 'B': correctOptionText = q.options[1]; break;
            case 'C': correctOptionText = q.options[2]; break;
            case 'D': correctOptionText = q.options[3]; break;
            case 'E': correctOptionText = q.options[4]; break;
        }

        if (selectedRadio) {
            const userAnswer = selectedRadio.value;
            const label = selectedRadio.parentElement;
            if (userAnswer === correctOptionText) {
                score++;
                label.classList.add('correct-answer');
            } else {
                label.classList.add('wrong-answer');
            }
        }
    });

    const finalScoreDisplay = document.getElementById('finalScoreDisplay');
    finalScoreDisplay.textContent = `Skor Akhir Anda: ${score} dari ${questions.length}`;
    finalScoreDisplay.style.display = 'block';

    document.querySelectorAll('#allQuestionsContainer input[type="radio"]').forEach(radio => radio.disabled = true);
    this.disabled = true;
    this.textContent = 'Jawaban Terkumpul';
});

// Event Listener Logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    questionPage.style.display = 'none';
    logoutButtonContainer.style.display = 'none';
    initialWelcome.style.display = 'block';
    initialButtons.style.display = 'block';
    
    const submitBtn = document.getElementById('submitAllBtn');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Kumpulkan Jawaban';
    document.getElementById('finalScoreDisplay').style.display = 'none';
    showStatusMessage('Anda telah logout.', 'info');
});