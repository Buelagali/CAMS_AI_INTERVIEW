const DIFFICULTY = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };

const QUESTION_TYPES = ['hr', 'technical', 'resume', 'behavioral', 'adaptive'];

const ROLE_SKILLS = {
  'Software Developer': ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Git', 'REST', 'SQL', 'Docker', 'System Design', 'DSA'],
  'AI/ML Engineer': ['Python', 'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Statistics', 'MLOps', 'Computer Vision'],
  'Data Analyst': ['SQL', 'Python', 'Excel', 'Tableau', 'Power BI', 'Statistics', 'R', 'Data Visualization', 'ETL', 'MongoDB'],
  'Cloud Engineer': ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Linux', 'CI/CD', 'Networking'],
  'Cyber Security Analyst': ['Network Security', 'Cryptography', 'Penetration Testing', 'SIEM', 'Linux', 'Firewall', 'Incident Response', 'Risk Assessment', 'Compliance', 'Python'],
};

const HR_QUESTIONS = [
  { id: 'hr_1', difficulty: 1, text: 'Tell me about yourself and your background.' },
  { id: 'hr_2', difficulty: 1, text: 'What interests you about this role?' },
  { id: 'hr_3', difficulty: 2, text: 'Describe your ideal work environment and team culture.' },
  { id: 'hr_4', difficulty: 1, text: 'Where do you see yourself professionally in the next few years?' },
  { id: 'hr_5', difficulty: 2, text: 'What are your key professional achievements so far?' },
  { id: 'hr_6', difficulty: 2, text: 'Why do you want to work with this technology stack?' },
  { id: 'hr_7', difficulty: 3, text: 'Describe a time you showed leadership in a technical role.' },
  { id: 'hr_8', difficulty: 3, text: 'How do you stay updated with the latest industry trends?' },
  { id: 'hr_9', difficulty: 1, text: 'What motivates you to perform well at work?' },
  { id: 'hr_10', difficulty: 2, text: 'Tell me about a project you are most proud of.' },
];

const BEHAVIORAL_QUESTIONS = [
  { id: 'beh_1', difficulty: 1, text: 'Describe a challenging problem you solved at work.' },
  { id: 'beh_2', difficulty: 2, text: 'Tell me about a time you disagreed with a teammate. How did you resolve it?' },
  { id: 'beh_3', difficulty: 2, text: 'How do you handle tight deadlines and pressure?' },
  { id: 'beh_4', difficulty: 3, text: 'Describe a situation where you had to learn a new technology quickly.' },
  { id: 'beh_5', difficulty: 1, text: 'How do you prioritize your tasks when working on multiple projects?' },
  { id: 'beh_6', difficulty: 3, text: 'Tell me about a time you made a mistake. What did you learn?' },
  { id: 'beh_7', difficulty: 2, text: 'How do you handle feedback and criticism?' },
  { id: 'beh_8', difficulty: 3, text: 'Describe a situation where you went above and beyond for a project.' },
  { id: 'beh_9', difficulty: 2, text: 'How do you collaborate with non-technical stakeholders?' },
  { id: 'beh_10', difficulty: 4, text: 'Tell me about a time you had to convince others to adopt your technical approach.' },
];

const TECHNICAL_QUESTIONS = {
  'Software Developer': {
    JavaScript: [
      { id: 'sd_js_1', difficulty: 1, text: 'What is JavaScript and what are its key features?' },
      { id: 'sd_js_2', difficulty: 2, text: 'Explain closures in JavaScript with an example.' },
      { id: 'sd_js_3', difficulty: 3, text: 'How does the JavaScript event loop work?' },
      { id: 'sd_js_4', difficulty: 4, text: 'Explain JavaScript prototypal inheritance and how it differs from classical inheritance.' },
    ],
    React: [
      { id: 'sd_react_1', difficulty: 1, text: 'What is React and what problem does it solve?' },
      { id: 'sd_react_2', difficulty: 2, text: 'Explain the Virtual DOM and how React uses it.' },
      { id: 'sd_react_3', difficulty: 3, text: 'Compare React Hooks vs class components. When would you use each?' },
      { id: 'sd_react_4', difficulty: 4, text: 'How would you optimize a React application for production performance?' },
    ],
    'Node.js': [
      { id: 'sd_node_1', difficulty: 1, text: 'What is Node.js and why is it useful?' },
      { id: 'sd_node_2', difficulty: 2, text: 'Explain the Node.js event-driven architecture.' },
      { id: 'sd_node_3', difficulty: 3, text: 'How do you handle errors in Node.js async code?' },
      { id: 'sd_node_4', difficulty: 4, text: 'Design a scalable Node.js application architecture for high traffic.' },
    ],
    TypeScript: [
      { id: 'sd_ts_1', difficulty: 1, text: 'What is TypeScript and how does it improve JavaScript?' },
      { id: 'sd_ts_2', difficulty: 2, text: 'Explain interfaces vs types in TypeScript.' },
      { id: 'sd_ts_3', difficulty: 3, text: 'How do TypeScript generics work? Provide an example.' },
      { id: 'sd_ts_4', difficulty: 4, text: 'Explain advanced TypeScript patterns like conditional types and mapped types.' },
    ],
    REST: [
      { id: 'sd_rest_1', difficulty: 1, text: 'What is a REST API and what are its principles?' },
      { id: 'sd_rest_2', difficulty: 2, text: 'Explain the difference between REST and GraphQL.' },
      { id: 'sd_rest_3', difficulty: 3, text: 'How would you design a RESTful API for a social media platform?' },
      { id: 'sd_rest_4', difficulty: 4, text: 'Discuss REST API versioning strategies and their trade-offs.' },
    ],
    SQL: [
      { id: 'sd_sql_1', difficulty: 1, text: 'What is SQL and what are the different types of SQL joins?' },
      { id: 'sd_sql_2', difficulty: 2, text: 'Explain database normalization and denormalization.' },
      { id: 'sd_sql_3', difficulty: 3, text: 'How do you optimize a slow SQL query?' },
      { id: 'sd_sql_4', difficulty: 4, text: 'Design a database schema for a multi-tenant SaaS application.' },
    ],
    Docker: [
      { id: 'sd_docker_1', difficulty: 1, text: 'What is Docker and how does containerization work?' },
      { id: 'sd_docker_2', difficulty: 2, text: 'Explain the difference between Docker and virtual machines.' },
      { id: 'sd_docker_3', difficulty: 3, text: 'How do you optimize Docker images for production?' },
      { id: 'sd_docker_4', difficulty: 4, text: 'Design a multi-container application architecture with Docker Compose.' },
    ],
    'System Design': [
      { id: 'sd_sys_1', difficulty: 1, text: 'What is system design and why is it important?' },
      { id: 'sd_sys_2', difficulty: 2, text: 'Explain microservices vs monolithic architecture.' },
      { id: 'sd_sys_3', difficulty: 3, text: 'How would you design a URL shortening service like bit.ly?' },
      { id: 'sd_sys_4', difficulty: 4, text: 'Design a real-time messaging system like WhatsApp.' },
    ],
  },
  'AI/ML Engineer': {
    Python: [
      { id: 'ml_py_1', difficulty: 1, text: 'What Python libraries do you use for data science and ML?' },
      { id: 'ml_py_2', difficulty: 2, text: 'Explain list comprehensions and generators in Python.' },
      { id: 'ml_py_3', difficulty: 3, text: 'How do you optimize Python code for performance in ML pipelines?' },
      { id: 'ml_py_4', difficulty: 4, text: 'Explain Python decorators and metaclasses with ML use cases.' },
    ],
    'Machine Learning': [
      { id: 'ml_ml_1', difficulty: 1, text: 'What is the difference between supervised and unsupervised learning?' },
      { id: 'ml_ml_2', difficulty: 2, text: 'Explain the bias-variance tradeoff in machine learning.' },
      { id: 'ml_ml_3', difficulty: 3, text: 'How do you handle imbalanced datasets in classification?' },
      { id: 'ml_ml_4', difficulty: 4, text: 'Explain ensemble methods and when to use bagging vs boosting.' },
    ],
    'Deep Learning': [
      { id: 'ml_dl_1', difficulty: 1, text: 'What is a neural network and how does it learn?' },
      { id: 'ml_dl_2', difficulty: 2, text: 'Explain backpropagation and gradient descent.' },
      { id: 'ml_dl_3', difficulty: 3, text: 'What is overfitting in deep learning and how do you prevent it?' },
      { id: 'ml_dl_4', difficulty: 4, text: 'Explain transformers and self-attention mechanisms in detail.' },
    ],
    NLP: [
      { id: 'ml_nlp_1', difficulty: 1, text: 'What is NLP and what are common NLP tasks?' },
      { id: 'ml_nlp_2', difficulty: 2, text: 'Explain word embeddings like Word2Vec and GloVe.' },
      { id: 'ml_nlp_3', difficulty: 3, text: 'How do transformer models like BERT work for NLP?' },
      { id: 'ml_nlp_4', difficulty: 4, text: 'Compare encoder-only, decoder-only, and encoder-decoder transformer architectures.' },
    ],
    TensorFlow: [
      { id: 'ml_tf_1', difficulty: 1, text: 'What is TensorFlow and how does it compare to PyTorch?' },
      { id: 'ml_tf_2', difficulty: 2, text: 'Explain TensorFlow Serving for model deployment.' },
      { id: 'ml_tf_3', difficulty: 3, text: 'How do you create custom training loops in TensorFlow?' },
      { id: 'ml_tf_4', difficulty: 4, text: 'Design a distributed training pipeline with TensorFlow.' },
    ],
    MLOps: [
      { id: 'ml_ops_1', difficulty: 1, text: 'What is MLOps and why is it important?' },
      { id: 'ml_ops_2', difficulty: 2, text: 'Explain the ML model lifecycle from development to production.' },
      { id: 'ml_ops_3', difficulty: 3, text: 'How do you implement model versioning and A/B testing?' },
      { id: 'ml_ops_4', difficulty: 4, text: 'Design a complete MLOps pipeline with CI/CD for ML models.' },
    ],
    'Computer Vision': [
      { id: 'ml_cv_1', difficulty: 1, text: 'What is computer vision and what are its applications?' },
      { id: 'ml_cv_2', difficulty: 2, text: 'Explain CNNs and how they process images.' },
      { id: 'ml_cv_3', difficulty: 3, text: 'Compare object detection architectures like YOLO and Faster R-CNN.' },
      { id: 'ml_cv_4', difficulty: 4, text: 'How do vision transformers (ViT) differ from CNNs?' },
    ],
  },
  'Data Analyst': {
    SQL: [
      { id: 'da_sql_1', difficulty: 1, text: 'What are the different types of SQL joins? Explain each.' },
      { id: 'da_sql_2', difficulty: 2, text: 'Explain window functions in SQL with examples.' },
      { id: 'da_sql_3', difficulty: 3, text: 'How do you optimize complex SQL queries for large datasets?' },
      { id: 'da_sql_4', difficulty: 4, text: 'Design a reporting database schema for an e-commerce platform.' },
    ],
    Python: [
      { id: 'da_py_1', difficulty: 1, text: 'How do you use Python for data analysis?' },
      { id: 'da_py_2', difficulty: 2, text: 'Explain pandas DataFrames and common operations.' },
      { id: 'da_py_3', difficulty: 3, text: 'How do you handle missing data and outliers in Python?' },
      { id: 'da_py_4', difficulty: 4, text: 'Build a data pipeline in Python for ETL processing.' },
    ],
    Statistics: [
      { id: 'da_stat_1', difficulty: 1, text: 'What is the difference between descriptive and inferential statistics?' },
      { id: 'da_stat_2', difficulty: 2, text: 'Explain p-values and confidence intervals.' },
      { id: 'da_stat_3', difficulty: 3, text: 'What is A/B testing and how do you determine statistical significance?' },
      { id: 'da_stat_4', difficulty: 4, text: 'Explain Bayesian vs frequentist statistics with examples.' },
    ],
    Tableau: [
      { id: 'da_tab_1', difficulty: 1, text: 'What is Tableau and how is it used for visualization?' },
      { id: 'da_tab_2', difficulty: 2, text: 'Explain Tableau calculated fields and parameters.' },
      { id: 'da_tab_3', difficulty: 3, text: 'How do you create interactive dashboards in Tableau?' },
      { id: 'da_tab_4', difficulty: 4, text: 'Design a Tableau architecture for enterprise self-service analytics.' },
    ],
    'Data Visualization': [
      { id: 'da_viz_1', difficulty: 1, text: 'What are the principles of effective data visualization?' },
      { id: 'da_viz_2', difficulty: 2, text: 'How do you choose the right chart type for different data?' },
      { id: 'da_viz_3', difficulty: 3, text: 'Explain how to create a compelling data story with visualization.' },
      { id: 'da_viz_4', difficulty: 4, text: 'Design a visualization system for real-time data monitoring.' },
    ],
    ETL: [
      { id: 'da_etl_1', difficulty: 1, text: 'What is ETL and why is it important in data analytics?' },
      { id: 'da_etl_2', difficulty: 2, text: 'Explain data warehousing concepts and star schema design.' },
      { id: 'da_etl_3', difficulty: 3, text: 'How do you handle data quality issues in ETL pipelines?' },
      { id: 'da_etl_4', difficulty: 4, text: 'Design a real-time data pipeline using streaming technologies.' },
    ],
  },
  'Cloud Engineer': {
    AWS: [
      { id: 'ce_aws_1', difficulty: 1, text: 'What is AWS and what are its core services?' },
      { id: 'ce_aws_2', difficulty: 2, text: 'Explain EC2 vs Lambda and when to use each.' },
      { id: 'ce_aws_3', difficulty: 3, text: 'How would you design a highly available architecture on AWS?' },
      { id: 'ce_aws_4', difficulty: 4, text: 'Design a multi-region disaster recovery strategy on AWS.' },
    ],
    Docker: [
      { id: 'ce_docker_1', difficulty: 1, text: 'How does Docker work and what are images and containers?' },
      { id: 'ce_docker_2', difficulty: 2, text: 'Explain Docker networking and volume management.' },
      { id: 'ce_docker_3', difficulty: 3, text: 'How do you secure Docker containers in production?' },
      { id: 'ce_docker_4', difficulty: 4, text: 'Design a container orchestration strategy for microservices.' },
    ],
    Kubernetes: [
      { id: 'ce_k8s_1', difficulty: 1, text: 'What is Kubernetes and why use it?' },
      { id: 'ce_k8s_2', difficulty: 2, text: 'Explain Kubernetes pods, deployments, and services.' },
      { id: 'ce_k8s_3', difficulty: 3, text: 'How do you manage Kubernetes scaling and auto-scaling?' },
      { id: 'ce_k8s_4', difficulty: 4, text: 'Design a multi-cluster Kubernetes architecture for global applications.' },
    ],
    Terraform: [
      { id: 'ce_tf_1', difficulty: 1, text: 'What is Infrastructure as Code and how does Terraform work?' },
      { id: 'ce_tf_2', difficulty: 2, text: 'Explain Terraform state files and remote state management.' },
      { id: 'ce_tf_3', difficulty: 3, text: 'How do you structure Terraform code for large organizations?' },
      { id: 'ce_tf_4', difficulty: 4, text: 'Design a multi-environment infrastructure pipeline with Terraform.' },
    ],
    'CI/CD': [
      { id: 'ce_cicd_1', difficulty: 1, text: 'What is CI/CD and why is it important?' },
      { id: 'ce_cicd_2', difficulty: 2, text: 'Explain a typical CI/CD pipeline with Jenkins or GitHub Actions.' },
      { id: 'ce_cicd_3', difficulty: 3, text: 'How do you implement security scanning in CI/CD pipelines?' },
      { id: 'ce_cicd_4', difficulty: 4, text: 'Design a GitOps workflow for automated deployments.' },
    ],
    Networking: [
      { id: 'ce_net_1', difficulty: 1, text: 'Explain VPC, subnets, and CIDR notation.' },
      { id: 'ce_net_2', difficulty: 2, text: 'How do load balancers work and what types exist?' },
      { id: 'ce_net_3', difficulty: 3, text: 'Explain DNS resolution and CDN architecture.' },
      { id: 'ce_net_4', difficulty: 4, text: 'Design a global network architecture with VPN and Direct Connect.' },
    ],
  },
  'Cyber Security Analyst': {
    'Network Security': [
      { id: 'cs_ns_1', difficulty: 1, text: 'What is network security and what are its key principles?' },
      { id: 'cs_ns_2', difficulty: 2, text: 'Explain firewall types and how they protect networks.' },
      { id: 'cs_ns_3', difficulty: 3, text: 'How do you design a defense-in-depth network security strategy?' },
      { id: 'cs_ns_4', difficulty: 4, text: 'Design a zero-trust network architecture for an enterprise.' },
    ],
    Cryptography: [
      { id: 'cs_crypto_1', difficulty: 1, text: 'What is encryption and why is it important?' },
      { id: 'cs_crypto_2', difficulty: 2, text: 'Explain symmetric vs asymmetric encryption.' },
      { id: 'cs_crypto_3', difficulty: 3, text: 'How do TLS/SSL protocols work to secure communications?' },
      { id: 'cs_crypto_4', difficulty: 4, text: 'Explain cryptographic protocols like SSH, IPSec, and their use cases.' },
    ],
    'Penetration Testing': [
      { id: 'cs_pt_1', difficulty: 1, text: 'What is penetration testing and why is it conducted?' },
      { id: 'cs_pt_2', difficulty: 2, text: 'Explain the phases of a penetration test.' },
      { id: 'cs_pt_3', difficulty: 3, text: 'What are common web application vulnerabilities and how do you test for them?' },
      { id: 'cs_pt_4', difficulty: 4, text: 'Design a comprehensive security assessment program for an organization.' },
    ],
    SIEM: [
      { id: 'cs_siem_1', difficulty: 1, text: 'What is SIEM and how is it used in security operations?' },
      { id: 'cs_siem_2', difficulty: 2, text: 'Explain log correlation and alerting in SIEM systems.' },
      { id: 'cs_siem_3', difficulty: 3, text: 'How do you tune SIEM rules to reduce false positives?' },
      { id: 'cs_siem_4', difficulty: 4, text: 'Design a SOC architecture with SIEM, SOAR, and threat intelligence.' },
    ],
    'Incident Response': [
      { id: 'cs_ir_1', difficulty: 1, text: 'What is incident response and what are its stages?' },
      { id: 'cs_ir_2', difficulty: 2, text: 'Explain the NIST incident response framework.' },
      { id: 'cs_ir_3', difficulty: 3, text: 'How do you conduct forensic analysis after a security breach?' },
      { id: 'cs_ir_4', difficulty: 4, text: 'Design an incident response plan for ransomware attacks.' },
    ],
    Compliance: [
      { id: 'cs_comp_1', difficulty: 1, text: 'What is GDPR and how does it affect data handling?' },
      { id: 'cs_comp_2', difficulty: 2, text: 'Explain SOC 2 compliance and its trust principles.' },
      { id: 'cs_comp_3', difficulty: 3, text: 'How do you implement security controls for ISO 27001 compliance?' },
      { id: 'cs_comp_4', difficulty: 4, text: 'Design a compliance monitoring program for multi-regulation environments.' },
    ],
  },
};

const RESUME_TEMPLATES = [
  { id: 'res_skill_1', type: 'resume', difficulty: 1, template: 'You have {skill} listed on your resume. Can you explain how you have used it in your projects?' },
  { id: 'res_skill_2', type: 'resume', difficulty: 2, template: 'What is the most challenging problem you solved using {skill}?' },
  { id: 'res_skill_3', type: 'resume', difficulty: 3, template: 'How would you compare {skill} with alternative technologies you have used?' },
  { id: 'res_skill_4', type: 'resume', difficulty: 4, template: 'How would you architect a production system using {skill}?' },
  { id: 'res_exp_1', type: 'resume', difficulty: 2, template: 'Your resume mentions {exp} years of experience. How has your approach to development evolved over this time?' },
  { id: 'res_proj_1', type: 'resume', difficulty: 2, template: 'Tell me more about your project involving {skill}. What was your specific role and contribution?' },
  { id: 'res_proj_2', type: 'resume', difficulty: 3, template: 'What technical challenges did you face in your project with {skill}, and how did you overcome them?' },
  { id: 'res_gap_1', type: 'adaptive', difficulty: 2, template: 'I notice you have experience with {skill}. How does this relate to {missingSkill}, which is important for this role?' },
];

const ADAPTIVE_QUESTIONS = [
  { id: 'adap_1', difficulty: 2, type: 'adaptive', text: 'You mentioned {keyword} in your previous answer. Can you elaborate on that?' },
  { id: 'adap_2', difficulty: 3, type: 'adaptive', text: 'Building on your previous answer, how would you handle {scenario}?' },
  { id: 'adap_3', difficulty: 2, type: 'adaptive', text: 'Can you provide a specific example of when you applied {keyword} in practice?' },
  { id: 'adap_4', difficulty: 4, type: 'adaptive', text: 'Given your experience with {keyword}, how would you design a system to handle edge cases?' },
];

const SCENARIOS = {
  'Software Developer': 'a high-traffic e-commerce platform experiencing performance issues',
  'AI/ML Engineer': 'deploying a model that needs to scale to millions of predictions per day',
  'Data Analyst': 'analyzing a dataset with missing values and outliers to derive business insights',
  'Cloud Engineer': 'migrating a legacy on-premise system to the cloud with zero downtime',
  'Cyber Security Analyst': 'responding to a suspected data breach with potential data exfiltration',
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getDifficultyFromScores(scores) {
  const avgScore = (
    (scores.technical || 0) +
    (scores.semantic || 0) +
    (scores.confidence || 0)
  ) / 3;

  if (avgScore > 80) return DIFFICULTY.EXPERT;
  if (avgScore > 60) return DIFFICULTY.ADVANCED;
  if (avgScore > 40) return DIFFICULTY.INTERMEDIATE;
  return DIFFICULTY.BEGINNER;
}

function getNextQuestionType(interviewMemory) {
  const { askedQuestions, questionCount } = interviewMemory;
  const maxQuestions = 8;

  if (questionCount === 0) return 'hr';
  if (questionCount === 1) return 'resume';
  if (questionCount === maxQuestions - 1) return 'hr';

  const typeCount = {};
  QUESTION_TYPES.forEach((t) => { typeCount[t] = 0; });
  askedQuestions.forEach((q) => {
    if (typeCount[q.type] !== undefined) typeCount[q.type]++;
  });

  const leastAsked = QUESTION_TYPES.slice().sort((a, b) => typeCount[a] - typeCount[b]);
  return leastAsked[0];
}

function generateResumeQuestion(resumeSkills, difficulty, askedIds) {
  if (!resumeSkills || resumeSkills.length === 0) return null;

  const availableSkills = resumeSkills;
  const shuffled = shuffleArray(availableSkills);

  for (const skill of shuffled) {
    const candidates = RESUME_TEMPLATES.filter(
      (t) => t.difficulty === difficulty && !askedIds.has(t.id)
    );
    if (candidates.length === 0) continue;

    const template = pickRandom(candidates);
    const text = template.template
      .replace('{skill}', skill)
      .replace('{exp}', 'several');
    return {
      id: template.id + '_' + skill.toLowerCase().replace(/\s+/g, '_'),
      type: template.type,
      difficulty,
      text,
      source: 'resume',
      skill,
    };
  }
  return null;
}

function generateAdaptiveQuestion(interviewMemory, difficulty, askedIds) {
  const { answers } = interviewMemory;
  if (!answers || answers.length === 0) return null;

  const lastAnswer = answers[answers.length - 1];
  const words = (lastAnswer.answer || '').split(' ').filter((w) => w.length > 4);
  const techWords = ['react', 'node', 'python', 'api', 'database', 'cloud', 'docker', 'aws', 'ml', 'ai', 'algorithm', 'framework', 'system', 'design', 'test', 'deploy', 'pipeline', 'model', 'data', 'server'];
  const matched = words.filter((w) => techWords.some((t) => w.toLowerCase().includes(t)));

  const keyword = matched.length > 0 ? pickRandom(matched) : 'your approach';
  const scenario = SCENARIOS[interviewMemory.role] || 'a complex technical challenge';

  const candidates = ADAPTIVE_QUESTIONS.filter(
    (q) => q.difficulty <= difficulty && !askedIds.has(q.id)
  );
  if (candidates.length === 0) return null;

  const template = pickRandom(candidates);
  return {
    id: template.id + '_' + Date.now(),
    type: 'adaptive',
    difficulty: template.difficulty,
    text: template.text.replace('{keyword}', keyword).replace('{scenario}', scenario),
    source: 'adaptive',
  };
}

function generateTechnicalQuestion(role, difficulty, askedIds, preferredSkill) {
  const roleQuestions = TECHNICAL_QUESTIONS[role];
  if (!roleQuestions) return null;

  let available = [];
  const skillKeys = Object.keys(roleQuestions);

  if (preferredSkill && roleQuestions[preferredSkill]) {
    const fromSkill = roleQuestions[preferredSkill].filter(
      (q) => q.difficulty === difficulty && !askedIds.has(q.id)
    );
    if (fromSkill.length > 0) available = fromSkill;
  }

  if (available.length === 0) {
    const shuffledSkills = shuffleArray(skillKeys);
    for (const skill of shuffledSkills) {
      const fromSkill = roleQuestions[skill].filter(
        (q) => q.difficulty === difficulty && !askedIds.has(q.id)
      );
      if (fromSkill.length > 0) { available = fromSkill; break; }
    }
  }

  if (available.length === 0) {
    const oneUp = Math.min(difficulty + 1, 4);
    const oneDown = Math.max(difficulty - 1, 1);
    const shuffled = shuffleArray(skillKeys);
    for (const skill of shuffled) {
      for (const d of [oneUp, oneDown, difficulty]) {
        const fromSkill = roleQuestions[skill].filter(
          (q) => q.difficulty === d && !askedIds.has(q.id)
        );
        if (fromSkill.length > 0) { available = fromSkill; break; }
      }
      if (available.length > 0) break;
    }
  }

  if (available.length === 0) return null;
  return { ...pickRandom(available), type: 'technical', source: 'technical' };
}

function generateHRQuestion(difficulty, askedIds) {
  const candidates = HR_QUESTIONS.filter(
    (q) => q.difficulty <= difficulty && !askedIds.has(q.id)
  );
  if (candidates.length === 0) return null;
  return { ...pickRandom(candidates), type: 'hr', source: 'hr' };
}

function generateBehavioralQuestion(difficulty, askedIds) {
  const candidates = BEHAVIORAL_QUESTIONS.filter(
    (q) => q.difficulty <= difficulty && !askedIds.has(q.id)
  );
  if (candidates.length === 0) return null;
  return { ...pickRandom(candidates), type: 'behavioral', source: 'behavioral' };
}

export function generateQuestion({ role, resumeSkills, interviewMemory, currentEmotion }) {
  const { askedQuestions, scores, questionCount } = interviewMemory;
  const askedIds = new Set(askedQuestions.map((q) => q.id));

  if (questionCount >= 8) return null;

  let difficulty = getDifficultyFromScores(scores);

  if (currentEmotion === 'Nervous' || currentEmotion === 'Sad' || currentEmotion === 'Angry') {
    difficulty = Math.max(1, difficulty - 1);
  }

  const questionType = getNextQuestionType(interviewMemory);

  let question = null;

  switch (questionType) {
    case 'hr':
      question = generateHRQuestion(difficulty, askedIds);
      break;
    case 'resume':
      question = generateResumeQuestion(resumeSkills, difficulty, askedIds);
      if (!question) question = generateTechnicalQuestion(role, difficulty, askedIds, null);
      break;
    case 'behavioral':
      question = generateBehavioralQuestion(difficulty, askedIds);
      if (!question) question = generateHRQuestion(difficulty, askedIds);
      break;
    case 'adaptive':
      question = generateAdaptiveQuestion(interviewMemory, difficulty, askedIds);
      if (!question) question = generateBehavioralQuestion(difficulty, askedIds);
      break;
    case 'technical':
    default: {
      const preferredSkill = resumeSkills && resumeSkills.length > 0
        ? pickRandom(resumeSkills)
        : null;
      question = generateTechnicalQuestion(role, difficulty, askedIds, preferredSkill);
      if (!question) question = generateBehavioralQuestion(difficulty, askedIds);
      if (!question) question = generateHRQuestion(difficulty, askedIds);
      break;
    }
  }

  if (!question) {
    question = {
      id: 'fallback_' + Date.now(),
      type: 'technical',
      difficulty: 1,
      text: 'Can you describe a technical project you have worked on recently?',
      source: 'fallback',
    };
  }

  return question;
}

export function calculateAnswerScore({ questionText, answerText, questionType, difficulty, emotionState, confidenceScore }) {
  const answerWords = answerText.toLowerCase().split(' ').filter(Boolean);
  const questionWords = questionText.toLowerCase().split(' ').filter(Boolean);
  const wordOverlap = questionWords.filter((w) => answerWords.includes(w)).length;
  const technicalTerms = [
    'function', 'component', 'state', 'hook', 'api', 'database', 'server', 'client',
    'algorithm', 'data', 'model', 'train', 'test', 'deploy', 'cloud', 'docker',
    'pipeline', 'framework', 'library', 'async', 'callback', 'promise', 'event',
    'class', 'object', 'array', 'loop', 'variable', 'scope', 'closure', 'module',
    'rest', 'graphql', 'sql', 'nosql', 'cache', 'queue', 'stream', 'socket',
    'security', 'auth', 'token', 'encrypt', 'hash', 'certificate',
    'container', 'orchestrate', 'monitor', 'scale', 'load', 'balance',
  ];
  const termCount = technicalTerms.filter((t) => answerWords.includes(t)).length;
  const answerLength = answerWords.length;
  const lengthScore = Math.min(100, (answerLength / 30) * 100);
  const overlapScore = Math.min(100, (wordOverlap / Math.max(questionWords.length, 1)) * 100);
  const technicalDepth = Math.min(100, (termCount / 5) * 100);
  const confidenceBoost = (confidenceScore || 50) * 0.15;
  const emotionPenalty = (emotionState === 'Nervous' || emotionState === 'Sad') ? 10 : 0;

  let score = Math.round(
    overlapScore * 0.25 +
    lengthScore * 0.20 +
    technicalDepth * 0.30 +
    confidenceBoost +
    Math.random() * 10
  );

  if (difficulty >= 3) score = Math.min(100, score + 5);
  if (difficulty >= 4) score = Math.min(100, score + 5);

  score = Math.max(10, Math.min(100, score - emotionPenalty));
  return score;
}

export function calculateCommunicationScore(answerText) {
  const words = answerText.split(' ').filter(Boolean);
  const sentences = answerText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : words.length;
  const wordLenVariety = words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);
  const fillerWords = ['um', 'uh', 'like', 'basically', 'actually', 'sort of', 'kind of', 'you know', 'i mean'];
  const fillerCount = fillerWords.filter((fw) => answerText.toLowerCase().includes(fw)).length;

  let score = 60;
  if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 25) score += 15;
  else if (avgWordsPerSentence > 25) score -= 10;
  if (wordLenVariety >= 4) score += 10;
  if (fillerCount === 0) score += 10;
  else if (fillerCount <= 2) score += 5;
  else score -= 10 * Math.min(5, fillerCount);

  return Math.max(10, Math.min(100, score));
}

export function calculateConfidenceFromAnswer(answerText, emotionState) {
  const words = answerText.split(' ').filter(Boolean);
  const sentences = answerText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWords = sentences.length > 0 ? words.length / sentences.length : words.length;
  const assertiveWords = ['i think', 'i believe', 'i know', 'i am confident', 'certainly', 'definitely', 'absolutely'];
  const hesitantWords = ['maybe', 'perhaps', 'i guess', 'not sure', 'probably', 'might', 'could be', 'i dont know'];
  const assertiveCount = assertiveWords.filter((w) => answerText.toLowerCase().includes(w)).length;
  const hesitantCount = hesitantWords.filter((w) => answerText.toLowerCase().includes(w)).length;

  let score = 50;
  if (avgWords >= 10) score += 10;
  if (words.length >= 30) score += 10;
  if (assertiveCount > 0) score += 15 * Math.min(3, assertiveCount);
  if (hesitantCount > 0) score -= 15 * Math.min(3, hesitantCount);

  if (emotionState === 'Confident') score += 15;
  if (emotionState === 'Happy') score += 10;
  if (emotionState === 'Nervous') score -= 15;

  return Math.max(10, Math.min(100, score));
}

export function calculateEmotionStability(emotionScoresHistory) {
  if (!emotionScoresHistory || emotionScoresHistory.length < 3) return 50;

  const recent = emotionScoresHistory.slice(-10);
  const fluctuations = [];
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const curr = recent[i];
    if (prev && curr) {
      const change = Object.keys(curr).reduce((sum, key) => {
        return sum + Math.abs((curr[key] || 0) - (prev[key] || 0));
      }, 0);
      fluctuations.push(change);
    }
  }

  const avgFluctuation = fluctuations.reduce((s, v) => s + v, 0) / Math.max(fluctuations.length, 1);
  const stability = Math.max(0, 100 - avgFluctuation * 50);
  return Math.round(Math.min(100, stability));
}

export function createInitialMemory(role, resumeData) {
  return {
    role,
    askedQuestions: [],
    answers: [],
    scores: { technical: 0, communication: 0, confidence: 0, behavior: 0, semantic: 0, emotion: 0 },
    questionCount: 0,
    resumeSkills: resumeData?.skills || [],
    skillGaps: [],
  };
}

export function getSkillGraph(role) {
  return ROLE_SKILLS[role] || ROLE_SKILLS['Software Developer'];
}

export function getMissingSkills(role, resumeSkills) {
  const required = ROLE_SKILLS[role] || ROLE_SKILLS['Software Developer'];
  return required.filter(
    (s) => !resumeSkills.some((rs) => rs.toLowerCase().includes(s.toLowerCase()))
  );
}
