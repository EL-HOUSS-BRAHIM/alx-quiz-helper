/**
 * Data Manager Script
 * Handles viewing, editing, and managing stored quiz data
 */

let currentData = [];
let filteredData = [];
let editingIndex = -1;
let currentTestKey = null;
let allTestsData = {};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Data Manager: Initializing...');
    
    // Debug: Check if QuizStorage is available
    if (typeof QuizStorage === 'undefined') {
        console.error('QuizStorage is not available!');
        showError('QuizStorage is not available. Make sure storage.js is loaded.');
        return;
    }
    
    loadAndDisplayTests();
    
    // Set up button event listeners
    setupEventListeners();
    
    // Make functions available globally for debugging
    window.debugDataManager = {
        loadAndDisplayTests,
        showTestSelection,
        displayTestCards,
        allTestsData,
        forceShowTests: async function() {
            console.log('Force showing tests...');
            const tests = await QuizStorage.getAvailableTests();
            console.log('Raw tests data:', tests);
            allTestsData = tests;
            showTestSelection();
        },
        manualShow: function() {
            console.log('Manual show attempt...');
            const testSelectionView = document.getElementById('testSelectionView');
            
            // Hide all views first
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('questionTableView').style.display = 'none';
            
            // Force show test selection
            testSelectionView.classList.remove('hidden');
            testSelectionView.style.display = 'block';
            testSelectionView.style.visibility = 'visible';
            
            console.log('Test selection view should now be visible');
            console.log('Element:', testSelectionView);
            console.log('Classes:', testSelectionView.classList.toString());
            console.log('Style display:', testSelectionView.style.display);
        }
    };
});

/**
 * Set up event listeners for buttons
 */
function setupEventListeners() {
    // Export JSON button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
    
    // Export CSV button
    const csvExportBtn = document.getElementById('csvExportBtn');
    if (csvExportBtn) {
        csvExportBtn.addEventListener('click', exportCSV);
    }
    
    // Export Detailed CSV button
    const detailedCsvExportBtn = document.getElementById('detailedCsvExportBtn');
    if (detailedCsvExportBtn) {
        detailedCsvExportBtn.addEventListener('click', exportDetailedCSV);
    }
    
    // Import button
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', importData);
    }
    
    // Clear All button
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllData);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }
    
    // Back to tests button
    const backToTestsBtn = document.getElementById('backToTestsBtn');
    if (backToTestsBtn) {
        backToTestsBtn.addEventListener('click', showTestSelection);
    }
    
    // Modal close event listeners
    setupModalEventListeners();
}

/**
 * Set up modal event listeners for close functionality
 */
function setupModalEventListeners() {
    // Image modal close events
    const imageModal = document.getElementById('imageModal');
    const imageModalClose = imageModal?.querySelector('.close');
    const imageModalCloseBtn = imageModal?.querySelector('.modal-footer .button-secondary');
    
    if (imageModalClose) {
        imageModalClose.addEventListener('click', closeImageModal);
    }
    
    if (imageModalCloseBtn) {
        imageModalCloseBtn.addEventListener('click', closeImageModal);
    }
    
    // Close image modal when clicking outside
    if (imageModal) {
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) {
                closeImageModal();
            }
        });
    }
    
    // Edit modal close events
    const editModal = document.getElementById('editModal');
    const editModalClose = editModal?.querySelector('.close');
    const editModalCancelBtn = editModal?.querySelector('.button-secondary');
    
    if (editModalClose) {
        editModalClose.addEventListener('click', closeEditModal);
    }
    
    if (editModalCancelBtn) {
        editModalCancelBtn.addEventListener('click', closeEditModal);
    }
    
    // Close edit modal when clicking outside
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                closeEditModal();
            }
        });
    }
    
    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (imageModal?.style.display === 'block') {
                closeImageModal();
            }
            if (editModal?.style.display === 'block') {
                closeEditModal();
            }
        }
    });
}

/**
 * Load and display all stored data
 */
/**
 * Load and display test selection interface
 */
async function loadAndDisplayTests() {
    try {
        console.log('Loading and displaying tests...');
        showLoading(true);
        
        // Load test-organized data from storage
        const tests = await QuizStorage.getAvailableTests();
        console.log('Loaded tests:', tests);
        
        if (!tests || tests.length === 0) {
            console.log('No tests found, trying migration...');
            // Fallback: try to load legacy data and convert it
            await migrateFromLegacyData();
            const testsAfterMigration = await QuizStorage.getAvailableTests();
            console.log('Tests after migration:', testsAfterMigration);
            if (!testsAfterMigration || testsAfterMigration.length === 0) {
                showEmptyState();
                return;
            }
            allTestsData = testsAfterMigration;
        } else {
            allTestsData = tests;
        }
        
        console.log('Final allTestsData:', allTestsData);
        updateTestStats();
        showTestSelection();
        
    } catch (error) {
        console.error('Error loading tests:', error);
        showError('Failed to load tests: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Migrate legacy data to test-organized format
 */
async function migrateFromLegacyData() {
    try {
        const result = await chrome.storage.local.get(['quiz_corrections_data']);
        const legacyData = result.quiz_corrections_data;
        
        if (legacyData && legacyData.length > 0) {
            console.log('Migrating legacy data to test-organized format...');
            
            // Add default test and course names to legacy data
            const enhancedData = legacyData.map(question => ({
                ...question,
                testName: question.testName || 'Imported Test',
                courseName: question.courseName || 'Unknown Course'
            }));
            
            // Save using the new format
            await QuizStorage.saveQuizData(enhancedData);
            console.log('Legacy data migration completed');
        }
    } catch (error) {
        console.error('Error migrating legacy data:', error);
    }
}

/**
 * Update statistics for test view
 */
function updateTestStats() {
    console.log('Updating test stats with:', allTestsData);
    
    if (!allTestsData || !Array.isArray(allTestsData)) {
        console.log('allTestsData is not an array:', allTestsData);
        return;
    }
    
    const totalTests = allTestsData.length;
    const totalQuestions = allTestsData.reduce((sum, test) => sum + (test.questionCount || 0), 0);
    
    console.log('Total tests:', totalTests, 'Total questions:', totalQuestions);
    
    const totalQuestionsEl = document.getElementById('totalQuestions');
    const dataAgeEl = document.getElementById('dataAge');
    
    if (totalQuestionsEl) totalQuestionsEl.textContent = totalQuestions;
    if (dataAgeEl) dataAgeEl.textContent = `${totalTests} tests`;
}

/**
 * Show test selection interface
 */
function showTestSelection() {
    console.log('Showing test selection view');
    
    // Hide all other views
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('questionTableView').classList.add('hidden');
    
    // Show test selection view
    const testSelectionView = document.getElementById('testSelectionView');
    console.log('Test selection view element:', testSelectionView);
    console.log('Classes before removal:', testSelectionView.classList.toString());
    
    testSelectionView.classList.remove('hidden');
    testSelectionView.style.display = 'block'; // Force visibility
    
    console.log('Classes after removal:', testSelectionView.classList.toString());
    console.log('Element style display:', testSelectionView.style.display);
    
    // Populate tests
    displayTestCards();
    
    currentTestKey = null;
}

/**
 * Display test cards
 */
function displayTestCards() {
    const container = document.getElementById('testsContainer');
    console.log('Tests container:', container);
    console.log('All tests data:', allTestsData);
    
    container.innerHTML = '';
    
    if (!allTestsData || allTestsData.length === 0) {
        console.log('No tests data available');
        container.innerHTML = '<div class="no-tests">No tests available</div>';
        return;
    }
    
    allTestsData.forEach((test, index) => {
        console.log(`Creating card for test ${index}:`, test);
        const card = createTestCard(test);
        container.appendChild(card);
    });
    
    console.log('Test cards created. Container content:', container.innerHTML);
}

/**
 * Create a test card element
 */
function createTestCard(test) {
    const card = document.createElement('div');
    card.className = 'test-card';
    card.onclick = () => showTestQuestions(test.key);
    
    const lastUpdated = new Date(test.lastUpdated).toLocaleDateString();
    
    card.innerHTML = `
        <div class="test-card-header">
            <div class="test-card-title">${escapeHtml(test.testName)}</div>
            <div class="test-card-course">${escapeHtml(test.courseName)}</div>
        </div>
        <div class="test-card-stats">
            <span class="test-card-questions">${test.questionCount} questions</span>
            <span class="test-card-date">${lastUpdated}</span>
        </div>
        <div class="test-card-footer">
            <span class="test-card-action">Click to view questions →</span>
        </div>
    `;
    
    return card;
}

/**
 * Show questions for a specific test
 */
async function showTestQuestions(testKey) {
    try {
        showLoading(true);
        
        const testData = await QuizStorage.getTestQuestions(testKey);
        if (!testData) {
            showError('Test data not found');
            return;
        }
        
        currentTestKey = testKey;
        currentData = testData.questions;
        filteredData = [...currentData];
        
        // Update header info
        document.getElementById('currentTestName').textContent = testData.testName;
        document.getElementById('currentCourseInfo').textContent = testData.courseName;
        
        // Show question table view
        document.getElementById('testSelectionView').classList.add('hidden');
        document.getElementById('questionTableView').classList.remove('hidden');
        
        // Display the questions table
        displayDataTable(filteredData);
        
    } catch (error) {
        console.error('Error loading test questions:', error);
        showError('Failed to load test questions: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function loadAndDisplayData() {
    try {
        showLoading(true);
        
        // Load data from storage
        const result = await chrome.storage.local.get(['quiz_corrections_data', 'quiz_corrections_timestamp']);
        const data = result.quiz_corrections_data;
        const timestamp = result.quiz_corrections_timestamp;
        
        if (!data || data.length === 0) {
            showEmptyState();
            return;
        }
        
        currentData = data;
        filteredData = [...data];
        
        updateStats(data, timestamp);
        displayDataTable(filteredData);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Update statistics display
 */
function updateStats(data, timestamp) {
    // Total questions
    document.getElementById('totalQuestions').textContent = data.length;
    
    // Data age
    if (timestamp) {
        const age = Date.now() - timestamp;
        const hours = Math.floor(age / (1000 * 60 * 60));
        const minutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            document.getElementById('dataAge').textContent = `${hours}h ${minutes}m ago`;
        } else {
            document.getElementById('dataAge').textContent = `${minutes}m ago`;
        }
    } else {
        document.getElementById('dataAge').textContent = 'Unknown';
    }
    
    // Storage size (rough estimate)
    const dataSize = JSON.stringify(data).length;
    const sizeKB = Math.round(dataSize / 1024);
    document.getElementById('storageSize').textContent = `${sizeKB} KB`;
}

/**
 * Display data in table format
 */
function displayDataTable(data) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">No matching data found</td></tr>';
        showTableContainer();
        return;
    }
    
    data.forEach((question, index) => {
        const row = createTableRow(question, index);
        tbody.appendChild(row);
    });
    
    showTableContainer();
}

/**
 * Create a table row for a question
 */
function createTableRow(question, index) {
    const row = document.createElement('tr');
    
    // Index
    const indexCell = document.createElement('td');
    indexCell.textContent = index + 1;
    row.appendChild(indexCell);
    
    // Question text
    const questionCell = document.createElement('td');
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-text';
    questionDiv.textContent = question.questionText;
    questionDiv.title = question.questionText; // Full text on hover
    questionCell.appendChild(questionDiv);
    row.appendChild(questionCell);
    
    // Answers
    const answersCell = document.createElement('td');
    const answersDiv = document.createElement('div');
    answersDiv.className = 'answers-list';
    
    if (question.answers && question.answers.length > 0) {
        question.answers.forEach((answer, answerIndex) => {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'answer-item';
            
            if (question.correctAnswers && question.correctAnswers.includes(answerIndex)) {
                answerDiv.classList.add('answer-correct');
                
                // Check if this correct answer has an image
                const correctAnswerImage = question.correctAnswerImages?.find(img => img.answerIndex === answerIndex);
                if (correctAnswerImage && correctAnswerImage.imageData && (correctAnswerImage.imageData.dataURL || correctAnswerImage.imageData.src)) {
                    // Create image element for correct answer
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'correct-answer-image';
                    
                    const img = document.createElement('img');
                    // Use dataURL if available, otherwise use src URL
                    img.src = correctAnswerImage.imageData.dataURL || correctAnswerImage.imageData.src;
                    img.alt = correctAnswerImage.imageData.alt || 'Correct Answer Image';
                    img.style.maxWidth = '100px';
                    img.style.maxHeight = '100px';
                    img.style.cursor = 'pointer';
                    img.title = 'Click to view full size';
                    
                    // Add click handler to show full size image
                    img.onclick = () => showImageModal(correctAnswerImage.imageData);
                    
                    imgContainer.appendChild(img);
                    answerDiv.appendChild(imgContainer);
                    
                    const textDiv = document.createElement('div');
                    textDiv.textContent = `✓ ${answer.text}`;
                    answerDiv.appendChild(textDiv);
                } else {
                    answerDiv.textContent = `✓ ${answer.text}`;
                }
            } else {
                answerDiv.classList.add('answer-incorrect');
                answerDiv.textContent = `○ ${answer.text}`;
            }
            
            answersDiv.appendChild(answerDiv);
        });
    } else {
        answersDiv.textContent = 'No answers';
    }
    
    answersCell.appendChild(answersDiv);
    row.appendChild(answersCell);
    
    // Timestamp
    const timestampCell = document.createElement('td');
    if (question.timestamp) {
        const date = new Date(question.timestamp);
        timestampCell.innerHTML = `
            <div class="timestamp">
                ${date.toLocaleDateString()}<br>
                ${date.toLocaleTimeString()}
            </div>
        `;
    } else {
        timestampCell.textContent = 'Unknown';
    }
    row.appendChild(timestampCell);
    
    // Actions
    const actionsCell = document.createElement('td');
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'action-buttons';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn edit-btn';
    editBtn.innerHTML = '✏️ Edit';
    editBtn.onclick = () => editQuestion(index);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.innerHTML = '🗑️ Delete';
    deleteBtn.onclick = () => deleteQuestion(index);
    
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    actionsCell.appendChild(actionsDiv);
    row.appendChild(actionsCell);
    
    return row;
}

/**
 * Search through data
 */
function searchData() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredData = [...currentData];
    } else {
        filteredData = currentData.filter(question => {
            // Search in question text
            if (question.questionText.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            // Search in answers
            if (question.answers) {
                return question.answers.some(answer => 
                    answer.text.toLowerCase().includes(searchTerm)
                );
            }
            
            return false;
        });
    }
    
    displayDataTable(filteredData);
}

/**
 * Edit a question
 */
function editQuestion(index) {
    editingIndex = index;
    const question = currentData[index];
    
    // Populate modal with question data
    document.getElementById('editQuestionText').value = question.questionText;
    
    // Clear previous answers
    const answersEditor = document.getElementById('answersEditor');
    answersEditor.innerHTML = '';
    
    // Add answer editors
    if (question.answers && question.answers.length > 0) {
        question.answers.forEach((answer, answerIndex) => {
            addAnswerEditor(answer.text, question.correctAnswers.includes(answerIndex));
        });
    } else {
        // Add one empty answer
        addAnswerEditor('', false);
    }
    
    // Clear any previous messages
    document.getElementById('modalMessage').innerHTML = '';
    
    // Show modal
    document.getElementById('editModal').style.display = 'block';
}

/**
 * Add an answer editor to the modal
 */
function addAnswerEditor(text = '', isCorrect = false) {
    const answersEditor = document.getElementById('answersEditor');
    const answerDiv = document.createElement('div');
    answerDiv.className = 'answer-editor';
    
    answerDiv.innerHTML = `
        <div class="answer-editor-header">
            <span>Answer ${answersEditor.children.length + 1}</span>
            <div class="checkbox-container">
                <input type="checkbox" ${isCorrect ? 'checked' : ''}>
                <label>Correct Answer</label>
                <button type="button" class="action-btn delete-btn" onclick="removeAnswer(this)">🗑️</button>
            </div>
        </div>
        <input type="text" class="form-input" value="${text}" placeholder="Enter answer text...">
    `;
    
    answersEditor.appendChild(answerDiv);
}

/**
 * Add a new answer editor
 */
function addAnswer() {
    addAnswerEditor();
}

/**
 * Remove an answer editor
 */
function removeAnswer(button) {
    const answerEditor = button.closest('.answer-editor');
    answerEditor.remove();
    
    // Update answer numbers
    const answersEditor = document.getElementById('answersEditor');
    Array.from(answersEditor.children).forEach((child, index) => {
        const header = child.querySelector('.answer-editor-header span');
        header.textContent = `Answer ${index + 1}`;
    });
}

/**
 * Save the edited question
 */
async function saveQuestion() {
    try {
        const questionText = document.getElementById('editQuestionText').value.trim();
        
        if (!questionText) {
            showModalMessage('Question text is required', 'error');
            return;
        }
        
        // Collect answers
        const answersEditor = document.getElementById('answersEditor');
        const answerEditors = answersEditor.querySelectorAll('.answer-editor');
        
        const answers = [];
        const correctAnswers = [];
        
        answerEditors.forEach((editor, index) => {
            const text = editor.querySelector('.form-input').value.trim();
            const isCorrect = editor.querySelector('input[type="checkbox"]').checked;
            
            if (text) {
                answers.push({ text: text, index: index });
                if (isCorrect) {
                    correctAnswers.push(index);
                }
            }
        });
        
        if (answers.length === 0) {
            showModalMessage('At least one answer is required', 'error');
            return;
        }
        
        if (correctAnswers.length === 0) {
            showModalMessage('At least one correct answer must be selected', 'error');
            return;
        }
        
        // Update the question
        const updatedQuestion = {
            ...currentData[editingIndex],
            questionText: questionText,
            answers: answers,
            correctAnswers: correctAnswers,
            lastModified: Date.now()
        };
        
        // Update the data array
        currentData[editingIndex] = updatedQuestion;
        
        // Save to storage
        await chrome.storage.local.set({
            quiz_corrections_data: currentData
        });
        
        showModalMessage('Question saved successfully!', 'success');
        
        // Refresh display
        setTimeout(() => {
            closeEditModal();
            loadAndDisplayData();
        }, 1000);
        
    } catch (error) {
        console.error('Error saving question:', error);
        showModalMessage('Failed to save question: ' + error.message, 'error');
    }
}

/**
 * Delete a question
 */
async function deleteQuestion(index) {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Remove from array
        currentData.splice(index, 1);
        
        // Update storage
        await chrome.storage.local.set({
            quiz_corrections_data: currentData
        });
        
        // Refresh display
        showSuccess('Question deleted successfully');
        loadAndDisplayData();
        
    } catch (error) {
        console.error('Error deleting question:', error);
        showError('Failed to delete question: ' + error.message);
    }
}

/**
 * Clear all data
 */
async function clearAllData() {
    if (!confirm('Are you sure you want to delete ALL quiz data? This action cannot be undone.')) {
        return;
    }
    
    try {
        await chrome.storage.local.clear();
        currentData = [];
        filteredData = [];
        
        showSuccess('All data cleared successfully');
        showEmptyState();
        
    } catch (error) {
        console.error('Error clearing data:', error);
        showError('Failed to clear data: ' + error.message);
    }
}

/**
 * Export data to JSON file with best practices
 */
function exportData() {
    if (currentData.length === 0) {
        showError('No data to export');
        return;
    }
    
    try {
        // Create comprehensive export object with metadata
        const exportObject = {
            // Metadata
            metadata: {
                exportDate: new Date().toISOString(),
                version: '1.0.0',
                format: 'alx-quiz-helper-data',
                totalQuestions: currentData.length,
                exportedBy: 'ALX Quiz Helper Extension',
                description: 'Exported quiz correction data from ALX Savanna platform'
            },
            
            // Statistics
            statistics: {
                questionsWithAnswers: currentData.filter(q => q.answers && q.answers.length > 0).length,
                questionsWithCorrectAnswers: currentData.filter(q => q.correctAnswers && q.correctAnswers.length > 0).length,
                totalAnswers: currentData.reduce((sum, q) => sum + (q.answers ? q.answers.length : 0), 0),
                averageAnswersPerQuestion: currentData.length > 0 ? (currentData.reduce((sum, q) => sum + (q.answers ? q.answers.length : 0), 0) / currentData.length).toFixed(2) : 0,
                oldestQuestion: Math.min(...currentData.map(q => q.timestamp || Date.now())),
                newestQuestion: Math.max(...currentData.map(q => q.timestamp || Date.now()))
            },
            
            // Validation hash for integrity checking
            dataHash: generateDataHash(currentData),
            
            // The actual data
            data: currentData.map(question => ({
                ...question,
                // Add export timestamp to each question
                exportedAt: new Date().toISOString()
            }))
        };
        
        // Convert to JSON with pretty formatting
        const dataStr = JSON.stringify(exportObject, null, 2);
        
        // Create blob and download
        const dataBlob = new Blob([dataStr], { 
            type: 'application/json;charset=utf-8' 
        });
        
        // Generate descriptive filename
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
        const filename = `alx-quiz-data-${dateStr}_${timeStr}_${currentData.length}q.json`;
        
        // Create download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = filename;
        link.style.display = 'none';
        
        // Add to DOM, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        
        // Show success with details
        showSuccess(`Data exported successfully!\nFile: ${filename}\nQuestions: ${currentData.length}`);
        
        // Log export for debugging
        console.log('Export completed:', {
            filename,
            questions: currentData.length,
            size: `${Math.round(dataStr.length / 1024)} KB`
        });
        
    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export data: ' + error.message);
    }
}

/**
 * Export data to CSV file with comprehensive question and answer data
 */
function exportCSV() {
    if (currentData.length === 0) {
        showError('No data to export');
        return;
    }
    
    try {
        // Define CSV headers
        const headers = [
            'Question Number',
            'Question Text',
            'Has Image',
            'Answer Count',
            'Answer 1',
            'Answer 1 Correct',
            'Answer 2', 
            'Answer 2 Correct',
            'Answer 3',
            'Answer 3 Correct',
            'Answer 4',
            'Answer 4 Correct',
            'Answer 5',
            'Answer 5 Correct',
            'Correct Answer Texts',
            'Question Hash',
            'Timestamp',
            'Source URL'
        ];
        
        // Convert data to CSV rows
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        currentData.forEach((question, index) => {
            // Escape CSV values (handle commas, quotes, newlines)
            const escapeCSV = (value) => {
                if (value === null || value === undefined) return '';
                const str = String(value);
                if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            };
            
            // Extract question data
            const questionNumber = question.questionNumber || (index + 1);
            const questionText = question.questionText || question.text || '';
            const hasImage = question.hasImage || question.hasQuestionImage || 'false';
            const answerCount = (question.answers && question.answers.length) || 0;
            
            // Extract answers (up to 5)
            const answers = question.answers || [];
            const correctAnswers = question.correctAnswers || [];
            
            const row = [
                escapeCSV(questionNumber),
                escapeCSV(questionText),
                escapeCSV(hasImage),
                escapeCSV(answerCount),
                escapeCSV(answers[0] || ''),
                escapeCSV(correctAnswers[0] || false),
                escapeCSV(answers[1] || ''),
                escapeCSV(correctAnswers[1] || false),
                escapeCSV(answers[2] || ''),
                escapeCSV(correctAnswers[2] || false),
                escapeCSV(answers[3] || ''),
                escapeCSV(correctAnswers[3] || false),
                escapeCSV(answers[4] || ''),
                escapeCSV(correctAnswers[4] || false),
                escapeCSV((question.correctAnswerTexts || []).join(' | ')),
                escapeCSV(question.questionHash || ''),
                escapeCSV(question.timestamp ? new Date(question.timestamp).toISOString() : ''),
                escapeCSV(question.url || question.sourceUrl || '')
            ];
            
            csvRows.push(row.join(','));
        });
        
        // Create CSV content
        const csvContent = csvRows.join('\n');
        
        // Create blob and download
        const csvBlob = new Blob([csvContent], { 
            type: 'text/csv;charset=utf-8' 
        });
        
        // Generate descriptive filename
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
        const filename = `alx-quiz-data-${dateStr}_${timeStr}_${currentData.length}q.csv`;
        
        // Create download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(csvBlob);
        link.download = filename;
        link.style.display = 'none';
        
        // Add to DOM, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        
        // Show success with details
        showSuccess(`CSV exported successfully!\nFile: ${filename}\nQuestions: ${currentData.length}\nFormat: Excel-compatible CSV`);
        
        // Log export for debugging
        console.log('CSV Export completed:', {
            filename,
            questions: currentData.length,
            size: `${Math.round(csvContent.length / 1024)} KB`,
            headers: headers.length
        });
        
    } catch (error) {
        console.error('CSV Export error:', error);
        showError('Failed to export CSV: ' + error.message);
    }
}

/**
 * Export detailed CSV with one row per answer for more granular analysis
 */
function exportDetailedCSV() {
    if (currentData.length === 0) {
        showError('No data to export');
        return;
    }
    
    try {
        // Define CSV headers for detailed format
        const headers = [
            'Question Number',
            'Question Text',
            'Question Has Image',
            'Total Answers',
            'Answer Index',
            'Answer Text',
            'Is Correct Answer',
            'Answer Has Image',
            'Question Hash',
            'Content Hash',
            'Timestamp',
            'Source URL',
            'Export Date'
        ];
        
        // Convert data to CSV rows (one row per answer)
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        currentData.forEach((question, questionIndex) => {
            // Escape CSV values
            const escapeCSV = (value) => {
                if (value === null || value === undefined) return '';
                const str = String(value);
                if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            };
            
            // Extract question data
            const questionNumber = question.questionNumber || (questionIndex + 1);
            const questionText = question.questionText || question.text || '';
            const questionHasImage = question.hasImage || question.hasQuestionImage || false;
            const answers = question.answers || [];
            const correctAnswers = question.correctAnswers || [];
            const totalAnswers = answers.length;
            
            // Create a row for each answer
            if (answers.length > 0) {
                answers.forEach((answer, answerIndex) => {
                    const isCorrect = correctAnswers[answerIndex] || false;
                    const answerHasImage = (typeof answer === 'string' && answer.includes('[Image')) || false;
                    
                    const row = [
                        escapeCSV(questionNumber),
                        escapeCSV(questionText),
                        escapeCSV(questionHasImage),
                        escapeCSV(totalAnswers),
                        escapeCSV(answerIndex + 1),
                        escapeCSV(answer),
                        escapeCSV(isCorrect),
                        escapeCSV(answerHasImage),
                        escapeCSV(question.questionHash || ''),
                        escapeCSV(question.questionContentHash || ''),
                        escapeCSV(question.timestamp ? new Date(question.timestamp).toISOString() : ''),
                        escapeCSV(question.url || question.sourceUrl || ''),
                        escapeCSV(new Date().toISOString())
                    ];
                    
                    csvRows.push(row.join(','));
                });
            } else {
                // If no answers, create one row for the question
                const row = [
                    escapeCSV(questionNumber),
                    escapeCSV(questionText),
                    escapeCSV(questionHasImage),
                    escapeCSV(0),
                    escapeCSV(''),
                    escapeCSV(''),
                    escapeCSV(false),
                    escapeCSV(false),
                    escapeCSV(question.questionHash || ''),
                    escapeCSV(question.questionContentHash || ''),
                    escapeCSV(question.timestamp ? new Date(question.timestamp).toISOString() : ''),
                    escapeCSV(question.url || question.sourceUrl || ''),
                    escapeCSV(new Date().toISOString())
                ];
                
                csvRows.push(row.join(','));
            }
        });
        
        // Create CSV content
        const csvContent = csvRows.join('\n');
        
        // Create blob and download
        const csvBlob = new Blob([csvContent], { 
            type: 'text/csv;charset=utf-8' 
        });
        
        // Generate descriptive filename
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
        const totalAnswers = currentData.reduce((sum, q) => sum + (q.answers ? q.answers.length : 0), 0);
        const filename = `alx-quiz-detailed-${dateStr}_${timeStr}_${currentData.length}q_${totalAnswers}a.csv`;
        
        // Create download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(csvBlob);
        link.download = filename;
        link.style.display = 'none';
        
        // Add to DOM, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        
        // Show success with details
        showSuccess(`Detailed CSV exported successfully!\nFile: ${filename}\nQuestions: ${currentData.length}\nTotal Answers: ${totalAnswers}\nFormat: One row per answer`);
        
        // Log export for debugging
        console.log('Detailed CSV Export completed:', {
            filename,
            questions: currentData.length,
            totalAnswers: totalAnswers,
            rows: csvRows.length - 1, // -1 for header
            size: `${Math.round(csvContent.length / 1024)} KB`
        });
        
    } catch (error) {
        console.error('Detailed CSV Export error:', error);
        showError('Failed to export detailed CSV: ' + error.message);
    }
}

/**
 * Generate data hash for integrity checking
 */
function generateDataHash(data) {
    try {
        // Create a simplified version for hashing
        const hashData = data.map(q => ({
            questionHash: q.questionHash,
            answersCount: q.answers ? q.answers.length : 0,
            correctCount: q.correctAnswers ? q.correctAnswers.length : 0
        }));
        
        const hashString = JSON.stringify(hashData);
        
        // Simple hash function (djb2 algorithm)
        let hash = 5381;
        for (let i = 0; i < hashString.length; i++) {
            hash = ((hash << 5) + hash) + hashString.charCodeAt(i);
        }
        
        return Math.abs(hash).toString(36);
    } catch (error) {
        console.warn('Failed to generate data hash:', error);
        return 'unknown';
    }
}

/**
 * Import data from JSON file with comprehensive validation
 */
function importData() {
    document.getElementById('fileInput').click();
}

/**
 * Handle file import with validation and error handling
 */
async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        showLoading(true);
        
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.json')) {
            throw new Error('Please select a JSON file');
        }
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            throw new Error(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`);
        }
        
        // Read file content
        const text = await file.text();
        
        // Parse JSON with error handling
        let importObject;
        try {
            importObject = JSON.parse(text);
        } catch (parseError) {
            throw new Error('Invalid JSON file. Please check the file format.');
        }
        
        // Validate import structure
        const validation = validateImportData(importObject);
        if (!validation.isValid) {
            throw new Error(`Invalid file format: ${validation.error}`);
        }
        
        // Extract data based on format version
        let importData;
        if (importObject.data) {
            importData = importObject.data;
        } else if (Array.isArray(importObject)) {
            // Legacy format - array of questions
            importData = importObject;
        } else {
            throw new Error('No question data found in file');
        }
        
        // Validate individual questions
        const validatedData = validateAndCleanQuestions(importData);
        
        if (validatedData.length === 0) {
            throw new Error('No valid questions found in import file');
        }
        
        // Show import preview and confirmation
        const previewInfo = generateImportPreview(importObject, validatedData);
        const confirmMessage = `Import Preview:\n\n${previewInfo}\n\nThis will replace all current data. Continue?`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Perform import
        await performImport(validatedData, importObject);
        
        // Show success with import details
        const successMessage = `Import successful!\n${validatedData.length} questions imported\nFile: ${file.name}`;
        showSuccess(successMessage);
        
        // Refresh display
        await loadAndDisplayData();
        
        // Log import for debugging
        console.log('Import completed:', {
            filename: file.name,
            originalCount: importData.length,
            validCount: validatedData.length,
            fileSize: `${Math.round(file.size / 1024)} KB`
        });
        
    } catch (error) {
        console.error('Import error:', error);
        showError(`Import failed: ${error.message}`);
    } finally {
        // Clear file input and hide loading
        event.target.value = '';
        showLoading(false);
    }
}

/**
 * Validate import data structure
 */
function validateImportData(importObject) {
    try {
        // Check if it's a modern export format
        if (importObject.metadata && importObject.data) {
            // Validate metadata
            if (!importObject.metadata.format || !importObject.metadata.version) {
                return { isValid: false, error: 'Missing metadata information' };
            }
            
            // Check format compatibility
            if (importObject.metadata.format !== 'alx-quiz-helper-data') {
                return { isValid: false, error: 'Incompatible file format' };
            }
            
            // Validate data array
            if (!Array.isArray(importObject.data)) {
                return { isValid: false, error: 'Data section must be an array' };
            }
            
            return { isValid: true };
        }
        
        // Check if it's legacy format (direct array)
        if (Array.isArray(importObject)) {
            return { isValid: true };
        }
        
        // Check if it has data property (older export format)
        if (importObject.data && Array.isArray(importObject.data)) {
            return { isValid: true };
        }
        
        return { isValid: false, error: 'Unrecognized file structure' };
        
    } catch (error) {
        return { isValid: false, error: `Validation error: ${error.message}` };
    }
}

/**
 * Validate and clean individual questions
 */
function validateAndCleanQuestions(questions) {
    const validQuestions = [];
    
    questions.forEach((question, index) => {
        try {
            // Required fields
            if (!question.questionText || typeof question.questionText !== 'string') {
                console.warn(`Question ${index + 1}: Missing or invalid question text`);
                return;
            }
            
            // Clean and validate question
            const cleanQuestion = {
                questionText: question.questionText.trim(),
                questionHTML: question.questionHTML || question.questionText,
                questionHash: question.questionHash || generateQuestionHash(question.questionText),
                answers: [],
                correctAnswers: [],
                timestamp: question.timestamp || Date.now(),
                index: validQuestions.length,
                importedAt: new Date().toISOString()
            };
            
            // Validate answers
            if (question.answers && Array.isArray(question.answers)) {
                question.answers.forEach((answer, answerIndex) => {
                    if (answer && (answer.text || typeof answer === 'string')) {
                        cleanQuestion.answers.push({
                            text: typeof answer === 'string' ? answer : answer.text,
                            index: answerIndex
                        });
                    }
                });
            }
            
            // Validate correct answers
            if (question.correctAnswers && Array.isArray(question.correctAnswers)) {
                cleanQuestion.correctAnswers = question.correctAnswers.filter(index => 
                    typeof index === 'number' && 
                    index >= 0 && 
                    index < cleanQuestion.answers.length
                );
            }
            
            // Only add if we have at least some valid data
            if (cleanQuestion.answers.length > 0) {
                validQuestions.push(cleanQuestion);
            } else {
                console.warn(`Question ${index + 1}: No valid answers found`);
            }
            
        } catch (error) {
            console.warn(`Question ${index + 1}: Validation failed:`, error);
        }
    });
    
    return validQuestions;
}

/**
 * Generate import preview information
 */
function generateImportPreview(importObject, validatedData) {
    const lines = [];
    
    // File information
    if (importObject.metadata) {
        lines.push(`File Format: ${importObject.metadata.format}`);
        lines.push(`Export Date: ${new Date(importObject.metadata.exportDate).toLocaleString()}`);
        lines.push(`Original Questions: ${importObject.metadata.totalQuestions}`);
    }
    
    // Data summary
    lines.push(`Valid Questions: ${validatedData.length}`);
    lines.push(`Total Answers: ${validatedData.reduce((sum, q) => sum + q.answers.length, 0)}`);
    lines.push(`Questions with Correct Answers: ${validatedData.filter(q => q.correctAnswers.length > 0).length}`);
    
    // Current data warning
    if (currentData.length > 0) {
        lines.push(`\n⚠️ This will replace ${currentData.length} existing questions`);
    }
    
    return lines.join('\n');
}

/**
 * Perform the actual import operation
 */
async function performImport(validatedData, importObject) {
    try {
        // Save imported data with timestamp
        await chrome.storage.local.set({
            quiz_corrections_data: validatedData,
            quiz_corrections_timestamp: Date.now(),
            last_import: {
                date: new Date().toISOString(),
                questionCount: validatedData.length,
                source: importObject.metadata ? importObject.metadata.exportDate : 'unknown'
            }
        });
        
        // Update current data reference
        currentData = validatedData;
        filteredData = [...validatedData];
        
    } catch (error) {
        throw new Error(`Failed to save imported data: ${error.message}`);
    }
}

/**
 * Generate question hash for imported questions
 */
function generateQuestionHash(questionText) {
    // Simple hash function for imported questions without hash
    let hash = 5381;
    for (let i = 0; i < questionText.length; i++) {
        hash = ((hash << 5) + hash) + questionText.charCodeAt(i);
    }
    return Math.abs(hash).toString(36);
}

/**
 * Refresh data from storage
 */
function refreshData() {
    if (currentTestKey) {
        // If viewing a specific test, refresh that test's data
        showTestQuestions(currentTestKey);
    } else {
        // If viewing test selection, refresh test list
        loadAndDisplayTests();
    }
    showSuccess('Data refreshed');
}

/**
 * Close edit modal
 */
function closeEditModal() {
    console.log('Closing edit modal...');
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
        editingIndex = -1;
        console.log('Edit modal closed');
    } else {
        console.error('Edit modal element not found');
    }
}

/**
 * Show loading state
 */
function showLoading(show) {
    document.getElementById('loadingState').classList.toggle('hidden', !show);
    
    // Only hide other views when showing loading, not when hiding loading
    if (show) {
        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('testSelectionView').classList.add('hidden');
        document.getElementById('questionTableView').classList.add('hidden');
    }
}

/**
 * Show empty state
 */
function showEmptyState() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('testSelectionView').classList.add('hidden');
    document.getElementById('questionTableView').classList.add('hidden');
}

/**
 * Show table container (for backward compatibility)
 */
function showTableContainer() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('testSelectionView').classList.add('hidden');
    document.getElementById('questionTableView').classList.remove('hidden');
}

/**
 * Show success message
 */
function showSuccess(message) {
    showNotification(message, 'success', 3000);
}

/**
 * Show error message
 */
function showError(message) {
    showNotification(message, 'error', 5000);
}

/**
 * Show notification with type and duration
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    const colors = {
        success: { bg: '#d4edda', border: '#c3e6cb', color: '#155724' },
        error: { bg: '#f8d7da', border: '#f5c6cb', color: '#721c24' },
        info: { bg: '#d1ecf1', border: '#bee5eb', color: '#0c5460' }
    };
    
    const color = colors[type] || colors.info;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10001;
        background: ${color.bg};
        border: 1px solid ${color.border};
        color: ${color.color};
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 400px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
            <div style="flex: 1; white-space: pre-line;">${escapeHtml(message)}</div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                color: ${color.color};
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
                padding: 0;
                margin-left: 10px;
            ">&times;</button>
        </div>
    `;
    
    // Add CSS animation
    if (!document.getElementById('notificationStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationStyles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-dismiss
    if (duration > 0) {
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show modal message
 */
function showModalMessage(message, type) {
    const messageDiv = document.getElementById('modalMessage');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = message;
    
    // Auto-clear after 3 seconds
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 3000);
}

// Handle search on Enter key
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchData();
    }
});

/**
 * Show image modal with full size image
 */
function showImageModal(imageData) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const imageInfo = document.getElementById('imageInfo');
    
    if (modal && modalImage && imageInfo) {
        // Set image source and info
        modalImage.src = imageData.dataURL || imageData.src || '';
        modalImage.alt = imageData.alt || 'Correct Answer Image';
        
        // Set image info
        const infoHTML = `
            <p><strong>Source:</strong> ${escapeHtml(imageData.src || 'Unknown')}</p>
            <p><strong>Dimensions:</strong> ${imageData.width || 'Unknown'}×${imageData.height || 'Unknown'}</p>
            ${imageData.alt ? `<p><strong>Alt Text:</strong> ${escapeHtml(imageData.alt)}</p>` : ''}
        `;
        imageInfo.innerHTML = infoHTML;
        
        // Show modal
        modal.style.display = 'block';
    }
}

/**
 * Close the image modal
 */
function closeImageModal() {
    console.log('Closing image modal...');
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('Image modal closed');
    } else {
        console.error('Image modal element not found');
    }
}