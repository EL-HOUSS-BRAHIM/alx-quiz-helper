/**
 * Enhanced Data Export/Import System
 * Advanced data management capabilities with multiple format support
 */

class ExportManager {
  constructor() {
    this.supportedFormats = ['json', 'csv', 'anki', 'pdf', 'excel'];
    this.exportHistory = [];
  }

  /**
   * Export quiz data to specified format
   */
  async exportData(data, format, options = {}) {
    const exportId = this.generateExportId();
    
    try {
      let result;
      
      switch (format.toLowerCase()) {
        case 'json':
          result = await this.exportToJSON(data, options);
          break;
        case 'csv':
          result = await this.exportToCSV(data, options);
          break;
        case 'anki':
          result = await this.exportToAnki(data, options);
          break;
        case 'pdf':
          result = await this.exportToPDF(data, options);
          break;
        case 'excel':
          result = await this.exportToExcel(data, options);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Record export in history
      this.recordExport(exportId, format, data.length, result.size);
      
      return result;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  /**
   * Export to enhanced JSON format
   */
  async exportToJSON(data, options = {}) {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '2.0',
        totalQuestions: data.length,
        source: 'ALX Quiz Helper',
        options: options
      },
      questions: data.map(question => this.formatQuestionForExport(question)),
      analytics: this.generateAnalytics(data)
    };

    if (options.includeStatistics) {
      exportData.statistics = this.generateStatistics(data);
    }

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    this.downloadBlob(blob, `alx-quiz-data-${this.getDateString()}.json`);
    
    return {
      size: blob.size,
      format: 'json',
      filename: `alx-quiz-data-${this.getDateString()}.json`
    };
  }

  /**
   * Export to CSV format
   */
  async exportToCSV(data, options = {}) {
    const headers = [
      'Question ID',
      'Question Text',
      'Subject',
      'Difficulty',
      'Answer Options',
      'Correct Answers',
      'Explanation',
      'Date Captured',
      'Source Page'
    ];

    let csv = headers.join(',') + '\n';

    data.forEach(question => {
      const row = [
        this.escapeCsvValue(question.questionHash || ''),
        this.escapeCsvValue(question.questionText || ''),
        this.escapeCsvValue(question.subject || 'Unknown'),
        this.escapeCsvValue(question.difficulty || 'Medium'),
        this.escapeCsvValue((question.answerOptions || []).join('; ')),
        this.escapeCsvValue((question.correctAnswerTexts || []).join('; ')),
        this.escapeCsvValue(question.explanation || ''),
        this.escapeCsvValue(question.capturedDate || ''),
        this.escapeCsvValue(question.sourcePage || '')
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    this.downloadBlob(blob, `alx-quiz-data-${this.getDateString()}.csv`);

    return {
      size: blob.size,
      format: 'csv',
      filename: `alx-quiz-data-${this.getDateString()}.csv`
    };
  }

  /**
   * Export to Anki flashcard format
   */
  async exportToAnki(data, options = {}) {
    const ankiData = {
      __type__: "Deck",
      children: [],
      collapsed: false,
      conf: 1,
      desc: "ALX Quiz Questions exported from Quiz Helper",
      dyn: 0,
      extendNew: 0,
      extendRev: 0,
      id: Date.now(),
      lrnToday: [0, 0],
      mod: Math.floor(Date.now() / 1000),
      name: "ALX Quiz Questions",
      newToday: [0, 0],
      revToday: [0, 0],
      timeToday: [0, 0],
      usn: -1
    };

    let ankiText = '';
    
    data.forEach(question => {
      const front = this.cleanTextForAnki(question.questionText || '');
      const back = this.formatAnswersForAnki(question);
      
      // Add tags
      const tags = [
        question.subject || 'general',
        question.difficulty || 'medium',
        'alx-quiz'
      ].join(' ');

      ankiText += `${front}\t${back}\t${tags}\n`;
    });

    const blob = new Blob([ankiText], { type: 'text/plain' });
    this.downloadBlob(blob, `alx-quiz-anki-${this.getDateString()}.txt`);

    return {
      size: blob.size,
      format: 'anki',
      filename: `alx-quiz-anki-${this.getDateString()}.txt`
    };
  }

  /**
   * Export to PDF study guide
   */
  async exportToPDF(data, options = {}) {
    // Create HTML content for PDF
    const htmlContent = this.generatePDFContent(data, options);
    
    // For now, create an HTML file that can be printed to PDF
    const blob = new Blob([htmlContent], { type: 'text/html' });
    this.downloadBlob(blob, `alx-quiz-study-guide-${this.getDateString()}.html`);

    return {
      size: blob.size,
      format: 'pdf',
      filename: `alx-quiz-study-guide-${this.getDateString()}.html`,
      note: 'HTML file created - use browser print to save as PDF'
    };
  }

  /**
   * Export to Excel format (CSV with Excel compatibility)
   */
  async exportToExcel(data, options = {}) {
    // Create Excel-compatible CSV with enhanced formatting
    const csvContent = await this.exportToCSV(data, { ...options, excelCompatible: true });
    
    // Change extension to .xls for Excel recognition
    const filename = `alx-quiz-data-${this.getDateString()}.xls`;
    
    return {
      ...csvContent,
      format: 'excel',
      filename: filename
    };
  }

  /**
   * Import data from various formats
   */
  async importData(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    const text = await this.readFileAsText(file);

    try {
      switch (extension) {
        case 'json':
          return this.importFromJSON(text);
        case 'csv':
          return this.importFromCSV(text);
        default:
          throw new Error(`Import format ${extension} not supported`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  /**
   * Import from JSON
   */
  importFromJSON(jsonText) {
    const data = JSON.parse(jsonText);
    
    // Handle different JSON formats
    if (data.questions) {
      return data.questions; // New format
    } else if (Array.isArray(data)) {
      return data; // Legacy format
    } else {
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Import from CSV
   */
  importFromCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const questions = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = this.parseCSVLine(lines[i]);
        const question = this.csvRowToQuestion(headers, values);
        if (question) {
          questions.push(question);
        }
      }
    }

    return questions;
  }

  /**
   * Helper methods
   */
  formatQuestionForExport(question) {
    return {
      ...question,
      exportDate: new Date().toISOString(),
      version: '2.0'
    };
  }

  generateAnalytics(data) {
    const subjects = {};
    const difficulties = {};
    
    data.forEach(question => {
      const subject = question.subject || 'Unknown';
      const difficulty = question.difficulty || 'Medium';
      
      subjects[subject] = (subjects[subject] || 0) + 1;
      difficulties[difficulty] = (difficulties[difficulty] || 0) + 1;
    });

    return {
      totalQuestions: data.length,
      subjectDistribution: subjects,
      difficultyDistribution: difficulties,
      averageAnswerCount: data.reduce((sum, q) => sum + (q.answerOptions?.length || 0), 0) / data.length
    };
  }

  generateStatistics(data) {
    return {
      creationDate: new Date().toISOString(),
      questionsWithImages: data.filter(q => q.hasImages).length,
      questionsWithExplanations: data.filter(q => q.explanation).length,
      averageQuestionLength: data.reduce((sum, q) => sum + (q.questionText?.length || 0), 0) / data.length
    };
  }

  escapeCsvValue(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    
    return value;
  }

  cleanTextForAnki(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\t/g, ' ')
      .trim();
  }

  formatAnswersForAnki(question) {
    const answers = question.correctAnswerTexts || [];
    const allOptions = question.answerOptions || [];
    
    let ankiBack = '<b>Correct Answer(s):</b><br>';
    answers.forEach(answer => {
      ankiBack += `• ${answer}<br>`;
    });

    if (allOptions.length > 0) {
      ankiBack += '<br><b>All Options:</b><br>';
      allOptions.forEach((option, index) => {
        const isCorrect = answers.includes(option);
        ankiBack += `${String.fromCharCode(65 + index)}. ${option} ${isCorrect ? '✓' : ''}<br>`;
      });
    }

    return ankiBack;
  }

  generatePDFContent(data, options) {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ALX Quiz Study Guide</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .question { margin: 20px 0; page-break-inside: avoid; }
          .question-text { font-weight: bold; margin-bottom: 10px; }
          .answers { margin-left: 20px; }
          .correct { color: green; font-weight: bold; }
          .metadata { color: gray; font-size: 12px; }
          .header { text-align: center; margin-bottom: 30px; }
          @media print { .page-break { page-break-before: always; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ALX Quiz Study Guide</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
          <p>Total Questions: ${data.length}</p>
        </div>
    `;

    data.forEach((question, index) => {
      html += `
        <div class="question">
          <div class="question-text">Q${index + 1}: ${question.questionText || ''}</div>
          <div class="answers">
      `;

      if (question.answerOptions) {
        question.answerOptions.forEach((option, optIndex) => {
          const isCorrect = question.correctAnswerTexts?.includes(option);
          html += `
            <div class="${isCorrect ? 'correct' : ''}">
              ${String.fromCharCode(65 + optIndex)}. ${option} ${isCorrect ? '✓' : ''}
            </div>
          `;
        });
      }

      html += `
          </div>
          <div class="metadata">
            Subject: ${question.subject || 'Unknown'} | 
            Difficulty: ${question.difficulty || 'Medium'}
          </div>
        </div>
      `;
    });

    html += '</body></html>';
    return html;
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(e);
      reader.readAsText(file);
    });
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  csvRowToQuestion(headers, values) {
    const question = {};
    
    headers.forEach((header, index) => {
      if (values[index]) {
        switch (header.toLowerCase()) {
          case 'question id':
            question.questionHash = values[index];
            break;
          case 'question text':
            question.questionText = values[index];
            break;
          case 'subject':
            question.subject = values[index];
            break;
          case 'difficulty':
            question.difficulty = values[index];
            break;
          case 'answer options':
            question.answerOptions = values[index].split('; ');
            break;
          case 'correct answers':
            question.correctAnswerTexts = values[index].split('; ');
            break;
        }
      }
    });
    
    return question.questionText ? question : null;
  }

  generateExportId() {
    return 'export_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getDateString() {
    return new Date().toISOString().split('T')[0];
  }

  recordExport(id, format, questionCount, fileSize) {
    this.exportHistory.push({
      id,
      format,
      questionCount,
      fileSize,
      timestamp: Date.now()
    });
  }

  getExportHistory() {
    return this.exportHistory;
  }
}

// Make available globally
window.ExportManager = ExportManager;
