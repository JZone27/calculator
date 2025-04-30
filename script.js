let currentMode = 'standard';
let currentInput = '0';
let calculationHistory = [];
let lastCalculatedValue = 0;
let systemValues = {
    hex: '0',
    dec: '0',
    oct: '0',
    bin: '0'
};
let activeNumberSystem = 'dec'; // Default is decimal

function updateDisplay() {
    document.getElementById('display').value = currentInput;
    
    // Update number system displays
    try {
        let numValue;
        if (currentInput.includes('+') || currentInput.includes('-') || 
            currentInput.includes('*') || currentInput.includes('/') || 
            currentInput.includes('%')) {
            try {
                numValue = eval(currentInput);
            } catch (e) {
                numValue = lastCalculatedValue;
            }
        } else {
            // Parse number according to active number system
            switch (activeNumberSystem) {
                case 'bin':
                    numValue = parseInt(currentInput, 2) || 0;
                    break;
                case 'oct':
                    numValue = parseInt(currentInput, 8) || 0;
                    break;
                case 'hex':
                    numValue = parseInt(currentInput, 16) || 0;
                    break;
                default: // decimal
                    numValue = parseFloat(currentInput) || 0;
            }
        }
        
        // Store the calculated value for future reference
        lastCalculatedValue = numValue;
        
        // Ensure we're working with integer values for conversions
        const intValue = Math.floor(numValue);
        
        // Update system values
        systemValues.dec = intValue.toString();
        systemValues.hex = intValue.toString(16).toUpperCase();
        systemValues.oct = intValue.toString(8);
        systemValues.bin = intValue.toString(2);
        
        // Function to truncate long numbers
        const truncateValue = (value, maxLength = 12) => {
            return value.length > maxLength ? value.slice(0, maxLength) + '...' : value;
        };

        // Update display elements with truncation
        document.getElementById('dec-value').textContent = truncateValue(systemValues.dec);
        document.getElementById('hex-value').textContent = truncateValue(systemValues.hex);
        document.getElementById('oct-value').textContent = truncateValue(systemValues.oct);
        document.getElementById('bin-value').textContent = truncateValue(systemValues.bin);
    } catch (e) {
        console.error("Error updating number systems:", e);
    }
}

function appendToDisplay(value) {
    // Check if the input is valid for the current number system
    if (!isValidInput(value)) {
        return;
    }

    // Handle decimal point for non-zero numbers
    if (value === '.' && activeNumberSystem === 'dec') {
        // Get the last number in the expression
        const numbers = currentInput.split(/[+\-*/%]/);
        const lastNumber = numbers[numbers.length - 1];
        
        // Check if the last number already has a decimal point
        if (lastNumber.includes('.')) {
            return;
        }
    }

    if (currentInput === '0' && !isNaN(value)) {
        currentInput = value;
    } else if (currentInput === '0' && value === '.') {
        currentInput = '0.';
    } else if (currentInput === '0' && '+-*/%'.includes(value)) {
        currentInput = '0' + value;
    } else {
        currentInput += value;
    }
    updateDisplay();
}

function isValidInput(value) {
    // Always allow operators and special functions
    if ('+-*/%'.includes(value) || value === 'C' || value === '=' || value === '±') {
        return true;
    }

    // Handle decimal point
    if (value === '.') {
        return activeNumberSystem === 'dec' && !currentInput.includes('.');
    }

    // Check based on active number system
    switch (activeNumberSystem) {
        case 'bin':
            return /[0-1]/.test(value);
        case 'oct':
            return /[0-7]/.test(value);
        case 'dec':
            return /[0-9]/.test(value);
        case 'hex':
            return /[0-9A-Fa-f]/.test(value);
        default:
            return false;
    }
}

function clearDisplay() {
    currentInput = '0';
    updateDisplay();
}

function backspace() {
    if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
    } else {
        currentInput = '0';
    }
    updateDisplay();
}

function toggleSign() {
    try {
        const result = eval(currentInput);
        currentInput = (-result).toString();
        updateDisplay();
    } catch (e) {
        currentInput = 'Error';
        updateDisplay();
        setTimeout(clearDisplay, 1000);
    }
}

function calculate() {
    try {
        const expression = currentInput;
        const result = eval(currentInput);
        
        // Add to history
        addToHistory(expression, result);
        
        // Save to database
        saveCalculation(expression, result);
        
        currentInput = result.toString();
        updateDisplay();
    } catch (e) {
        currentInput = 'Error';
        updateDisplay();
        setTimeout(clearDisplay, 1000);
    }
}

function addToHistory(expression, result) {
    calculationHistory.push({ expression, result });
    updateHistoryDisplay();
}

function saveCurrentValue() {
    const valueToSave = currentInput;
    addToHistory('Saved', valueToSave);
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('history-list');
    if (calculationHistory.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No calculations yet</div>';
        return;
    }
    
    historyList.innerHTML = '';
    calculationHistory.slice().reverse().forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.textContent = `${item.expression} = ${item.result}`;
        historyItem.onclick = () => {
            currentInput = item.result.toString();
            updateDisplay();
        };
        historyList.appendChild(historyItem);
    });
}

function saveCalculation(expression, result) {
    // Create a fetch request to send data to PHP
    fetch('save_calculation.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `expression=${encodeURIComponent(expression)}&result=${encodeURIComponent(result)}`
    })
    .then(response => response.text())
    .then(data => {
        console.log('Calculation saved:', data);
    })
    .catch(error => {
        console.error('Error saving calculation:', error);
    });
}

// Function to handle clicking on number systems
function insertValueToDisplay(system) {
    // Set active number system
    setActiveNumberSystem(system);
    
    // Add visual feedback
    const element = document.querySelector(`.number-system[onclick*="${system}"]`);
    element.classList.add('pulse');
    setTimeout(() => element.classList.remove('pulse'), 300);
    
    // Replace current input with selected value
    if (system in systemValues) {
        // If we're in the middle of an expression, continue the expression
        if (currentInput.endsWith('+') || currentInput.endsWith('-') || 
            currentInput.endsWith('*') || currentInput.endsWith('/')) {
            currentInput += systemValues[system];
        } else {
            currentInput = systemValues[system];
        }
        updateDisplay();
    }
}

// Set active number system
function setActiveNumberSystem(system) {
    activeNumberSystem = system;
    
    // Remove active class from all number systems
    document.querySelectorAll('.number-system').forEach(el => {
        el.classList.remove('active');
    });
    
    // Add active class to selected number system
    document.querySelector(`.number-system[onclick*="${system}"]`).classList.add('active');

    // Update button states based on the active number system
    updateButtonStates();
}

// Mode switchers
document.addEventListener('DOMContentLoaded', function() {
    
    document.getElementById('programmer-mode').addEventListener('click', function() {
        setMode('programmer');
    });
    
    // Initialize
    updateDisplay();
    
    // Load calculations from the database on page load
    loadCalculations();
});

// Function to update button states based on active number system
function updateButtonStates() {
    // Get all number and hex buttons
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        const value = button.textContent;
        // Always enable operation buttons, CE, CL, backspace, and equals
        if (value === 'CE' || value === 'CL' || value === '⌫' || value === '=' ||
            value === '+' || value === '−' || value === '×' || value === '/' || value === '+/-') {
            button.removeAttribute('disabled');
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
        }
        // For number and letter buttons, check if they're valid for the current number system
        else if (value.length === 1) {
            if (isValidInput(value)) {
                button.removeAttribute('disabled');
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
            } else {
                button.setAttribute('disabled', 'true');
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
            }
        }
    });

}

function setMode(mode) {
    currentMode = mode;
    
    // Remove active class from all mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected mode button
    document.getElementById(`${mode}-mode`).classList.add('active');
    
    // Show/hide specific elements based on the selected mode
    switch(mode) {
        case 'programmer':
            // Make number systems more visible in programmer mode
            document.querySelector('.number-systems-sidebar').style.display = 'table';
            break;
    }
}

function loadCalculations() {
    fetch('get_calculations.php')
    .then(response => response.json())
    .then(data => {
        if (data && data.length > 0) {
            calculationHistory = data.map(item => ({
                expression: item.expression,
                result: item.result
            }));
            updateHistoryDisplay();
        }
    })
    .catch(error => {
        console.error('Error loading calculations:', error);
    });
}