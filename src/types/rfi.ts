export type { QuestionStatus } from "./question";
export type { Question as RFIQuestion } from "./question";

import type { Question as RFIQuestion } from "./question";
import type { QuestionStatus } from "./question";

const RFI_QUESTION_TEMPLATES = [
  {
    question: "Provide a brief overview of your organization, including founding year, headquarters location, ownership structure, and total number of employees worldwide.",
    answer:
      "Founded in 2008, we are headquartered in Singapore with additional regional offices in Jakarta, Kuala Lumpur, and Bangkok. The company is privately held with a dual-shareholder structure. We currently employ 1,200 professionals across all locations, with plans to expand to 1,500 by end of fiscal year 2027.",
  },
  {
    question: "Please share your organization's most recent audited financial statements or annual revenue figures for the past three fiscal years.",
    answer:
      "Our audited financials demonstrate consistent growth: FY2024 revenue of $85M (18% YoY growth), FY2023 revenue of $72M, and FY2022 revenue of $61M. EBITDA margins have maintained above 22% across all three years. We maintain a strong balance sheet with a current ratio of 2.4x and zero long-term debt. Our auditors (Big Four) have issued unqualified opinions for all periods.",
  },
  {
    question: "List all countries and regions where your organization maintains offices, data centers, or significant operational presence.",
    answer:
      "We maintain a physical presence in 12 countries across 4 continents: Singapore (HQ), Indonesia, Malaysia, Thailand, Philippines, Vietnam (Southeast Asia); Japan, South Korea (East Asia); United Kingdom, Germany (Europe); United Arab Emirates (Middle East); and United States (North America). Our data centers are located in Singapore, Tokyo, Frankfurt, and Virginia, with edge nodes in 8 additional locations.",
  },
  {
    question: "Describe your organization's sustainability initiatives, carbon reduction targets, and any ESG certifications or commitments.",
    answer:
      "We have committed to Science Based Targets initiative (SBTi) with a goal of 50% absolute emissions reduction by 2030 from a 2022 baseline. Our initiatives include 100% renewable energy procurement for all owned facilities (achieved 2024), carbon-neutral business travel offset program, and circular economy principles for hardware lifecycle. We publish an annual GRI Standards sustainability report and maintain ISO 14001 Environmental Management certification.",
  },
  {
    question: "Detail the regulatory frameworks and industry standards your organization complies with across your operating jurisdictions.",
    answer:
      "We maintain compliance with MAS Technology Risk Management Guidelines (Singapore), OJK regulations (Indonesia), Bank of Thailand IT standards, PDPA/GDPR/LGPD data protection frameworks, and PCI DSS Level 1 for payment processing. Industry certifications include ISO 27001, ISO 22301 (Business Continuity), SOC 2 Type II, and CSA STAR Level 2 for cloud security. We undergo annual regulatory examinations in each operating jurisdiction.",
  },
  {
    question: "Outline your organization's approach to technology investment, R&D spending as a percentage of revenue, and recent innovation milestones.",
    answer:
      "We invest approximately 15% of annual revenue in R&D, focusing on AI/ML capabilities, cloud-native architectures, and cybersecurity. Recent milestones include the launch of our proprietary AI document processing engine (Q2 2025), achieving 99.99% platform availability through our next-generation cloud infrastructure (Q4 2025), and filing 8 patents in areas of NLP and automated compliance monitoring. Our engineering team comprises 40% of total headcount.",
  },
  {
    question: "Provide information on your diversity, equity, and inclusion programs, workforce demographics, and any third-party DEI certifications.",
    answer:
      "Our global workforce comprises 42% women, with 35% representation in leadership positions (VP and above). We maintain active Employee Resource Groups for Women in Tech, LGBTQ+ Alliance, and Neurodiversity Network. Programs include blind resume screening, mandatory unconscious bias training, and annual pay equity audits. We have achieved EDGE Move certification and participate in the UN Women's Empowerment Principles. Our target is 50% women in leadership by 2030.",
  },
  {
    question: "List three to five representative client engagements from the past two years, including project scope, industry, and key outcomes.",
    answer:
      "1) Top-tier Southeast Asian bank: Digital transformation across 3 business units, 18-month engagement, resulting in 40% reduction in manual processing time. 2) National insurance provider: Claims automation platform, 12-month implementation, achieving 65% straight-through processing rate. 3) Government regulatory body: Compliance monitoring system, 24-month project, enabling real-time surveillance of 50,000+ regulated entities. 4) Multinational logistics firm: Supply chain visibility platform, 9-month deployment, improving on-time delivery by 28%. 5) Regional healthcare network: Patient data integration across 15 facilities, achieving HIPAA-compliant unified records system.",
  },
  {
    question: "Detail your current insurance coverage including professional liability, cyber liability, and general commercial liability limits.",
    answer:
      "We maintain Professional Indemnity Insurance with $20M per claim / $50M aggregate coverage through a AA-rated global insurer. Cyber Liability Insurance covers $25M per incident including data breach costs, business interruption, and regulatory fines. General Commercial Liability is $10M per occurrence / $25M aggregate. Directors & Officers Insurance provides $15M coverage. All policies are renewed annually with coverage verified by our broker (Marsh). Certificates of insurance are available upon request.",
  },
  {
    question: "Describe your data governance framework, including data classification policies, retention schedules, and breach notification procedures.",
    answer:
      "Our data governance framework classifies information into four tiers: Public, Internal, Confidential, and Restricted — each with defined handling, storage, and access controls. Retention schedules align with regulatory requirements: financial records (7 years), employee data (duration of employment + 5 years), customer data (contract duration + 3 years). Breach notification follows a 72-hour internal escalation protocol with external notification to regulators within mandated timeframes (GDPR: 72 hours, PDPA: immediately upon assessment). We conduct quarterly data governance reviews and maintain a dedicated Data Protection Office with regional DPOs.",
  },
];

export const MOCK_RFI_QUESTIONS: RFIQuestion[] = Array.from(
  { length: 100 },
  (_, i) => {
    const template = RFI_QUESTION_TEMPLATES[i % RFI_QUESTION_TEMPLATES.length];
    return {
      id: `rq-${String(i + 1).padStart(3, "0")}`,
      number: i + 1,
      question: template.question,
      answer: template.answer,
      originalAnswer: template.answer,
      status: "completed" as QuestionStatus,
    };
  }
);
