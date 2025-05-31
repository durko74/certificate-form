// Конфигурация - ЗАМЕНИТЕ НА ВАШ URL GOOGLE APPS SCRIPT
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbyVvQF41ZH8vyoI0hMh4Kzex26xvuBNtceQTtiLIcz-ZeXCXydzvVokxjq7usMopDvjpA/exec';

// Глобальные переменные
let mkbData = [];
const debounceDelay = 300;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Загрузка данных МКБ-10
    loadMkbData();
    
    // Назначение обработчиков событий
    document.getElementById('birthDate').addEventListener('change', calculateAge);
    document.getElementById('mkbCode').addEventListener('input', debounce(handleMkbInput, debounceDelay));
    document.getElementById('diagnosis').addEventListener('input', debounce(handleDiagnosisInput, debounceDelay));
    document.getElementById('clearMkb').addEventListener('click', clearMkbField);
    document.getElementById('clearDiagnosis').addEventListener('click', clearDiagnosisField);
    document.getElementById('clearForm').addEventListener('click', clearForm);
    document.getElementById('patientForm').addEventListener('submit', handleFormSubmit);
    
    // Установка текущей даты по умолчанию
    document.getElementById('visitDate').valueAsDate = new Date();
});

// Загрузка данных МКБ-10
async function loadMkbData() {
    try {
        showMessage('Загрузка справочника МКБ-10...', 'info');
        
        const response = await fetch(`${BACKEND_URL}?action=getMkb10`);
        if (!response.ok) throw new Error('Ошибка загрузки данных');
        
        mkbData = await response.json();
        console.log('Данные МКБ загружены:', mkbData.length, 'записей');
        showMessage('Справочник МКБ-10 успешно загружен', 'success');
    } catch (error) {
        console.error('Ошибка загрузки данных МКБ:', error);
        showMessage('Ошибка загрузки справочника МКБ-10', 'danger');
    }
}

// Расчет возраста
function calculateAge() {
    const birthDate = new Date(document.getElementById('birthDate').value);
    if (isNaN(birthDate.getTime())) return;
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    document.getElementById('age').value = age;
}

// Обработка ввода кода МКБ
function handleMkbInput(e) {
    const input = e.target.value.trim();
    if (!input) {
        clearSuggestions('mkbSuggestions');
        return;
    }
    
    const suggestions = mkbData.filter(item => 
        item.code.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 15);
    
    displaySuggestions(suggestions, 'mkbCode', 'mkbSuggestions', 'code', 'diagnosis');
}

// Обработка ввода диагноза
function handleDiagnosisInput(e) {
    const input = e.target.value.trim();
    if (!input) {
        clearSuggestions('diagnosisSuggestions');
        return;
    }
    
    const suggestions = mkbData.filter(item => 
        item.diagnosis.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 15);
    
    displaySuggestions(suggestions, 'diagnosis', 'diagnosisSuggestions', 'diagnosis', 'code');
}

// Отображение подсказок
function displaySuggestions(items, inputId, containerId, displayField, secondaryField) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `<strong>${item[displayField]}</strong> - ${item[secondaryField]}`;
        
        div.addEventListener('click', () => {
            document.getElementById(inputId).value = item[displayField];
            
            // Если это поле МКБ, заполняем диагноз и наоборот
            if (inputId === 'mkbCode') {
                document.getElementById('diagnosis').value = item.diagnosis;
            } else if (inputId === 'diagnosis') {
                document.getElementById('mkbCode').value = item.code;
            }
            
            clearSuggestions(containerId);
        });
        
        container.appendChild(div);
    });
    
    container.style.display = 'block';
}

// Очистка подсказок
function clearSuggestions(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    container.style.display = 'none';
}

// Очистка поля МКБ
function clearMkbField() {
    document.getElementById('mkbCode').value = '';
    document.getElementById('diagnosis').value = '';
    clearSuggestions('mkbSuggestions');
}

// Очистка поля диагноза
function clearDiagnosisField() {
    document.getElementById('diagnosis').value = '';
    document.getElementById('mkbCode').value = '';
    clearSuggestions('diagnosisSuggestions');
}

// Очистка всей формы
function clearForm() {
    document.getElementById('patientForm').reset();
    document.getElementById('age').value = '';
    clearSuggestions('mkbSuggestions');
    clearSuggestions('diagnosisSuggestions');
    document.getElementById('visitDate').valueAsDate = new Date();
    showMessage('Форма очищена', 'success');
}

// Отправка формы
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    const formData = {
        lastName: document.getElementById('lastName').value.trim(),
        firstName: document.getElementById('firstName').value.trim(),
        middleName: document.getElementById('middleName').value.trim(),
        birthDate: document.getElementById('birthDate').value,
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        visitDate: document.getElementById('visitDate').value,
        mkbCode: document.getElementById('mkbCode').value.trim(),
        diagnosis: document.getElementById('diagnosis').value.trim(),
        notes: document.getElementById('notes').value.trim()
    };
    
    try {
        showMessage('Сохранение данных...', 'info');
        const success = await savePatientData(formData);
        
        if (success) {
            clearForm();
        }
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
        showMessage('Ошибка сохранения данных', 'danger');
    }
}

// Сохранение данных пациента
async function savePatientData(data) {
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка сохранения данных');
        }
        
        const result = await response.json();
        showMessage(result.message || 'Данные успешно сохранены', 'success');
        return true;
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
        showMessage(error.message || 'Ошибка сохранения данных', 'danger');
        return false;
    }
}

// Валидация формы
function validateForm() {
    const form = document.getElementById('patientForm');
    let isValid = true;
    
    // Проверка обязательных полей
    const requiredFields = ['lastName', 'firstName', 'birthDate', 'gender', 'visitDate'];
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });
    
    if (!isValid) {
        showMessage('Заполните все обязательные поля', 'danger');
        form.classList.add('was-validated');
        return false;
    }
    
    return true;
}

// Показ сообщений
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = `<div class="alert alert-${type}">${text}</div>`;
    
    if (type !== 'info') {
        setTimeout(() => messageDiv.innerHTML = '', 5000);
    }
}

// Устранение дребезга
function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Закрытие подсказок при клике вне их
document.addEventListener('click', function(e) {
    if (!e.target.closest('.suggestions-container') && !e.target.closest('#mkbCode') && !e.target.closest('#diagnosis')) {
        clearSuggestions('mkbSuggestions');
        clearSuggestions('diagnosisSuggestions');
    }
});
