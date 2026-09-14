/**
 * @fileoverview LexAI — Legal Templates Feature
 * @module       LexAI.Features.Templates
 */

import { $, showToast } from '../ui.js';
import { checkRateLimit, sanitizeTemplateInput, sanitizePromptInput, escapeHtml } from '../security.js';
import { callGemini } from '../api.js';
import { downloadText } from '../utils.js';

const templateFormContainer = $("template-form-container");
const templateFormTitle = $("template-form-title");
const templateFormFields = $("template-form-fields");
const templateOutput = $("template-output");
const backToTemplates = $("back-to-templates");
const generateTemplateBtn = $("generate-template-btn");
const jurisdictionSel = $("jurisdiction-select");

let activeTemplateType = null;
let isLoading = false;

const templateDefs = {
  nda: {
    title: "Non-Disclosure Agreement (NDA)",
    fields: [
      { id: "party1", label: "Disclosing Party (Name / Company)", placeholder: "e.g., Acme Corp" },
      { id: "party2", label: "Receiving Party (Name / Company)", placeholder: "e.g., John Smith / XYZ Ltd" },
      { id: "purpose", label: "Purpose of Disclosure", placeholder: "e.g., Evaluating a potential business partnership" },
      { id: "duration", label: "Confidentiality Duration", placeholder: "e.g., 2 years" },
      { id: "jurisdiction", label: "Governing Law / Jurisdiction", placeholder: "e.g., Maharashtra, India" },
      { id: "date", label: "Agreement Date", placeholder: "e.g., September 14, 2025" }
    ]
  },
  freelance: {
    title: "Freelance Service Agreement",
    fields: [
      { id: "client", label: "Client Name / Company", placeholder: "e.g., ABC Corp" },
      { id: "freelancer", label: "Freelancer Name", placeholder: "e.g., Jane Doe" },
      { id: "services", label: "Services to be Provided", placeholder: "e.g., Website design and development" },
      { id: "payment", label: "Payment Terms", placeholder: "e.g., $3,000 total, 50% upfront, 50% on delivery" },
      { id: "timeline", label: "Project Timeline", placeholder: "e.g., 6 weeks from project start" },
      { id: "jurisdiction", label: "Governing Law", placeholder: "e.g., California, USA" }
    ]
  },
  lease: {
    title: "Residential Lease Agreement",
    fields: [
      { id: "landlord", label: "Landlord Name", placeholder: "e.g., Ramesh Kumar" },
      { id: "tenant", label: "Tenant Name(s)", placeholder: "e.g., Priya Sharma" },
      { id: "property", label: "Property Address", placeholder: "e.g., 42 MG Road, Flat 3B, Mumbai 400001" },
      { id: "rent", label: "Monthly Rent", placeholder: "e.g., ₹25,000 per month" },
      { id: "deposit", label: "Security Deposit", placeholder: "e.g., ₹75,000" },
      { id: "duration", label: "Lease Duration", placeholder: "e.g., 11 months, starting October 1, 2025" }
    ]
  },
  cease: {
    title: "Cease & Desist Letter",
    fields: [
      { id: "sender", label: "Your Name / Company", placeholder: "e.g., Creative Studio Ltd" },
      { id: "recipient", label: "Recipient Name / Company", placeholder: "e.g., John Doe / Copycat Inc" },
      { id: "issue", label: "Describe the Issue", placeholder: "e.g., Unauthorized use of our logo and brand name on their website" },
      { id: "demand", label: "What Action Do You Demand?", placeholder: "e.g., Immediately remove all infringing content and cease all use of our trademark" },
      { id: "deadline", label: "Deadline to Comply", placeholder: "e.g., 14 days from receipt of this letter" },
      { id: "jurisdiction", label: "Jurisdiction", placeholder: "e.g., Delhi, India" }
    ]
  },
  mou: {
    title: "Memorandum of Understanding (MOU)",
    fields: [
      { id: "party1", label: "Party 1 Name / Organization", placeholder: "e.g., Tech Innovators Pvt. Ltd." },
      { id: "party2", label: "Party 2 Name / Organization", placeholder: "e.g., Green Energy Solutions Ltd." },
      { id: "purpose", label: "Purpose of MOU", placeholder: "e.g., Joint development of a solar energy mobile app" },
      { id: "responsibilities", label: "Key Responsibilities (each party)", placeholder: "e.g., Party 1 provides technology; Party 2 provides funding and market access", type: "textarea" },
      { id: "duration", label: "Duration", placeholder: "e.g., 12 months, renewable by mutual consent" },
      { id: "jurisdiction", label: "Jurisdiction", placeholder: "e.g., Karnataka, India" }
    ]
  },
  employment: {
    title: "Employment Contract",
    fields: [
      { id: "employer", label: "Employer / Company Name", placeholder: "e.g., Nexus Technologies Pvt. Ltd." },
      { id: "employee", label: "Employee Full Name", placeholder: "e.g., Rahul Verma" },
      { id: "position", label: "Job Title / Position", placeholder: "e.g., Senior Software Engineer" },
      { id: "salary", label: "Salary / Compensation", placeholder: "e.g., ₹12,00,000 per annum (CTC)" },
      { id: "startdate", label: "Start Date", placeholder: "e.g., October 1, 2025" },
      { id: "noticePeriod", label: "Notice Period", placeholder: "e.g., 30 days" }
    ]
  }
};

export function setup() {
  document.querySelectorAll(".template-card").forEach(card => {
    card.addEventListener("click", () => openTemplateForm(card.dataset.template));
  });

  backToTemplates?.addEventListener("click", () => {
    templateFormContainer.classList.add("hidden");
    document.querySelector(".templates-grid").classList.remove("hidden");
    templateOutput.classList.add("hidden");
    templateOutput.innerHTML = "";
  });

  generateTemplateBtn?.addEventListener("click", generateTemplate);
}

function openTemplateForm(type) {
  const def = templateDefs[type];
  if (!def) return;
  activeTemplateType = type;

  document.querySelector(".templates-grid").classList.add("hidden");
  templateFormContainer.classList.remove("hidden");
  templateFormTitle.textContent = `Customize: ${def.title}`;
  templateOutput.classList.add("hidden");
  templateOutput.innerHTML = "";

  templateFormFields.innerHTML = def.fields.map(f => {
    if (f.type === "textarea") {
      return `<div class="form-group full">
        <label for="tmpl-field-${f.id}">${f.label}</label>
        <textarea id="tmpl-field-${f.id}" placeholder="${f.placeholder}" rows="3"></textarea>
      </div>`;
    }
    return `<div class="form-group">
      <label for="tmpl-field-${f.id}">${f.label}</label>
      <input type="text" id="tmpl-field-${f.id}" placeholder="${f.placeholder}" />
    </div>`;
  }).join("");
}

async function generateTemplate() {
  if (!activeTemplateType || isLoading) return;
  const def = templateDefs[activeTemplateType];

  const values = {};
  def.fields.forEach(f => {
    const el = $(`tmpl-field-${f.id}`);
    const raw = el?.value?.trim() || "";
    values[f.id] = raw ? sanitizeTemplateInput(sanitizePromptInput(raw)) : `[${f.label}]`;
  });

  const jurisdiction = jurisdictionSel.value;
  const fieldSummary = def.fields.map(f => `${f.label}: ${values[f.id]}`).join("\n");

  const rl = checkRateLimit("template");
  if (!rl.allowed) { showToast("Too many generation requests. Please wait a moment.", "error"); return; }

  isLoading = true;
  generateTemplateBtn.disabled = true;
  generateTemplateBtn.innerHTML = `<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;"></div> Generating...`;

  const prompt = `Generate a professional, legally structured ${def.title} for ${jurisdiction}.

Details:
${fieldSummary}

Requirements:
- Use formal legal language
- Include all standard clauses for this document type
- Include signature blocks for all parties
- Include date lines
- Clearly mark any sections that may need customization with [CUSTOMIZE: ...]
- Add standard legal boilerplate for ${jurisdiction}
- Make it ready to use as a starting template

Format as a clean, professional document. Use proper legal formatting.`;

  try {
    const aiText = await callGemini(
      `You are an expert legal document drafter specializing in ${jurisdiction} law. Generate professional, comprehensive legal document templates.`,
      prompt
    );

    templateOutput.classList.remove("hidden");
    templateOutput.innerHTML = escapeHtml(aiText);

    document.querySelectorAll(".template-output-actions").forEach(el => el.remove());

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "template-output-actions";
    actionsDiv.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="copy-template-btn" aria-label="Copy template to clipboard">📋 Copy to Clipboard</button>
      <button class="btn btn-ghost btn-sm" id="download-template-btn" aria-label="Download template as text file">⬇️ Download .txt</button>`;
    templateOutput.parentNode.insertBefore(actionsDiv, templateOutput.nextSibling);

    $("copy-template-btn")?.addEventListener("click", () => {
      navigator.clipboard.writeText(aiText).then(() => showToast("Template copied!", "success"));
    });
    $("download-template-btn")?.addEventListener("click", () => {
      downloadText(aiText, `${activeTemplateType}-template.txt`);
    });

    templateOutput.scrollIntoView({ behavior: "smooth", block: "nearest" });
    showToast("Template generated!", "success");
  } catch (err) {
    if (err.message === "API_KEY_MISSING" || err.message === "API_KEY_INVALID") {
      showToast("API Key is missing or invalid. Refresh to enter key.", "error");
    } else {
      showToast("Generation failed: " + err.message, "error");
    }
  } finally {
    isLoading = false;
    generateTemplateBtn.disabled = false;
    generateTemplateBtn.innerHTML = "✨ Generate Document";
  }
}
