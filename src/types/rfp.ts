export type { QuestionStatus } from "./question";
export type { Question as RFPQuestion } from "./question";

import type { Question as RFPQuestion } from "./question";
import type { QuestionStatus } from "./question";

const QUESTION_TEMPLATES = [
  {
    question: "Please provide an overview of your company's background, including years of operation, market presence, and core areas of expertise.",
    answer:
      "Our company has been operating for over 15 years in the enterprise technology sector, with a strong market presence across Southeast Asia. We specialize in digital transformation solutions, cloud infrastructure, and AI-driven automation platforms. Our team of 500+ professionals serves over 200 enterprise clients across banking, insurance, and government sectors.",
  },
  {
    question: "Describe your data security measures and compliance certifications (e.g., ISO 27001, SOC 2, GDPR).",
    answer:
      "We maintain ISO 27001:2022 certification and SOC 2 Type II compliance. Our infrastructure employs AES-256 encryption at rest and TLS 1.3 in transit. We conduct annual penetration testing and maintain a 24/7 Security Operations Center. All data processing complies with GDPR and local data protection regulations, with data residency options available.",
  },
  {
    question: "How does your solution scale to handle increasing transaction volumes and user loads?",
    answer:
      "Our platform is built on a microservices architecture with horizontal auto-scaling capabilities. We support load balancing across multiple availability zones and can handle up to 10,000 concurrent transactions per second. Our Kubernetes-based infrastructure automatically provisions additional resources based on demand, with zero-downtime deployments.",
  },
  {
    question: "What Service Level Agreement (SLA) guarantees do you provide for system uptime and response times?",
    answer:
      "We guarantee 99.95% uptime SLA with planned maintenance windows communicated 72 hours in advance. API response times are guaranteed under 200ms at the 95th percentile. We offer tiered SLA packages: Standard (99.9%), Premium (99.95%), and Enterprise (99.99%), each with corresponding penalty clauses for SLA breaches.",
  },
  {
    question: "Describe your integration capabilities with existing enterprise systems (ERP, CRM, HRIS).",
    answer:
      "We provide pre-built connectors for SAP, Oracle, Salesforce, Microsoft Dynamics, and Workday. Our REST API and webhook infrastructure support custom integrations with any system. We offer an Integration Development Kit (IDK) and dedicated integration engineering support. Average integration timeline is 4-6 weeks for standard connectors.",
  },
  {
    question: "What is your pricing model and are there volume-based discounts available?",
    answer:
      "Our pricing follows a subscription model based on active users and transaction volume. Base tier starts at $5,000/month for up to 100 users. Volume discounts apply: 15% for 100-500 users, 25% for 500-1000 users, and custom enterprise pricing above 1000 users. Annual commitments receive an additional 10% discount.",
  },
  {
    question: "Outline your implementation timeline and project methodology.",
    answer:
      "Standard implementation follows our proven 12-week methodology: Discovery (Weeks 1-2), Configuration (Weeks 3-5), Integration (Weeks 6-8), Testing & UAT (Weeks 9-10), Go-Live & Hypercare (Weeks 11-12). We assign a dedicated Project Manager and Solution Architect throughout the engagement.",
  },
  {
    question: "What support structure do you provide post-implementation (tiers, channels, response times)?",
    answer:
      "We offer three support tiers: Essential (business hours email, 8hr response), Professional (extended hours email+chat, 4hr response), and Enterprise (24/7 email+chat+phone, 1hr response). All tiers include access to our knowledge base, community forums, and quarterly business reviews.",
  },
  {
    question: "Describe your disaster recovery and business continuity planning.",
    answer:
      "Our DR strategy includes real-time data replication across geographically separated data centers with an RPO of 15 minutes and RTO of 1 hour. We maintain hot standby environments and conduct quarterly DR drills. Full system backups are performed daily with 90-day retention. Our BCP is audited annually by independent third parties.",
  },
  {
    question: "What customization options are available to tailor the platform to our specific workflows?",
    answer:
      "The platform supports extensive customization through our low-code workflow builder, custom form designer, and rule engine. UI themes, email templates, and notification rules are fully configurable. For advanced needs, we offer a scripting engine and custom development services with our Professional Services team.",
  },
  {
    question: "What training and change management resources do you provide for user adoption?",
    answer:
      "We provide a comprehensive training program including on-site workshops (2-3 days), live virtual training sessions, on-demand video library with 200+ tutorials, and certification programs. Our change management toolkit includes communication templates, stakeholder engagement guides, and adoption metrics dashboards.",
  },
  {
    question: "How do you handle software updates, versioning, and backward compatibility?",
    answer:
      "We release major updates quarterly and minor patches bi-weekly. All updates go through staged rollout: internal testing, beta program, then general availability. We maintain backward compatibility for at least two major versions. Breaking changes are communicated 6 months in advance with migration guides and dedicated support.",
  },
  {
    question: "Provide details on your reporting and analytics capabilities.",
    answer:
      "Our analytics module includes real-time dashboards, custom report builder, and scheduled report distribution. We support data export in CSV, Excel, PDF, and API formats. The platform includes 50+ pre-built report templates and supports integration with BI tools like Tableau, Power BI, and Looker via our data export API.",
  },
  {
    question: "What is your approach to handling sensitive personal data and privacy regulations?",
    answer:
      "We implement privacy-by-design principles with built-in data classification, consent management, and data subject request workflows. Our platform supports data anonymization and pseudonymization. We maintain a Data Protection Officer and conduct regular DPIAs. Compliance with PDPA, GDPR, and sector-specific regulations is continuously monitored.",
  },
  {
    question: "Describe your vendor management and sub-processor practices.",
    answer:
      "All sub-processors undergo rigorous security assessment and are bound by DPAs with equivalent data protection obligations. We maintain a publicly available sub-processor list with 30-day advance notification of changes. Annual audits of sub-processor compliance are conducted, with results available upon request.",
  },
];

export const MOCK_RFP_QUESTIONS: RFPQuestion[] = Array.from(
  { length: 150 },
  (_, i) => {
    const template = QUESTION_TEMPLATES[i % QUESTION_TEMPLATES.length];
    return {
      id: `q-${String(i + 1).padStart(3, "0")}`,
      number: i + 1,
      question: template.question,
      answer: template.answer,
      originalAnswer: template.answer,
      status: "completed" as QuestionStatus,
    };
  }
);
