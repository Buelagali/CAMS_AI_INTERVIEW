const { pipeline } = require('@xenova/transformers');
const { getSkillGraphScore, getSkillRecommendations } = require('../utils/skillGraph');
const { evaluateAnswer, getEmbedding, getSimilarity } = require('./bertService');

const DIFFICULTY = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };
const DIFFICULTY_LABEL = { 1: 'beginner', 2: 'intermediate', 3: 'advanced', 4: 'expert' };
const QUESTION_TYPES = ['hr', 'technical', 'resume', 'behavioral', 'adaptive'];

const ROLE_SKILLS = {
  'Software Developer': ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Git', 'REST', 'SQL', 'Docker', 'System Design'],
  'AI/ML Engineer': ['Python', 'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Statistics', 'MLOps', 'Computer Vision'],
  'Data Analyst': ['SQL', 'Python', 'Excel', 'Tableau', 'Power BI', 'Statistics', 'R', 'Data Visualization', 'ETL'],
  'Cloud Engineer': ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Linux', 'CI/CD'],
  'Cyber Security Analyst': ['Network Security', 'Cryptography', 'Penetration Testing', 'SIEM', 'Linux', 'Firewall', 'Incident Response', 'Risk Assessment', 'Compliance'],
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
  { id: 'hr_11', difficulty: 1, text: 'What do you know about our company and what we do?' },
  { id: 'hr_12', difficulty: 2, text: 'Describe a time you received constructive criticism. How did you handle it?' },
  { id: 'hr_13', difficulty: 1, text: 'What are your greatest strengths and how do they apply to this role?' },
  { id: 'hr_14', difficulty: 2, text: 'What is your biggest professional weakness and how are you addressing it?' },
  { id: 'hr_15', difficulty: 2, text: 'Why are you looking to leave your current position?' },
  { id: 'hr_16', difficulty: 3, text: 'Describe a situation where you had to manage competing priorities.' },
  { id: 'hr_17', difficulty: 1, text: 'What does work-life balance mean to you?' },
  { id: 'hr_18', difficulty: 3, text: 'Tell me about a time you failed at something significant. What did you learn?' },
  { id: 'hr_19', difficulty: 2, text: 'How do you handle working with people who have different communication styles?' },
  { id: 'hr_20', difficulty: 3, text: 'Describe your experience working in cross-functional teams.' },
  { id: 'hr_21', difficulty: 1, text: 'What type of work environment do you thrive in?' },
  { id: 'hr_22', difficulty: 2, text: 'How do you approach learning a new technology or tool?' },
  { id: 'hr_23', difficulty: 3, text: 'Tell me about a time you mentored or coached a colleague.' },
  { id: 'hr_24', difficulty: 1, text: 'What are your salary expectations for this role?' },
  { id: 'hr_25', difficulty: 4, text: 'Describe a situation where you had to influence stakeholders who initially disagreed with your approach.' },
  { id: 'hr_26', difficulty: 2, text: 'How do you measure success in your work?' },
  { id: 'hr_27', difficulty: 3, text: 'Tell me about a time you had to make a difficult decision with incomplete information.' },
  { id: 'hr_28', difficulty: 2, text: 'What aspects of your previous role did you find most challenging?' },
  { id: 'hr_29', difficulty: 4, text: 'Describe a time you drove organizational change. What was your approach?' },
  { id: 'hr_30', difficulty: 1, text: 'Why should we hire you over other candidates?' },
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
  { id: 'beh_11', difficulty: 1, text: 'Tell me about a time you worked as part of a team to achieve a goal.' },
  { id: 'beh_12', difficulty: 2, text: 'Describe a situation where you had to adapt to a significant change at work.' },
  { id: 'beh_13', difficulty: 3, text: 'Tell me about a time you took initiative on a project without being asked.' },
  { id: 'beh_14', difficulty: 2, text: 'How do you handle situations where you have too many tasks and not enough time?' },
  { id: 'beh_15', difficulty: 3, text: 'Describe a time you had to work with a difficult colleague or manager.' },
  { id: 'beh_16', difficulty: 1, text: 'Tell me about a time you helped a team member who was struggling.' },
  { id: 'beh_17', difficulty: 4, text: 'Describe a situation where you had to navigate office politics to get work done.' },
  { id: 'beh_18', difficulty: 2, text: 'How do you stay organized when managing multiple concurrent projects?' },
  { id: 'beh_19', difficulty: 3, text: 'Tell me about a time you had to deliver bad news to a client or stakeholder.' },
  { id: 'beh_20', difficulty: 2, text: 'Describe a situation where you went out of your way to help a customer or user.' },
  { id: 'beh_21', difficulty: 3, text: 'Tell me about a time you had to work outside your comfort zone.' },
  { id: 'beh_22', difficulty: 1, text: 'How do you handle repetitive or mundane tasks?' },
  { id: 'beh_23', difficulty: 4, text: 'Describe a time you had to make an unpopular decision that was ultimately correct.' },
  { id: 'beh_24', difficulty: 2, text: 'Tell me about a time you successfully negotiated a compromise.' },
  { id: 'beh_25', difficulty: 3, text: 'Describe a situation where your assumptions were proven wrong.' },
  { id: 'beh_26', difficulty: 2, text: 'How do you handle ambiguity when requirements are unclear?' },
  { id: 'beh_27', difficulty: 4, text: 'Tell me about a time you had to lead a team through a crisis.' },
  { id: 'beh_28', difficulty: 1, text: 'Describe a time you received praise for your work. What did you do?' },
  { id: 'beh_29', difficulty: 3, text: 'Tell me about a time you had to balance quality with speed.' },
  { id: 'beh_30', difficulty: 2, text: 'How do you ensure clear communication when working with remote team members?' },
];

const TECHNICAL_QUESTIONS = {
  'Software Developer': {
    JavaScript: [
      { id: 'sd_js_1', difficulty: 1, text: 'What is JavaScript and what are its key features?' },
      { id: 'sd_js_2', difficulty: 2, text: 'Explain closures in JavaScript with an example.' },
      { id: 'sd_js_3', difficulty: 3, text: 'How does the JavaScript event loop work?' },
      { id: 'sd_js_4', difficulty: 4, text: 'Explain JavaScript prototypal inheritance and how it differs from classical inheritance.' },
      { id: 'sd_js_5', difficulty: 1, text: 'What is the difference between let, const, and var in JavaScript?' },
      { id: 'sd_js_6', difficulty: 2, text: 'Explain how promises and async/await work in JavaScript.' },
      { id: 'sd_js_7', difficulty: 3, text: 'How does JavaScript handle memory management and garbage collection?' },
      { id: 'sd_js_8', difficulty: 4, text: 'Explain how you would implement a custom Promise polyfill from scratch.' },
    ],
    React: [
      { id: 'sd_react_1', difficulty: 1, text: 'What is React and what problem does it solve?' },
      { id: 'sd_react_2', difficulty: 2, text: 'Explain the Virtual DOM and how React uses it.' },
      { id: 'sd_react_3', difficulty: 3, text: 'Compare React Hooks vs class components. When would you use each?' },
      { id: 'sd_react_4', difficulty: 4, text: 'How would you optimize a React application for production performance?' },
      { id: 'sd_react_5', difficulty: 1, text: 'What are React props and state? How do they differ?' },
      { id: 'sd_react_6', difficulty: 2, text: 'Explain the useEffect hook and its dependency array.' },
      { id: 'sd_react_7', difficulty: 3, text: 'How does React handle reconciliation and key props in lists?' },
      { id: 'sd_react_8', difficulty: 4, text: 'Explain React Server Components and how they differ from client components.' },
    ],
    'Node.js': [
      { id: 'sd_node_1', difficulty: 1, text: 'What is Node.js and why is it useful?' },
      { id: 'sd_node_2', difficulty: 2, text: 'Explain the Node.js event-driven architecture.' },
      { id: 'sd_node_3', difficulty: 3, text: 'How do you handle errors in Node.js async code?' },
      { id: 'sd_node_4', difficulty: 4, text: 'Design a scalable Node.js application architecture for high traffic.' },
      { id: 'sd_node_5', difficulty: 1, text: 'What is the Node.js event loop and what are its phases?' },
      { id: 'sd_node_6', difficulty: 2, text: 'Explain middleware pattern in Express.js and how it works.' },
      { id: 'sd_node_7', difficulty: 3, text: 'How do you manage worker threads and child processes in Node.js?' },
      { id: 'sd_node_8', difficulty: 4, text: 'Design a Node.js clustering strategy for multi-core utilization.' },
    ],
    TypeScript: [
      { id: 'sd_ts_1', difficulty: 1, text: 'What is TypeScript and how does it improve JavaScript?' },
      { id: 'sd_ts_2', difficulty: 2, text: 'Explain interfaces vs types in TypeScript.' },
      { id: 'sd_ts_3', difficulty: 3, text: 'How do TypeScript generics work? Provide an example.' },
      { id: 'sd_ts_4', difficulty: 4, text: 'Explain advanced TypeScript patterns like conditional types and mapped types.' },
      { id: 'sd_ts_5', difficulty: 1, text: 'What are the primitive types in TypeScript?' },
      { id: 'sd_ts_6', difficulty: 2, text: 'Explain union types, intersection types, and type guards.' },
      { id: 'sd_ts_7', difficulty: 3, text: 'How do decorators work in TypeScript? Provide use cases.' },
      { id: 'sd_ts_8', difficulty: 4, text: 'Explain TypeScript module resolution strategies and path mapping.' },
    ],
    REST: [
      { id: 'sd_rest_1', difficulty: 1, text: 'What is a REST API and what are its principles?' },
      { id: 'sd_rest_2', difficulty: 2, text: 'Explain the difference between REST and GraphQL.' },
      { id: 'sd_rest_3', difficulty: 3, text: 'How would you design a RESTful API for a social media platform?' },
      { id: 'sd_rest_4', difficulty: 4, text: 'Discuss REST API versioning strategies and their trade-offs.' },
      { id: 'sd_rest_5', difficulty: 1, text: 'What are HTTP methods and status codes? Give examples.' },
      { id: 'sd_rest_6', difficulty: 2, text: 'Explain HATEOAS and how it relates to RESTful design.' },
      { id: 'sd_rest_7', difficulty: 3, text: 'How do you implement pagination, filtering, and sorting in REST APIs?' },
      { id: 'sd_rest_8', difficulty: 4, text: 'Design a rate-limiting strategy for a public REST API.' },
    ],
    SQL: [
      { id: 'sd_sql_1', difficulty: 1, text: 'What is SQL and what are the different types of SQL joins?' },
      { id: 'sd_sql_2', difficulty: 2, text: 'Explain database normalization and denormalization.' },
      { id: 'sd_sql_3', difficulty: 3, text: 'How do you optimize a slow SQL query?' },
      { id: 'sd_sql_4', difficulty: 4, text: 'Design a database schema for a multi-tenant SaaS application.' },
      { id: 'sd_sql_5', difficulty: 1, text: 'What is the difference between WHERE and HAVING clauses?' },
      { id: 'sd_sql_6', difficulty: 2, text: 'Explain ACID properties and why they matter in databases.' },
      { id: 'sd_sql_7', difficulty: 3, text: 'How do indexes work in SQL databases and what are their trade-offs?' },
      { id: 'sd_sql_8', difficulty: 4, text: 'Design a database partitioning and sharding strategy for a large-scale application.' },
    ],
    Docker: [
      { id: 'sd_docker_1', difficulty: 1, text: 'What is Docker and how does containerization work?' },
      { id: 'sd_docker_2', difficulty: 2, text: 'Explain the difference between Docker and virtual machines.' },
      { id: 'sd_docker_3', difficulty: 3, text: 'How do you optimize Docker images for production?' },
      { id: 'sd_docker_4', difficulty: 4, text: 'Design a multi-container application architecture with Docker Compose.' },
      { id: 'sd_docker_5', difficulty: 1, text: 'What is a Dockerfile and what are common instructions in it?' },
      { id: 'sd_docker_6', difficulty: 2, text: 'Explain Docker volumes and bind mounts for persistent data.' },
      { id: 'sd_docker_7', difficulty: 3, text: 'How do you implement health checks and restart policies in Docker?' },
      { id: 'sd_docker_8', difficulty: 4, text: 'Design a Docker multi-stage build strategy for a production application.' },
    ],
    'System Design': [
      { id: 'sd_sys_1', difficulty: 1, text: 'What is system design and why is it important?' },
      { id: 'sd_sys_2', difficulty: 2, text: 'Explain microservices vs monolithic architecture.' },
      { id: 'sd_sys_3', difficulty: 3, text: 'How would you design a URL shortening service like bit.ly?' },
      { id: 'sd_sys_4', difficulty: 4, text: 'Design a real-time messaging system like WhatsApp.' },
      { id: 'sd_sys_5', difficulty: 1, text: 'What are the key characteristics of a well-designed system?' },
      { id: 'sd_sys_6', difficulty: 2, text: 'Explain the CAP theorem and its implications for distributed systems.' },
      { id: 'sd_sys_7', difficulty: 3, text: 'How would you design a content delivery network (CDN) for global users?' },
      { id: 'sd_sys_8', difficulty: 4, text: 'Design a distributed rate limiter that works across multiple data centers.' },
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
      { id: 'ml_tf_5', difficulty: 1, text: 'What are tensors and how are they used in TensorFlow?' },
      { id: 'ml_tf_6', difficulty: 2, text: 'Explain TensorFlow Dataset API for data pipelines.' },
      { id: 'ml_tf_7', difficulty: 3, text: 'How do you deploy TensorFlow models using TensorFlow Lite?' },
      { id: 'ml_tf_8', difficulty: 4, text: 'Design a TensorFlow Extended (TFX) pipeline for production ML.' },
    ],
    MLOps: [
      { id: 'ml_ops_1', difficulty: 1, text: 'What is MLOps and why is it important?' },
      { id: 'ml_ops_2', difficulty: 2, text: 'Explain the ML model lifecycle from development to production.' },
      { id: 'ml_ops_3', difficulty: 3, text: 'How do you implement model versioning and A/B testing?' },
      { id: 'ml_ops_4', difficulty: 4, text: 'Design a complete MLOps pipeline with CI/CD for ML models.' },
      { id: 'ml_ops_5', difficulty: 1, text: 'What is model drift and how do you detect it?' },
      { id: 'ml_ops_6', difficulty: 2, text: 'Explain feature stores and their role in MLOps.' },
      { id: 'ml_ops_7', difficulty: 3, text: 'How do you implement model monitoring and alerting in production?' },
      { id: 'ml_ops_8', difficulty: 4, text: 'Design a multi-model serving architecture with canary deployments.' },
    ],
    'Computer Vision': [
      { id: 'ml_cv_1', difficulty: 1, text: 'What is computer vision and what are its applications?' },
      { id: 'ml_cv_2', difficulty: 2, text: 'Explain CNNs and how they process images.' },
      { id: 'ml_cv_3', difficulty: 3, text: 'Compare object detection architectures like YOLO and Faster R-CNN.' },
      { id: 'ml_cv_4', difficulty: 4, text: 'How do vision transformers (ViT) differ from CNNs?' },
      { id: 'ml_cv_5', difficulty: 1, text: 'What is image classification and how does it work?' },
      { id: 'ml_cv_6', difficulty: 2, text: 'Explain data augmentation techniques for computer vision.' },
      { id: 'ml_cv_7', difficulty: 3, text: 'How do you implement semantic segmentation for autonomous driving?' },
      { id: 'ml_cv_8', difficulty: 4, text: 'Design an end-to-end video understanding pipeline using 3D CNNs.' },
    ],
  },
  'Data Analyst': {
    SQL: [
      { id: 'da_sql_1', difficulty: 1, text: 'What are the different types of SQL joins? Explain each.' },
      { id: 'da_sql_2', difficulty: 2, text: 'Explain window functions in SQL with examples.' },
      { id: 'da_sql_3', difficulty: 3, text: 'How do you optimize complex SQL queries for large datasets?' },
      { id: 'da_sql_4', difficulty: 4, text: 'Design a reporting database schema for an e-commerce platform.' },
      { id: 'da_sql_5', difficulty: 1, text: 'What is the difference between UNION and UNION ALL?' },
      { id: 'da_sql_6', difficulty: 2, text: 'Explain CTEs (Common Table Expressions) and recursive queries.' },
      { id: 'da_sql_7', difficulty: 3, text: 'How do you design indexes for analytical query performance?' },
      { id: 'da_sql_8', difficulty: 4, text: 'Design a data warehouse schema using star and snowflake models.' },
    ],
    Python: [
      { id: 'da_py_1', difficulty: 1, text: 'How do you use Python for data analysis?' },
      { id: 'da_py_2', difficulty: 2, text: 'Explain pandas DataFrames and common operations.' },
      { id: 'da_py_3', difficulty: 3, text: 'How do you handle missing data and outliers in Python?' },
      { id: 'da_py_4', difficulty: 4, text: 'Build a data pipeline in Python for ETL processing.' },
      { id: 'da_py_5', difficulty: 1, text: 'What are Python list comprehensions and when should you use them?' },
      { id: 'da_py_6', difficulty: 2, text: 'Explain NumPy arrays vs Python lists for numerical computing.' },
      { id: 'da_py_7', difficulty: 3, text: 'How do you use multiprocessing for parallel data processing in Python?' },
      { id: 'da_py_8', difficulty: 4, text: 'Design a streaming data processing pipeline using PySpark.' },
    ],
    Statistics: [
      { id: 'da_stat_1', difficulty: 1, text: 'What is the difference between descriptive and inferential statistics?' },
      { id: 'da_stat_2', difficulty: 2, text: 'Explain p-values and confidence intervals.' },
      { id: 'da_stat_3', difficulty: 3, text: 'What is A/B testing and how do you determine statistical significance?' },
      { id: 'da_stat_4', difficulty: 4, text: 'Explain Bayesian vs frequentist statistics with examples.' },
      { id: 'da_stat_5', difficulty: 1, text: 'What is the difference between mean, median, and mode?' },
      { id: 'da_stat_6', difficulty: 2, text: 'Explain correlation vs causation with examples.' },
      { id: 'da_stat_7', difficulty: 3, text: 'How do you handle multicollinearity in regression models?' },
      { id: 'da_stat_8', difficulty: 4, text: 'Design a multivariate testing framework for product optimization.' },
    ],
    Tableau: [
      { id: 'da_tab_1', difficulty: 1, text: 'What is Tableau and how is it used for visualization?' },
      { id: 'da_tab_2', difficulty: 2, text: 'Explain Tableau calculated fields and parameters.' },
      { id: 'da_tab_3', difficulty: 3, text: 'How do you create interactive dashboards in Tableau?' },
      { id: 'da_tab_4', difficulty: 4, text: 'Design a Tableau architecture for enterprise self-service analytics.' },
      { id: 'da_tab_5', difficulty: 1, text: 'What are dimensions and measures in Tableau?' },
      { id: 'da_tab_6', difficulty: 2, text: 'Explain Tableau LOD (Level of Detail) expressions.' },
      { id: 'da_tab_7', difficulty: 3, text: 'How do you implement row-level security in Tableau?' },
      { id: 'da_tab_8', difficulty: 4, text: 'Design a Tableau Server deployment strategy for a large organization.' },
    ],
    'Data Visualization': [
      { id: 'da_viz_1', difficulty: 1, text: 'What are the principles of effective data visualization?' },
      { id: 'da_viz_2', difficulty: 2, text: 'How do you choose the right chart type for different data?' },
      { id: 'da_viz_3', difficulty: 3, text: 'Explain how to create a compelling data story with visualization.' },
      { id: 'da_viz_4', difficulty: 4, text: 'Design a visualization system for real-time data monitoring.' },
      { id: 'da_viz_5', difficulty: 1, text: 'What is the difference between exploratory and explanatory visualizations?' },
      { id: 'da_viz_6', difficulty: 2, text: 'Explain color theory and its importance in data visualization.' },
      { id: 'da_viz_7', difficulty: 3, text: 'How do you design accessible visualizations for diverse audiences?' },
      { id: 'da_viz_8', difficulty: 4, text: 'Design a multi-dimensional data visualization using parallel coordinates.' },
    ],
    ETL: [
      { id: 'da_etl_1', difficulty: 1, text: 'What is ETL and why is it important in data analytics?' },
      { id: 'da_etl_2', difficulty: 2, text: 'Explain data warehousing concepts and star schema design.' },
      { id: 'da_etl_3', difficulty: 3, text: 'How do you handle data quality issues in ETL pipelines?' },
      { id: 'da_etl_4', difficulty: 4, text: 'Design a real-time data pipeline using streaming technologies.' },
      { id: 'da_etl_5', difficulty: 1, text: 'What is the difference between ETL and ELT?' },
      { id: 'da_etl_6', difficulty: 2, text: 'Explain data lake vs data warehouse architecture.' },
      { id: 'da_etl_7', difficulty: 3, text: 'How do you implement incremental data loads in ETL pipelines?' },
      { id: 'da_etl_8', difficulty: 4, text: 'Design a data governance framework for enterprise data pipelines.' },
    ],
  },
  'Cloud Engineer': {
    AWS: [
      { id: 'ce_aws_1', difficulty: 1, text: 'What is AWS and what are its core services?' },
      { id: 'ce_aws_2', difficulty: 2, text: 'Explain EC2 vs Lambda and when to use each.' },
      { id: 'ce_aws_3', difficulty: 3, text: 'How would you design a highly available architecture on AWS?' },
      { id: 'ce_aws_4', difficulty: 4, text: 'Design a multi-region disaster recovery strategy on AWS.' },
      { id: 'ce_aws_5', difficulty: 1, text: 'What is S3 and what storage classes does it offer?' },
      { id: 'ce_aws_6', difficulty: 2, text: 'Explain VPC peering and transit gateway in AWS.' },
      { id: 'ce_aws_7', difficulty: 3, text: 'How do you implement auto-scaling and load balancing on AWS?' },
      { id: 'ce_aws_8', difficulty: 4, text: 'Design a serverless architecture using AWS Lambda, API Gateway, and DynamoDB.' },
    ],
    Docker: [
      { id: 'ce_docker_1', difficulty: 1, text: 'How does Docker work and what are images and containers?' },
      { id: 'ce_docker_2', difficulty: 2, text: 'Explain Docker networking and volume management.' },
      { id: 'ce_docker_3', difficulty: 3, text: 'How do you secure Docker containers in production?' },
      { id: 'ce_docker_4', difficulty: 4, text: 'Design a container orchestration strategy for microservices.' },
      { id: 'ce_docker_5', difficulty: 1, text: 'What is the difference between CMD and ENTRYPOINT in Dockerfile?' },
      { id: 'ce_docker_6', difficulty: 2, text: 'Explain Docker Bridge, Host, and Overlay network drivers.' },
      { id: 'ce_docker_7', difficulty: 3, text: 'How do you implement Docker secrets management in production?' },
      { id: 'ce_docker_8', difficulty: 4, text: 'Design a Docker registry and image promotion strategy for CI/CD.' },
    ],
    Kubernetes: [
      { id: 'ce_k8s_1', difficulty: 1, text: 'What is Kubernetes and why use it?' },
      { id: 'ce_k8s_2', difficulty: 2, text: 'Explain Kubernetes pods, deployments, and services.' },
      { id: 'ce_k8s_3', difficulty: 3, text: 'How do you manage Kubernetes scaling and auto-scaling?' },
      { id: 'ce_k8s_4', difficulty: 4, text: 'Design a multi-cluster Kubernetes architecture for global applications.' },
      { id: 'ce_k8s_5', difficulty: 1, text: 'What are Kubernetes namespaces and why are they useful?' },
      { id: 'ce_k8s_6', difficulty: 2, text: 'Explain Kubernetes ConfigMaps and Secrets.' },
      { id: 'ce_k8s_7', difficulty: 3, text: 'How do you implement Kubernetes RBAC and network policies?' },
      { id: 'ce_k8s_8', difficulty: 4, text: 'Design a service mesh architecture using Istio on Kubernetes.' },
    ],
    Terraform: [
      { id: 'ce_tf_1', difficulty: 1, text: 'What is Infrastructure as Code and how does Terraform work?' },
      { id: 'ce_tf_2', difficulty: 2, text: 'Explain Terraform state files and remote state management.' },
      { id: 'ce_tf_3', difficulty: 3, text: 'How do you structure Terraform code for large organizations?' },
      { id: 'ce_tf_4', difficulty: 4, text: 'Design a multi-environment infrastructure pipeline with Terraform.' },
      { id: 'ce_tf_5', difficulty: 1, text: 'What are Terraform providers and modules?' },
      { id: 'ce_tf_6', difficulty: 2, text: 'Explain Terraform workspaces and their use cases.' },
      { id: 'ce_tf_7', difficulty: 3, text: 'How do you implement Terraform policy as code with Sentinel?' },
      { id: 'ce_tf_8', difficulty: 4, text: 'Design a Terraform migration strategy from monolithic to modular state.' },
    ],
    'CI/CD': [
      { id: 'ce_cicd_1', difficulty: 1, text: 'What is CI/CD and why is it important?' },
      { id: 'ce_cicd_2', difficulty: 2, text: 'Explain a typical CI/CD pipeline with Jenkins or GitHub Actions.' },
      { id: 'ce_cicd_3', difficulty: 3, text: 'How do you implement security scanning in CI/CD pipelines?' },
      { id: 'ce_cicd_4', difficulty: 4, text: 'Design a GitOps workflow for automated deployments.' },
      { id: 'ce_cicd_5', difficulty: 1, text: 'What is the difference between continuous delivery and continuous deployment?' },
      { id: 'ce_cicd_6', difficulty: 2, text: 'Explain blue-green deployments vs canary releases.' },
      { id: 'ce_cicd_7', difficulty: 3, text: 'How do you implement secrets management in CI/CD pipelines?' },
      { id: 'ce_cicd_8', difficulty: 4, text: 'Design a multi-branch CI/CD strategy for monorepo architectures.' },
    ],
    Networking: [
      { id: 'ce_net_1', difficulty: 1, text: 'Explain VPC, subnets, and CIDR notation.' },
      { id: 'ce_net_2', difficulty: 2, text: 'How do load balancers work and what types exist?' },
      { id: 'ce_net_3', difficulty: 3, text: 'Explain DNS resolution and CDN architecture.' },
      { id: 'ce_net_4', difficulty: 4, text: 'Design a global network architecture with VPN and Direct Connect.' },
      { id: 'ce_net_5', difficulty: 1, text: 'What is the OSI model and why is it useful?' },
      { id: 'ce_net_6', difficulty: 2, text: 'Explain TCP vs UDP and when to use each.' },
      { id: 'ce_net_7', difficulty: 3, text: 'How do you design a secure network with DMZ, VPN, and firewall rules?' },
      { id: 'ce_net_8', difficulty: 4, text: 'Design a software-defined networking (SDN) architecture for a data center.' },
    ],
  },
  'Cyber Security Analyst': {
    'Network Security': [
      { id: 'cs_ns_1', difficulty: 1, text: 'What is network security and what are its key principles?' },
      { id: 'cs_ns_2', difficulty: 2, text: 'Explain firewall types and how they protect networks.' },
      { id: 'cs_ns_3', difficulty: 3, text: 'How do you design a defense-in-depth network security strategy?' },
      { id: 'cs_ns_4', difficulty: 4, text: 'Design a zero-trust network architecture for an enterprise.' },
      { id: 'cs_ns_5', difficulty: 1, text: 'What is the difference between IDS and IPS?' },
      { id: 'cs_ns_6', difficulty: 2, text: 'Explain VLAN segmentation and its security benefits.' },
      { id: 'cs_ns_7', difficulty: 3, text: 'How do you implement network access control (NAC) in an enterprise?' },
      { id: 'cs_ns_8', difficulty: 4, text: 'Design a secure SD-WAN architecture for distributed organizations.' },
    ],
    Cryptography: [
      { id: 'cs_crypto_1', difficulty: 1, text: 'What is encryption and why is it important?' },
      { id: 'cs_crypto_2', difficulty: 2, text: 'Explain symmetric vs asymmetric encryption.' },
      { id: 'cs_crypto_3', difficulty: 3, text: 'How do TLS/SSL protocols work to secure communications?' },
      { id: 'cs_crypto_4', difficulty: 4, text: 'Explain cryptographic protocols like SSH, IPSec, and their use cases.' },
      { id: 'cs_crypto_5', difficulty: 1, text: 'What is hashing and how does it differ from encryption?' },
      { id: 'cs_crypto_6', difficulty: 2, text: 'Explain digital signatures and public key infrastructure (PKI).' },
      { id: 'cs_crypto_7', difficulty: 3, text: 'How do you implement crypto-shredding for data privacy compliance?' },
      { id: 'cs_crypto_8', difficulty: 4, text: 'Design a quantum-safe cryptographic strategy for long-term data protection.' },
    ],
    'Penetration Testing': [
      { id: 'cs_pt_1', difficulty: 1, text: 'What is penetration testing and why is it conducted?' },
      { id: 'cs_pt_2', difficulty: 2, text: 'Explain the phases of a penetration test.' },
      { id: 'cs_pt_3', difficulty: 3, text: 'What are common web application vulnerabilities and how do you test for them?' },
      { id: 'cs_pt_4', difficulty: 4, text: 'Design a comprehensive security assessment program for an organization.' },
      { id: 'cs_pt_5', difficulty: 1, text: 'What is the difference between vulnerability scanning and penetration testing?' },
      { id: 'cs_pt_6', difficulty: 2, text: 'Explain social engineering testing methodologies.' },
      { id: 'cs_pt_7', difficulty: 3, text: 'How do you conduct wireless network penetration testing?' },
      { id: 'cs_pt_8', difficulty: 4, text: 'Design a red team vs blue team exercise program for continuous improvement.' },
    ],
    SIEM: [
      { id: 'cs_siem_1', difficulty: 1, text: 'What is SIEM and how is it used in security operations?' },
      { id: 'cs_siem_2', difficulty: 2, text: 'Explain log correlation and alerting in SIEM systems.' },
      { id: 'cs_siem_3', difficulty: 3, text: 'How do you tune SIEM rules to reduce false positives?' },
      { id: 'cs_siem_4', difficulty: 4, text: 'Design a SOC architecture with SIEM, SOAR, and threat intelligence.' },
      { id: 'cs_siem_5', difficulty: 1, text: 'What types of logs should be collected in a SIEM system?' },
      { id: 'cs_siem_6', difficulty: 2, text: 'Explain MITRE ATT&CK framework and its use in SIEM.' },
      { id: 'cs_siem_7', difficulty: 3, text: 'How do you implement UEBA (User and Entity Behavior Analytics) in SIEM?' },
      { id: 'cs_siem_8', difficulty: 4, text: 'Design a threat hunting program using SIEM and EDR integration.' },
    ],
    'Incident Response': [
      { id: 'cs_ir_1', difficulty: 1, text: 'What is incident response and what are its stages?' },
      { id: 'cs_ir_2', difficulty: 2, text: 'Explain the NIST incident response framework.' },
      { id: 'cs_ir_3', difficulty: 3, text: 'How do you conduct forensic analysis after a security breach?' },
      { id: 'cs_ir_4', difficulty: 4, text: 'Design an incident response plan for ransomware attacks.' },
      { id: 'cs_ir_5', difficulty: 1, text: 'What is the difference between an incident and a problem?' },
      { id: 'cs_ir_6', difficulty: 2, text: 'Explain chain of custody and evidence handling in digital forensics.' },
      { id: 'cs_ir_7', difficulty: 3, text: 'How do you conduct memory forensics and disk forensics?' },
      { id: 'cs_ir_8', difficulty: 4, text: 'Design a cyber threat intelligence program to proactively prevent incidents.' },
    ],
    Compliance: [
      { id: 'cs_comp_1', difficulty: 1, text: 'What is GDPR and how does it affect data handling?' },
      { id: 'cs_comp_2', difficulty: 2, text: 'Explain SOC 2 compliance and its trust principles.' },
      { id: 'cs_comp_3', difficulty: 3, text: 'How do you implement security controls for ISO 27001 compliance?' },
      { id: 'cs_comp_4', difficulty: 4, text: 'Design a compliance monitoring program for multi-regulation environments.' },
      { id: 'cs_comp_5', difficulty: 1, text: 'What is PCI DSS and who needs to comply?' },
      { id: 'cs_comp_6', difficulty: 2, text: 'Explain HIPAA privacy and security rules for healthcare data.' },
      { id: 'cs_comp_7', difficulty: 3, text: 'How do you implement data classification and data loss prevention (DLP)?' },
      { id: 'cs_comp_8', difficulty: 4, text: 'Design a privacy-by-design framework for a global SaaS product.' },
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
  { id: 'res_gap_1', type: 'adaptive', difficulty: 2, template: 'I notice you have experience with {skill}. How does this relate to other technologies important for this role?' },
  { id: 'res_skill_5', type: 'resume', difficulty: 1, template: 'Can you walk me through how you learned {skill} and what resources you used?' },
  { id: 'res_skill_6', type: 'resume', difficulty: 2, template: 'How do you stay current with updates and best practices in {skill}?' },
  { id: 'res_skill_7', type: 'resume', difficulty: 3, template: 'Describe a time when your expertise in {skill} directly impacted a project outcome.' },
  { id: 'res_skill_8', type: 'resume', difficulty: 4, template: 'How would you teach {skill} to a junior developer on your team?' },
  { id: 'res_proj_3', type: 'resume', difficulty: 3, template: 'Looking at your experience with {skill}, how would you apply it to solve a problem in a different domain?' },
  { id: 'res_proj_4', type: 'resume', difficulty: 2, template: 'What metrics or outcomes did you achieve in your project using {skill}?' },
  { id: 'res_exp_2', type: 'resume', difficulty: 3, template: 'Your resume shows experience with {skill}. Can you describe a situation where you had to choose between {skill} and an alternative?' },
  { id: 'res_comb_1', type: 'resume', difficulty: 3, template: 'How does your experience with {skill} complement the other technologies listed on your resume?' },
  { id: 'res_gap_2', type: 'adaptive', difficulty: 3, template: 'Given your background in {skill}, how would you approach learning {missingSkill} which is important for this role?' },
  { id: 'res_gap_3', type: 'adaptive', difficulty: 4, template: 'Your resume shows strong {skill} skills. How would you leverage that to bridge the gap in {missingSkill}?' },
  { id: 'res_lead_1', type: 'resume', difficulty: 3, template: 'Have you led a team working with {skill}? Describe your leadership approach.' },
  { id: 'res_fail_1', type: 'resume', difficulty: 4, template: 'Tell me about a project where {skill} was not the right choice, and what you learned from that experience.' },
];

const ADAPTIVE_QUESTIONS = [
  { id: 'adap_1', difficulty: 2, type: 'adaptive', text: 'You mentioned {keyword} in your previous answer. Can you elaborate on that?' },
  { id: 'adap_2', difficulty: 3, type: 'adaptive', text: 'Building on your previous answer, how would you handle {scenario}?' },
  { id: 'adap_3', difficulty: 2, type: 'adaptive', text: 'Can you provide a specific example of when you applied {keyword} in practice?' },
  { id: 'adap_4', difficulty: 4, type: 'adaptive', text: 'Given your experience with {keyword}, how would you design a system to handle edge cases?' },
  { id: 'adap_5', difficulty: 1, type: 'adaptive', text: 'You touched on {keyword}. Could you explain the basics of how it works?' },
  { id: 'adap_6', difficulty: 3, type: 'adaptive', text: 'Your answer mentioned {keyword}. What alternatives did you consider and why?' },
  { id: 'adap_7', difficulty: 2, type: 'adaptive', text: 'How does {keyword} compare to other approaches you have used in similar situations?' },
  { id: 'adap_8', difficulty: 4, type: 'adaptive', text: 'Based on your response, how would you scale {keyword} to handle enterprise-level requirements?' },
  { id: 'adap_9', difficulty: 2, type: 'adaptive', text: 'What trade-offs did you consider when implementing {keyword}?' },
  { id: 'adap_10', difficulty: 3, type: 'adaptive', text: 'You mentioned {scenario}. What metrics would you use to measure success in that context?' },
  { id: 'adap_11', difficulty: 1, type: 'adaptive', text: 'What resources or documentation helped you learn about {keyword}?' },
  { id: 'adap_12', difficulty: 4, type: 'adaptive', text: 'How would you troubleshoot a production issue related to {keyword} under time pressure?' },
  { id: 'adap_13', difficulty: 3, type: 'adaptive', text: 'Your answer suggests experience with {keyword}. How do you stay updated on its evolution?' },
  { id: 'adap_14', difficulty: 2, type: 'adaptive', text: 'Can you think of a {scenario} where {keyword} would not be the best approach?' },
  { id: 'adap_15', difficulty: 4, type: 'adaptive', text: 'Design a testing strategy for a system that relies heavily on {keyword}.' },
];

const SCENARIOS = {
  'Software Developer': [
    'a high-traffic e-commerce platform experiencing performance issues',
    'a microservices migration with zero downtime requirement',
    'a real-time collaborative editor like Google Docs',
    'a CI/CD pipeline failing intermittently in production',
    'a legacy codebase that needs modernization without breaking existing features',
  ],
  'AI/ML Engineer': [
    'deploying a model that needs to scale to millions of predictions per day',
    'a production ML model showing significant data drift',
    'building a recommendation system with cold-start problem',
    'implementing MLOps for a team with no prior DevOps experience',
    'optimizing a deep learning pipeline for edge device deployment',
  ],
  'Data Analyst': [
    'analyzing a dataset with missing values and outliers to derive business insights',
    'building a real-time dashboard for executive decision-making',
    'designing an A/B testing framework with multiple concurrent experiments',
    'creating a data quality monitoring system for streaming data pipelines',
    'performing a root cause analysis on a sudden drop in key metrics',
  ],
  'Cloud Engineer': [
    'migrating a legacy on-premise system to the cloud with zero downtime',
    'designing a multi-cloud disaster recovery strategy',
    'optimizing cloud costs for a rapidly growing SaaS platform',
    'implementing compliance controls for financial services in the cloud',
    'building a self-healing infrastructure for a global application',
  ],
  'Cyber Security Analyst': [
    'responding to a suspected data breach with potential data exfiltration',
    'implementing zero-trust architecture for a remote-first organization',
    'conducting a post-mortem after a ransomware attack',
    'building a security awareness program that reduces phishing incidents',
    'designing a threat-hunting program for detecting advanced persistent threats',
  ],
};

let textGenerator = null;
let textGenLoading = false;
let textGenResolvers = [];

async function getTextGenerator() {
  if (textGenerator) return textGenerator;
  if (textGenLoading) {
    return new Promise((resolve) => {
      textGenResolvers.push(resolve);
    });
  }
  textGenLoading = true;
  try {
    textGenerator = await Promise.race([
      pipeline('text-generation', 'Xenova/phi-3-mini-4k-instruct', { quantized: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Model load timeout')), 20000)),
    ]);
    textGenLoading = false;
    textGenResolvers.forEach((r) => r(textGenerator));
    textGenResolvers = [];
    return textGenerator;
  } catch (err) {
    textGenLoading = false;
    textGenResolvers.forEach((r) => r(null));
    textGenResolvers = [];
    console.warn('Phi-3-mini not available, using template fallback:', err.message);
    return null;
  }
}

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

function determineDifficulty(state) {
  const { scores, currentDifficulty, answerHistory } = state;
  const recentAnswers = answerHistory.slice(-3);
  const avgRecent = recentAnswers.length > 0
    ? recentAnswers.reduce((s, a) => s + a.score, 0) / recentAnswers.length
    : 0;

  const compositeScore = avgRecent > 0
    ? avgRecent
    : (scores.semantic + scores.technical + scores.confidence) / 3;

  if (compositeScore > 75) return Math.min(DIFFICULTY.ADVANCED, currentDifficulty + 1);
  if (compositeScore < 50 && currentDifficulty > DIFFICULTY.BEGINNER) {
    return currentDifficulty - 1;
  }
  return currentDifficulty;
}

function selectTargetSkill(state) {
  const { role, resumeSkills, answerHistory, skillGaps } = state;

  if (skillGaps && skillGaps.length > 0) {
    const unansweredGaps = skillGaps.filter((gap) =>
      !answerHistory.some((a) =>
        (a.skill && gap.toLowerCase().includes(a.skill.toLowerCase())) ||
        a.text.toLowerCase().includes(gap.toLowerCase())
      )
    );
    if (unansweredGaps.length > 0) {
      return unansweredGaps[Math.floor(Math.random() * unansweredGaps.length)];
    }
  }

  const lowScoreAnswers = answerHistory
    .filter((a) => a.score < 50 && a.skill)
    .sort((a, b) => a.score - b.score);
  if (lowScoreAnswers.length > 0) {
    return lowScoreAnswers[0].skill;
  }

  const recs = getSkillRecommendations(resumeSkills || [], role);
  if (recs.nextSkills && recs.nextSkills.length > 0) {
    return recs.nextSkills[Math.floor(Math.random() * recs.nextSkills.length)];
  }

  return null;
}

function buildCandidateContext(state) {
  const { role, resumeSkills, answerHistory, skillGaps } = state;
  const parts = [`Role: ${role}`];

  if (resumeSkills && resumeSkills.length > 0) {
    parts.push(`Candidate skills: ${resumeSkills.join(', ')}`);
  }
  if (skillGaps && skillGaps.length > 0) {
    parts.push(`Skill gaps to assess: ${skillGaps.join(', ')}`);
  }
  if (answerHistory.length > 0) {
    const last = answerHistory[answerHistory.length - 1];
    parts.push(`Last answer score: ${last.score}/100 on topic: ${last.skill || 'general'}`);
    if (answerHistory.length >= 2) {
      const trend = answerHistory.slice(-3).map((a) => a.score);
      parts.push(`Recent performance trend: ${trend.join(', ')}`);
    }
  }
  return parts.join('. ');
}

function buildQuestionHistory(state) {
  return state.answerHistory
    .map((a, i) => `${i + 1}. "${a.text.substring(0, 80)}" (score: ${a.score})`)
    .join('\n');
}

function selectQuestionType(state) {
  const { answerHistory } = state;
  const typeCount = {};
  QUESTION_TYPES.forEach((t) => { typeCount[t] = 0; });
  answerHistory.forEach((a) => {
    if (typeCount[a.type] !== undefined) typeCount[a.type]++;
  });

  const types = shuffleArray(QUESTION_TYPES.slice());
  const sorted = types.sort((a, b) => typeCount[a] - typeCount[b]);
  return sorted[0];
}

async function generateWithLLM(state, difficulty, targetSkill, questionType) {
  const generator = await getTextGenerator();
  if (!generator) return null;

  const candidateContext = buildCandidateContext(state);
  const questionHistory = buildQuestionHistory(state);
  const diffLabel = DIFFICULTY_LABEL[difficulty] || 'intermediate';

  const typeGuide = {
    technical: `Assess the candidate's knowledge of "${targetSkill || 'core concepts'}"`,
    behavioral: `Ask about a real scenario where they applied "${targetSkill || 'relevant skills'}"`,
    resume: `Ask them to elaborate on their experience with "${targetSkill || 'a listed skill'}" from their resume`,
    adaptive: `Build on their previous answer and probe deeper into "${targetSkill || 'the topic they discussed'}"`,
  };

  const prompt = `<|user|>You are an expert technical interviewer. Generate a single ${diffLabel}-level ${questionType} interview question for a ${state.role} candidate.

Context: ${candidateContext}

${typeGuide[questionType] || typeGuide.technical}.

Previous questions asked (DO NOT repeat these):
${questionHistory || 'None yet'}

Constraints:
- Question must be ${diffLabel} difficulty (${difficulty === 1 ? 'basic/foundational concepts' : difficulty === 2 ? 'applied knowledge requiring examples' : 'complex/system-level thinking requiring deep expertise'})
- Must be different from all previous questions
- Must be a single clear question, no bullet points
- Do not prefix with anything, just output the question
<|end|>
<|assistant|>`;

  try {
    const result = await generator(prompt, {
      max_new_tokens: 100,
      temperature: 0.8,
      top_p: 0.9,
      do_sample: true,
    });
    let text = result[0]?.generated_text || '';
    text = text.split('<|assistant|>')[1] || text;
    text = text.replace(/["""]/g, '').trim();
    if (!text || text.length < 10) return null;
    return text;
  } catch (err) {
    console.warn('LLM generation failed:', err.message);
    return null;
  }
}

function generateFromOriginalBanks(state, difficulty, targetSkill, questionType) {
  const askedTexts = new Set(state.answerHistory.map((a) => (a.text || '').toLowerCase().trim()));
  const { role, resumeSkills, answerHistory } = state;

  const roleQuestions = TECHNICAL_QUESTIONS[role];
  const skillKeys = roleQuestions ? Object.keys(roleQuestions) : [];

  switch (questionType) {
    case 'hr': {
      const candidates = HR_QUESTIONS.filter((q) => q.difficulty <= difficulty && !askedTexts.has((q.text || '').toLowerCase().trim()));
      if (candidates.length === 0) break;
      const q = pickRandom(candidates);
      return { id: q.id + '_' + Date.now(), type: 'hr', difficulty, text: q.text, metadata: { skill: null, source: 'hr' } };
    }

    case 'behavioral': {
      const candidates = BEHAVIORAL_QUESTIONS.filter((q) => q.difficulty <= difficulty && !askedTexts.has((q.text || '').toLowerCase().trim()));
      if (candidates.length === 0) break;
      const q = pickRandom(candidates);
      return { id: q.id + '_' + Date.now(), type: 'behavioral', difficulty, text: q.text, metadata: { skill: null, source: 'behavioral' } };
    }

    case 'resume': {
      if (!resumeSkills || resumeSkills.length === 0) break;
      const shuffledSkills = shuffleArray(resumeSkills);
      for (const skill of shuffledSkills) {
        const candidates = RESUME_TEMPLATES.filter((t) => t.difficulty === difficulty && !askedTexts.has((t.template || '').toLowerCase().trim()));
        if (candidates.length === 0) continue;
        const template = pickRandom(candidates);
        const missingSkills = state.skillGaps || [];
        const missingSkill = missingSkills.length > 0 ? missingSkills[Math.floor(Math.random() * missingSkills.length)] : 'advanced concepts';
        const text = template.template
          .replace('{skill}', skill)
          .replace('{exp}', 'several')
          .replace('{missingSkill}', missingSkill);
        return { id: template.id + '_' + skill.toLowerCase().replace(/\s+/g, '_'), type: 'resume', difficulty, text, metadata: { skill, source: 'resume' } };
      }
      break;
    }

    case 'adaptive': {
      if (!answerHistory || answerHistory.length === 0) break;
      const lastAnswer = answerHistory[answerHistory.length - 1];
      const words = (lastAnswer.text || '').split(' ').filter((w) => w.length > 4);
      const techWords = ['react', 'node', 'python', 'api', 'database', 'cloud', 'docker', 'aws', 'ml', 'ai', 'algorithm', 'framework', 'system', 'design', 'test', 'deploy', 'pipeline', 'model', 'data', 'server'];
      const matched = words.filter((w) => techWords.some((t) => w.toLowerCase().includes(t)));
      const keyword = matched.length > 0 ? pickRandom(matched) : 'your approach';
      const roleScenarios = SCENARIOS[role];
      const scenario = Array.isArray(roleScenarios) ? pickRandom(roleScenarios) : (roleScenarios || 'a complex technical challenge');
      const candidates = ADAPTIVE_QUESTIONS.filter((q) => q.difficulty <= difficulty && !askedTexts.has((q.text || '').toLowerCase().trim()));
      if (candidates.length === 0) break;
      const template = pickRandom(candidates);
      return { id: template.id + '_' + Date.now(), type: 'adaptive', difficulty: template.difficulty, text: template.text.replace('{keyword}', keyword).replace('{scenario}', scenario), metadata: { keyword, source: 'adaptive' } };
    }

    case 'technical':
    default: {
      if (!roleQuestions || skillKeys.length === 0) break;
      let available = [];
      const preferredSkill = targetSkill && roleQuestions[targetSkill] ? targetSkill : null;

      if (preferredSkill && roleQuestions[preferredSkill]) {
        const fromSkill = roleQuestions[preferredSkill].filter((q) => q.difficulty === difficulty && !askedTexts.has((q.text || '').toLowerCase().trim()));
        if (fromSkill.length > 0) available = fromSkill;
      }

      if (available.length === 0) {
        const shuffled = shuffleArray(skillKeys);
        for (const skill of shuffled) {
          const fromSkill = roleQuestions[skill].filter((q) => q.difficulty === difficulty && !askedTexts.has((q.text || '').toLowerCase().trim()));
          if (fromSkill.length > 0) { available = fromSkill; break; }
        }
      }

      if (available.length === 0) {
        const oneUp = Math.min(difficulty + 1, 4);
        const oneDown = Math.max(difficulty - 1, 1);
        const shuffled = shuffleArray(skillKeys);
        for (const skill of shuffled) {
          for (const d of [oneUp, oneDown, difficulty]) {
            const fromSkill = roleQuestions[skill].filter((q) => q.difficulty === d && !askedTexts.has((q.text || '').toLowerCase().trim()));
            if (fromSkill.length > 0) { available = fromSkill; break; }
          }
          if (available.length > 0) break;
        }
      }

      if (available.length === 0) break;
      const q = pickRandom(available);
      return { id: q.id + '_' + Date.now(), type: 'technical', difficulty, text: q.text, metadata: { skill: targetSkill || skillKeys[0], source: 'technical' } };
    }
  }

  return null;
}

const FALLBACK_TEXTS = [
  'Can you describe a technical project you have worked on recently and the challenges you faced?',
  'What interests you most about the technology you currently work with?',
  'Tell me about a time you had to solve a difficult problem. What was your approach?',
  'How do you stay current with developments in your field?',
  'What is the most impactful project you have worked on and why?',
  'Describe a situation where you had to collaborate with others to achieve a technical goal.',
  'What technical skill are you currently trying to improve and why?',
  'Tell me about a time you had to make a decision with incomplete information.',
];

const USED_FALLBACKS = new Set();

function textSimilarity(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

async function ensureUniqueness(questionText, state) {
  if (!state.answerHistory || state.answerHistory.length === 0) return true;

  let embeddingAvailable = true;
  try {
    for (const prev of state.answerHistory) {
      if (prev.text) {
        const sim = await getSimilarity(questionText, prev.text);
        if (sim > 0.75) return false;
      }
    }
  } catch {
    embeddingAvailable = false;
  }

  if (!embeddingAvailable) {
    for (const prev of state.answerHistory) {
      if (prev.text && textSimilarity(questionText, prev.text) > 0.65) return false;
    }
  }
  return true;
}

async function generateQuestion(state) {
  const difficulty = determineDifficulty(state);
  const targetSkill = selectTargetSkill(state);

  const askedTexts = new Set(state.answerHistory.map((a) => a.text.toLowerCase().trim()));

  for (let attempt = 0; attempt < 5; attempt++) {
    let text = null;
    let questionType = null;
    let source = null;

    if (attempt === 0) {
      questionType = selectQuestionType(state);
      text = await generateWithLLM(state, difficulty, targetSkill, questionType);
      source = 'llm';
    }

    if (!text) {
      questionType = selectQuestionType(state);
      const generated = generateFromOriginalBanks(state, difficulty, targetSkill, questionType);
      if (generated) {
        text = generated.text;
        questionType = generated.type;
        source = generated.metadata?.source || 'bank';

        const normalized = text.toLowerCase().trim();
        if (askedTexts.has(normalized)) {
          text = null;
          continue;
        }
      }
    }

    if (!text) {
      const synonyms = ['React', 'Node.js', 'Python', 'Docker', 'AWS', 'APIs', 'databases', 'testing'];
      const syn = pickRandom(synonyms);
      const altTexts = [
        `Can you walk me through how you would approach building a system using ${syn}?`,
        `What experience do you have with ${syn} and how have you applied it in your work?`,
        `How would you explain ${syn} to someone new to the field?`,
        `What are common pitfalls when working with ${syn} and how do you avoid them?`,
      ];
      text = pickRandom(altTexts);
      source = 'alt-fallback';
    }

    if (!text) {
      text = FALLBACK_TEXTS[attempt % FALLBACK_TEXTS.length];
      source = 'fallback';
    }

    const normalized = text.toLowerCase().trim();
    if (askedTexts.has(normalized)) continue;

    const isUnique = await ensureUniqueness(text, state);
    if (!isUnique) continue;

    const questionId = `adap_${Date.now()}_${attempt}`;

    return {
      id: questionId,
      type: questionType || 'technical',
      difficulty,
      text,
      metadata: {
        skill: targetSkill || null,
        rationale: difficulty > state.currentDifficulty
          ? 'Increasing difficulty based on strong performance'
          : difficulty < state.currentDifficulty
            ? 'Reinforcing foundational concepts'
            : 'Continuing at current difficulty level',
        followUpTo: state.answerHistory.length > 0
          ? state.answerHistory[state.answerHistory.length - 1].questionId || null
          : null,
        generationMethod: source,
      },
    };
  }

  return {
    id: `fallback_${Date.now()}`,
    type: 'technical',
    difficulty: DIFFICULTY.BEGINNER,
    text: 'Can you describe a technical project you have worked on recently and the challenges you faced?',
    metadata: {
      skill: null,
      rationale: 'Fallback question after all generation attempts',
      followUpTo: null,
      generationMethod: 'fallback',
    },
  };
}

function createInitialState({ role, resumeSkills, skillGaps }) {
  return {
    role,
    resumeSkills: resumeSkills || [],
    skillGaps: skillGaps || [],
    answerHistory: [],
    scores: { technical: 0, communication: 0, confidence: 0, semantic: 0 },
    currentDifficulty: DIFFICULTY.BEGINNER,
    currentQuestionIndex: 0,
    maxQuestions: 8,
  };
}

module.exports = {
  generateQuestion,
  determineDifficulty,
  selectTargetSkill,
  createInitialState,
  DIFFICULTY,
};