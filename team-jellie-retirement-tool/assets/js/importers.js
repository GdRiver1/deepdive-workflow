(function (window) {
  'use strict';

  function currencyFromText(text) {
    const matches = text.match(/\$?\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/g) || [];
    return matches.map((m) => Number(String(m).replace(/[^0-9.]/g, ''))).filter(Boolean);
  }

  function findLabelValue(text, labelRegex) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (labelRegex.test(line)) {
        const values = currencyFromText(line);
        if (values.length) return values[values.length - 1];
      }
    }
    return null;
  }

  function parseDetectedFields(text) {
    return {
      roth: findLabelValue(text, /(roth|roth ira)/i),
      traditional: findLabelValue(text, /(traditional|ira|403\(b\)|401\(k\))/i),
      taxable: findLabelValue(text, /(brokerage|taxable|investment account)/i),
      hsa: findLabelValue(text, /(hsa|health savings)/i),
      mortgagePayment: findLabelValue(text, /(mortgage|principal|escrow payment)/i),
      helocPayment: findLabelValue(text, /(heloc|home equity line)/i),
      socialSecurityMonthly: findLabelValue(text, /(social security|ssa)/i)
    };
  }

  async function extractTextFromPdf(file) {
    if (!window.pdfjsLib) {
      throw new Error('pdf.js failed to load. Check internet connection or CDN restrictions.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((it) => it.str).join(' ') + '\n';
    }
    return fullText;
  }

  async function extractTextFromImage(file) {
    if (!window.Tesseract) {
      throw new Error('OCR engine failed to load. You can still type values manually.');
    }
    const result = await window.Tesseract.recognize(file, 'eng');
    return result.data.text || '';
  }

  async function ingestStatement(file) {
    try {
      let text = '';
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractTextFromPdf(file);
      } else if (file.type.startsWith('image/')) {
        text = await extractTextFromImage(file);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or image screenshot.');
      }

      if (!text || text.trim().length < 20) {
        return { success: false, error: 'We could not reliably read text from the file.', help: fallbackHelp() };
      }
      return { success: true, detected: parseDetectedFields(text), rawTextPreview: text.slice(0, 1000) };
    } catch (error) {
      return { success: false, error: error.message, help: fallbackHelp() };
    }
  }

  function fallbackHelp() {
    return [
      'Try a clearer first page that includes account names and balances.',
      'For images, avoid glare and crop tightly around the table values.',
      'If parsing still fails, use manual entry and save a scenario snapshot.'
    ];
  }

  window.TeamJellieImporters = { ingestStatement, parseDetectedFields };
})(window);
