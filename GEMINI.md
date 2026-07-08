# gemini.md: The 4-Track Architect’s Technical Manual

## 1. Domain Foundations & Core Competencies
* **Data Analyst:** Focuses on **Descriptive & Diagnostic** insights. Mastery requires: SQL (Joins/Window Functions), Statistics (Hypothesis Testing/P-values), and Visualization (Tableau/Power BI).
* **Data Engineer:** Focuses on **Infrastructure & Reliability**. Mastery requires: ELT/ETL (Airflow/dbt), Distributed Systems (Spark/Hadoop), Data Quality (Data Contracts), and Cloud Infrastructure (AWS/GCP/Azure).
* **Python for Data Analysis:** Focuses on **Transformation**. Mastery requires: Data structures (NumPy/Pandas), Vectorization, Handling Outliers, and EDA (Exploratory Data Analysis).
* **AI & Data Scientist:** Focuses on **Prediction**. Mastery requires: Linear Algebra/Calculus, ML algorithms (Supervised/Unsupervised), Deep Learning (Transformers/CNNs), and MLOps lifecycle.
* **AI Engineer:** Focuses on **Application Integration**. Mastery requires: LLM Inference, Prompt Engineering, RAG (Vector DBs: Pinecone/Chroma), and AI Agents (LangChain/AutoGPT).
* **Full Stack:** Focuses on **End-to-End Delivery**. Mastery requires: REST/GraphQL API design, Server-side logic (Node/Python), and CI/CD (GitHub Actions/Jenkins).
* **React:** Focuses on **User Experience**. Mastery requires: Hooks (useState/useEffect/useMemo), State Management (Zustand/Redux), Routing, and Next.js (SSR/ISR).
* **Cyber Security:** Focuses on **Trust**. Mastery requires: CIA Triad, Networking (OSI Model), Cryptography (AES/RSA/Hashing), Threat Modeling (OWASP Top 10), and Governance (GDPR/HIPAA).
* **UX Design:** Focuses on **Cognitive Science**. Mastery requires: User Research (Personas/Jobs-to-be-Done), Prototyping (Figma), Flowcharting, and A/B Testing.



## 2. The Architectural SOP (Standard Operating Procedure)
When you present a feature, process it through these **4 mandatory layers**:

* **Layer I: System & UX Architecture:** Prioritize "Mobile-First" and "Accessibility (WCAG)." Evaluate component nesting depth and API latency.
* **Layer II: Data & AI Pipeline:** Implement "Data Lineage." Evaluate Vector Database indexing and model inference cost/performance.
* **Layer III: Security & Integrity:** Implement "Security-by-Design."
    * **Confidentiality:** Are PII/PHI (Medical Data) encrypted at rest and in transit?
    * **Integrity:** Use Row Level Security (RLS).
    * **Availability:** Enable rate-limiting and circuit-breaking.
* **Layer IV: Implementation & Optimization:** Code must be "Clean," "Modular," and "Testable." Apply DRY principles and O(n) complexity analysis.

## 3. Compliance & Cross-Pollination Matrix
| Domain | Compliance/Standard | Key Action |
| :--- | :--- | :--- |
| **Data/AI** | HIPAA/GDPR | Anonymize/Mask PII before LLM processing. |
| **Cyber** | OWASP Top 10 | Validate every user input; use Prepared Statements. |
| **Frontend** | W3C Accessibility | Ensure keyboard-only navigation for React components. |
| **Infrastructure** | SOC2 | Enable Logging, Auditing, and Automated Backups. |

## 4. Debugging & Improvement Protocol
If a task stalls, use the **"5-Why Technique"** to identify the bottleneck:
1. Why did it stop?
2. Why was it complex?
3. Why are there many conditions?
4. Why is the model unclear?
5. **Solution:** Refactor the logic/schema, then rewrite.

## 5. Master Architect Prompt
Whenever you begin a feature, use this trigger to keep the AI in persona:
> "Act as a Senior Lead Architect proficient in all 9 of my domains. I am building: [INSERT FEATURE]. Provide a plan covering: 1. System & UX Architecture, 2. Data & AI Pipeline, 3. Security & Integrity, 4. Implementation & Optimization. Follow the gemini.md SOP strictly."

## 6. Developer Velocity Toolkit
* **The Rule of 3s:** Provide perspectives for: 
    1. **Fast/Dirty** (MVP).
    2. **Scalable** (Enterprise).
    3. **Secure** (Audit-ready).
* **Terminal-First Workflow:** Always request `curl`, `psql`, `npm`, and `pip` commands for verification.
* **Context Preservation:** Maintain `[CURRENT_STACK]`, `[BLOCKER]`, and `[NEXT_GOAL]` markers in your terminal session to ensure the AI stays focused.
* **Track-Jump Method:** If stuck in one track, query another (e.g., "How does this React state affect my Data Analyst reporting layer?").

## 7. The 10-Step Architectural Lifecycle
Use this sequence for every major feature to ensure no track is left behind:
1. **Define Intent (UX/Design):** Identify user persona and problem.
2. **Threat Modeling (Cyber Security):** Identify potential attack vectors (OWASP) before coding.
3. **Data Modeling (Data Engineer/Analyst):** Design schema, ingestion, and storage.
4. **Prototype Logic (Python/Data Analysis):** Build a standalone script to validate data/AI logic.
5. **Component Scaffolding (React/Full Stack):** Build UI skeleton and connect to mock API.
6. **Pipeline Integration (AI Engineer/Data Scientist):** Connect model/agent to data pipeline.
7. **Secure & Hardening (Cyber Security):** Implement RLS, input validation, and sanitization.
8. **Optimization (Optimization):** Apply O(n) analysis, caching, and performance tuning.
9. **Verification (Terminal-First):** Run terminal tests (`curl`, `psql`, unit tests).
10. **Documentation (Versioning):** Update `roadmap.md` and commit architectural summary.
