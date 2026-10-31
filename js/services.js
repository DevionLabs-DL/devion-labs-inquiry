/**
 * Service definitions and question templates.
 *
 * To add a service: append an entry to SERVICES with a new stable `id`.
 * To add a question: append to that service's `questions`. No engine changes needed.
 *
 * Stable identifiers: service `id`, question `id` and option `id` are persisted in
 * submissions. Never rename them once live — add new ones and retire old ones.
 *
 * Question shape:
 *   { id, type: 'radio'|'checkbox'|'select'|'text'|'textarea'|'url',
 *     label, required?, options?: [{id,label}], help?, maxLength?,
 *     showIf?: { question: '<questionId in same service>', equals?: '<optionId>', includes?: '<optionId>' } }
 */

const opt = (id, label) => Object.freeze({ id, label });
const deepFreeze = (obj) => {
  Object.values(obj).forEach((v) => {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  });
  return Object.freeze(obj);
};

const otherFollowUp = (questionId, label = 'Please specify') => ({
  id: `${questionId}_other`,
  type: 'text',
  label,
  required: true,
  showIf: { question: questionId, includes: 'other' },
});

export const SERVICES = deepFreeze([
  {
    id: 'webshop',
    title: 'Webshop / E-commerce',
    description:
      'Online stores, product management, payment systems, shipping integrations, and e-commerce solutions.',
    icon: 'cart',
    questions: [
      {
        id: 'project_type',
        type: 'radio',
        label: 'What type of webshop project do you need?',
        required: true,
        options: [
          opt('new', 'Build a new webshop'),
          opt('redesign', 'Redesign an existing webshop'),
          opt('add-features', 'Add features to an existing webshop'),
          opt('migrate', 'Migrate to another platform'),
          opt('advice', 'Not sure / Need advice'),
        ],
      },
      {
        id: 'product_count',
        type: 'radio',
        label: 'Approximately how many products will the webshop have?',
        required: true,
        options: [
          opt('lt-50', 'Fewer than 50'),
          opt('50-500', '50–500'),
          opt('gt-500', 'More than 500'),
          opt('not-sure', 'Not sure'),
        ],
      },
      {
        id: 'features',
        type: 'checkbox',
        label: 'Which features or integrations do you need?',
        required: true,
        options: [
          opt('payments', 'Online payments'),
          opt('shipping', 'Shipping integrations'),
          opt('inventory', 'Inventory management'),
          opt('accounts', 'Customer accounts'),
          opt('promotions', 'Discount codes / Promotions'),
          opt('erp-crm', 'ERP / CRM integrations'),
          opt('marketplaces', 'Marketplace integrations'),
          opt('not-sure', 'Not sure yet'),
        ],
      },
      {
        id: 'platform',
        type: 'radio',
        label: 'Do you have a preferred platform?',
        required: true,
        options: [
          opt('shopify', 'Shopify'),
          opt('woocommerce', 'WooCommerce'),
          opt('custom', 'Custom-built solution'),
          opt('other', 'Other'),
          opt('advice', 'Need advice'),
        ],
      },
      otherFollowUp('platform', 'Which platform?'),
    ],
  },
  {
    id: 'microservice',
    title: 'Microservice / API',
    description:
      'Backend services, APIs, distributed systems, and integration between applications.',
    icon: 'api',
    questions: [
      {
        id: 'needs',
        type: 'checkbox',
        label: 'What do you need?',
        required: true,
        options: [
          opt('new-service', 'New microservice'),
          opt('api', 'REST / GraphQL API'),
          opt('integration', 'Integration between existing systems'),
          opt('refactor', 'Refactoring an existing service'),
          opt('performance', 'Performance improvements'),
          opt('scalability', 'Scalability improvements'),
          opt('other', 'Other'),
        ],
      },
      otherFollowUp('needs'),
      {
        id: 'existing_backend',
        type: 'radio',
        label: 'Do you currently have an existing backend?',
        required: true,
        options: [opt('yes', 'Yes'), opt('no', 'No'), opt('not-sure', 'Not sure')],
      },
      {
        id: 'hosting',
        type: 'radio',
        label: 'Where is your infrastructure hosted?',
        required: true,
        options: [
          opt('cloud', 'Cloud'),
          opt('on-prem', 'On-premises'),
          opt('hybrid', 'Hybrid'),
          opt('not-sure', 'Not sure'),
        ],
      },
      {
        id: 'technologies',
        type: 'textarea',
        label: 'Which technologies or systems are involved?',
        required: false,
        help: 'For example: languages, frameworks, databases, third-party services.',
      },
    ],
  },
  {
    id: 'website',
    title: 'Landing Page / Website',
    description: 'Landing pages, company websites, redesigns, and content-managed websites.',
    icon: 'browser',
    questions: [
      {
        id: 'site_type',
        type: 'radio',
        label: 'What type of website do you need?',
        required: true,
        options: [
          opt('landing', 'Landing page'),
          opt('company', 'Company website'),
          opt('multi-page', 'Multi-page website'),
          opt('redesign', 'Existing website redesign'),
          opt('not-sure', 'Not sure'),
        ],
      },
      {
        id: 'branding',
        type: 'radio',
        label: 'Do you have branding or design materials?',
        required: true,
        options: [
          opt('ready', 'Yes, everything is ready'),
          opt('partial', 'Partially'),
          opt('needed', 'No, design is needed'),
        ],
      },
      {
        id: 'cms',
        type: 'radio',
        label: 'Do you need a content management system?',
        required: true,
        options: [opt('yes', 'Yes'), opt('no', 'No'), opt('not-sure', 'Not sure')],
      },
      {
        id: 'domain_hosting',
        type: 'radio',
        label: 'Do you already have a domain and hosting?',
        required: true,
        options: [
          opt('both', 'Both'),
          opt('domain-only', 'Domain only'),
          opt('hosting-only', 'Hosting only'),
          opt('neither', 'Neither'),
          opt('not-sure', 'Not sure'),
        ],
      },
    ],
  },
  {
    id: 'code-review',
    title: 'Code Review / Vibe Code Revision',
    description:
      'Technical audits, AI-generated code reviews, security checks, refactoring, and performance improvements.',
    icon: 'review',
    questions: [
      {
        id: 'origin',
        type: 'radio',
        label: 'How was the software developed?',
        required: true,
        options: [
          opt('ai', 'AI-assisted / Vibe coded'),
          opt('traditional', 'Traditional software development'),
          opt('both', 'Combination of both'),
          opt('not-sure', 'Not sure'),
        ],
      },
      {
        id: 'scope',
        type: 'checkbox',
        label: 'What needs reviewing?',
        required: true,
        options: [
          opt('security', 'Security'),
          opt('quality', 'Code quality'),
          opt('architecture', 'Architecture'),
          opt('performance', 'Performance'),
          opt('scalability', 'Scalability'),
          opt('maintainability', 'Maintainability'),
          opt('full-audit', 'Complete technical audit'),
          opt('other', 'Other'),
        ],
      },
      otherFollowUp('scope'),
      {
        id: 'source_access',
        type: 'radio',
        label: 'Do you have access to the source code?',
        required: true,
        options: [opt('yes', 'Yes'), opt('partial', 'Partially'), opt('no', 'No')],
      },
      {
        id: 'stage',
        type: 'radio',
        label: 'What stage is the application currently in?',
        required: true,
        options: [
          opt('prototype', 'Prototype'),
          opt('in-development', 'Under development'),
          opt('production', 'Already in production'),
          opt('not-sure', 'Not sure'),
        ],
      },
      {
        id: 'repository_url',
        type: 'url',
        label: 'Project or repository URL',
        required: false,
        help: 'A public link only. Please do not share passwords, access tokens or private credentials.',
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations / Maintenance',
    description: 'Hosting, deployment, monitoring, technical maintenance, and ongoing support.',
    icon: 'gear',
    questions: [
      {
        id: 'assistance',
        type: 'checkbox',
        label: 'What type of assistance do you need?',
        required: true,
        options: [
          opt('hosting', 'Hosting'),
          opt('deployment', 'Deployment'),
          opt('monitoring', 'Monitoring'),
          opt('troubleshooting', 'Troubleshooting'),
          opt('app-maintenance', 'Application maintenance'),
          opt('infra-maintenance', 'Infrastructure maintenance'),
          opt('support', 'Ongoing technical support'),
        ],
      },
      {
        id: 'live',
        type: 'radio',
        label: 'Is the application currently live?',
        required: true,
        options: [opt('yes', 'Yes'), opt('no', 'No'), opt('in-development', 'In development')],
      },
      {
        id: 'environment',
        type: 'radio',
        label: 'What hosting environment do you use?',
        required: true,
        options: [
          opt('cloud', 'Cloud hosting'),
          opt('traditional', 'Traditional web hosting'),
          opt('on-prem', 'On-premises'),
          opt('not-sure', 'Not sure'),
        ],
      },
      {
        id: 'support_type',
        type: 'radio',
        label: 'What type of support are you looking for?',
        required: true,
        options: [
          opt('one-time', 'One-time assistance'),
          opt('regular', 'Regular maintenance'),
          opt('long-term', 'Long-term support'),
          opt('advice', 'Need advice'),
        ],
      },
    ],
  },
  {
    id: 'custom-software',
    title: 'Custom Software / Application',
    description:
      'Custom web applications, mobile applications, desktop software, and internal business tools.',
    icon: 'app',
    questions: [
      {
        id: 'app_type',
        type: 'checkbox',
        label: 'What kind of application do you need?',
        required: true,
        options: [
          opt('web', 'Web application'),
          opt('mobile', 'Mobile application'),
          opt('desktop', 'Desktop application'),
          opt('internal', 'Internal business tool'),
          opt('customer-facing', 'Customer-facing application'),
          opt('other', 'Other'),
        ],
      },
      otherFollowUp('app_type'),
      {
        id: 'stage',
        type: 'radio',
        label: 'What stage is your project in?',
        required: true,
        options: [
          opt('idea', 'Idea'),
          opt('planning', 'Planning'),
          opt('prototype', 'Prototype'),
          opt('existing', 'Existing application'),
        ],
      },
      {
        id: 'specification',
        type: 'radio',
        label: 'Do you already have a specification?',
        required: true,
        options: [opt('yes', 'Yes'), opt('partial', 'Partially'), opt('no', 'No')],
      },
      {
        id: 'users',
        type: 'checkbox',
        label: 'Who will use the application?',
        required: true,
        options: [
          opt('employees', 'Internal employees'),
          opt('customers', 'Customers'),
          opt('partners', 'Business partners'),
          opt('public', 'General public'),
          opt('other', 'Other'),
        ],
      },
      otherFollowUp('users'),
    ],
  },
  {
    id: 'automation',
    title: 'Automation / AI',
    description:
      'Business process automation, AI assistants, AI agents, data processing, and system integrations.',
    icon: 'spark',
    questions: [
      {
        id: 'targets',
        type: 'checkbox',
        label: 'What would you like to automate?',
        required: true,
        options: [
          opt('workflows', 'Manual business workflows'),
          opt('data', 'Data processing'),
          opt('reports', 'Reports and notifications'),
          opt('assistant', 'AI assistant / Chatbot'),
          opt('agent', 'AI agent'),
          opt('integration', 'Integration between applications'),
          opt('other', 'Other'),
        ],
      },
      otherFollowUp('targets'),
      {
        id: 'systems',
        type: 'checkbox',
        label: 'Which systems need to be integrated?',
        required: true,
        options: [
          opt('crm', 'CRM'),
          opt('erp', 'ERP'),
          opt('google', 'Google Workspace'),
          opt('m365', 'Microsoft 365'),
          opt('custom-apps', 'Existing custom applications'),
          opt('other', 'Other'),
          opt('not-sure', 'Not sure'),
        ],
      },
      otherFollowUp('systems'),
      {
        id: 'approach',
        type: 'radio',
        label: 'What type of automation would you prefer?',
        required: true,
        options: [
          opt('rule-based', 'Rule-based'),
          opt('ai-driven', 'AI-driven'),
          opt('combination', 'Combination'),
          opt('advice', 'Need advice'),
        ],
      },
      {
        id: 'frequency',
        type: 'radio',
        label: 'How often should it run?',
        required: true,
        options: [
          opt('on-demand', 'On demand'),
          opt('scheduled', 'Scheduled'),
          opt('event-driven', 'Event-driven'),
          opt('real-time', 'Real time'),
          opt('not-sure', 'Not sure'),
        ],
      },
    ],
  },
]);

/** Shared project questions — shown once regardless of selected services. */
export const COMMON_QUESTIONS = deepFreeze([
  {
    id: 'description',
    type: 'textarea',
    label: 'Briefly describe your project or idea.',
    required: true,
  },
  {
    id: 'objective',
    type: 'textarea',
    label: 'What problem are you trying to solve, or what would you like to achieve?',
    required: true,
  },
  {
    id: 'status',
    type: 'radio',
    label: 'Project status',
    required: false,
    options: [
      opt('new', 'New project'),
      opt('improve', 'Existing project requiring improvements'),
      opt('maintain', 'Existing project requiring maintenance'),
      opt('exploring', 'Still exploring possibilities'),
    ],
  },
  {
    id: 'timeline',
    type: 'radio',
    label: 'Desired timeline',
    required: false,
    options: [
      opt('asap', 'As soon as possible'),
      opt('1-month', 'Within 1 month'),
      opt('1-3-months', 'Within 1–3 months'),
      opt('3-6-months', 'Within 3–6 months'),
      opt('flexible', 'Flexible / Just exploring'),
    ],
  },
  {
    id: 'budget',
    type: 'select',
    label: 'Approximate budget',
    required: false,
    optionsFrom: 'budgetRanges',
  },
  {
    id: 'existing_url',
    type: 'url',
    label: 'Existing project URL',
    required: false,
  },
  {
    id: 'additional',
    type: 'textarea',
    label: 'Additional requirements',
    required: false,
  },
]);

export function getService(serviceId) {
  return SERVICES.find((s) => s.id === serviceId) || null;
}

/** Resolve an option label; falls back to the raw id for unknown values. */
export function optionLabel(question, optionId, config) {
  const options = resolveOptions(question, config);
  const found = options.find((o) => o.id === optionId);
  return found ? found.label : String(optionId);
}

export function resolveOptions(question, config) {
  if (question.options) return question.options;
  if (question.optionsFrom && config && config[question.optionsFrom]) {
    return config[question.optionsFrom];
  }
  return [];
}
