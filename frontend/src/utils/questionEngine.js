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
      { id: 'ml_py_5', difficulty: 1, text: 'How do you manage Python virtual environments and dependencies?' },
      { id: 'ml_py_6', difficulty: 2, text: 'Explain NumPy broadcasting and vectorization for performance.' },
      { id: 'ml_py_7', difficulty: 3, text: 'How do you profile and optimize Python memory usage?' },
      { id: 'ml_py_8', difficulty: 4, text: 'Design a Python-based distributed computing solution using Dask or Ray.' },
    ],
    'Machine Learning': [
      { id: 'ml_ml_1', difficulty: 1, text: 'What is the difference between supervised and unsupervised learning?' },
      { id: 'ml_ml_2', difficulty: 2, text: 'Explain the bias-variance tradeoff in machine learning.' },
      { id: 'ml_ml_3', difficulty: 3, text: 'How do you handle imbalanced datasets in classification?' },
      { id: 'ml_ml_4', difficulty: 4, text: 'Explain ensemble methods and when to use bagging vs boosting.' },
      { id: 'ml_ml_5', difficulty: 1, text: 'What is cross-validation and why is it important?' },
      { id: 'ml_ml_6', difficulty: 2, text: 'Explain regularization techniques: L1, L2, and Elastic Net.' },
      { id: 'ml_ml_7', difficulty: 3, text: 'How do you perform feature selection and dimensionality reduction?' },
      { id: 'ml_ml_8', difficulty: 4, text: 'Design an automated hyperparameter optimization pipeline.' },
    ],
    'Deep Learning': [
      { id: 'ml_dl_1', difficulty: 1, text: 'What is a neural network and how does it learn?' },
      { id: 'ml_dl_2', difficulty: 2, text: 'Explain backpropagation and gradient descent.' },
      { id: 'ml_dl_3', difficulty: 3, text: 'What is overfitting in deep learning and how do you prevent it?' },
      { id: 'ml_dl_4', difficulty: 4, text: 'Explain transformers and self-attention mechanisms in detail.' },
      { id: 'ml_dl_5', difficulty: 1, text: 'What are activation functions and which ones are commonly used?' },
      { id: 'ml_dl_6', difficulty: 2, text: 'Explain batch normalization, layer normalization, and when to use each.' },
      { id: 'ml_dl_7', difficulty: 3, text: 'How do you implement transfer learning and fine-tuning?' },
      { id: 'ml_dl_8', difficulty: 4, text: 'Design a distributed training strategy for large language models.' },
    ],
    NLP: [
      { id: 'ml_nlp_1', difficulty: 1, text: 'What is NLP and what are common NLP tasks?' },
      { id: 'ml_nlp_2', difficulty: 2, text: 'Explain word embeddings like Word2Vec and GloVe.' },
      { id: 'ml_nlp_3', difficulty: 3, text: 'How do transformer models like BERT work for NLP?' },
      { id: 'ml_nlp_4', difficulty: 4, text: 'Compare encoder-only, decoder-only, and encoder-decoder transformer architectures.' },
      { id: 'ml_nlp_5', difficulty: 1, text: 'What is tokenization and what are common tokenization algorithms?' },
      { id: 'ml_nlp_6', difficulty: 2, text: 'Explain sequence-to-sequence models and attention mechanisms.' },
      { id: 'ml_nlp_7', difficulty: 3, text: 'How do you fine-tune a pre-trained language model for a specific task?' },
      { id: 'ml_nlp_8', difficulty: 4, text: 'Design a multilingual NLP pipeline for low-resource languages.' },
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
  { id: 'res_exp_1', type: 'resume', difficulty: 2, template: 'What key lessons have you learned from your projects and how have they shaped your approach to development?' },
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

const ROLE_FALLBACKS = {
  'Software Developer': [
    'Tell me about a project where you used {skill} to solve a real-world problem.',
    'How do you approach debugging issues in a {skill} codebase?',
    'What best practices do you follow when writing {skill} code?',
    'Describe a challenge you faced while working with {skill} and how you overcame it.',
    'How do you test and validate your {skill} implementations?',
    'What considerations do you keep in mind when designing systems with {skill}?',
    'How has your experience with {skill} shaped your approach to software architecture?',
    'Tell me about a time you optimized a {skill} application for better performance.',
    'What tools and practices do you use alongside {skill} to ensure code quality?',
    'How do you stay updated with the latest developments in {skill}?',
  ],
  'AI/ML Engineer': [
    'Tell me about a project where you applied {skill} to solve a machine learning problem.',
    'How do you approach data preprocessing and feature engineering when using {skill}?',
    'What challenges have you faced when deploying {skill} models to production?',
    'Describe how you evaluate and validate models built with {skill}.',
    'How do you handle data quality issues in your {skill} pipelines?',
    'What strategies do you use for hyperparameter tuning with {skill}?',
    'Tell me about a time you had to optimize a {skill} model for performance or memory.',
    'How do you ensure reproducibility in your {skill} experiments?',
    'What is your approach to version controlling {skill} models and datasets?',
    'How do you explain {skill} model predictions to non-technical stakeholders?',
  ],
  'Data Analyst': [
    'Tell me about a project where you used {skill} to derive actionable insights.',
    'How do you handle missing or inconsistent data when working with {skill}?',
    'Describe a complex analysis you performed using {skill} and what you discovered.',
    'How do you ensure the accuracy and reliability of your {skill} analyses?',
    'What visualization techniques do you prefer when presenting {skill} findings?',
    'Tell me about a time {skill} helped you identify an unexpected trend or pattern.',
    'How do you approach exploratory data analysis with {skill}?',
    'What strategies do you use to communicate {skill} insights to decision-makers?',
    'How do you manage and organize large datasets when using {skill}?',
    'Describe a time you automated a repetitive analysis task using {skill}.',
  ],
  'Cloud Engineer': [
    'Tell me about a project where you used {skill} to design a cloud infrastructure.',
    'How do you approach security and compliance when configuring {skill}?',
    'Describe a challenge you faced while migrating workloads with {skill}.',
    'How do you monitor and optimize costs when using {skill}?',
    'What is your strategy for high availability and disaster recovery with {skill}?',
    'Tell me about a time you automated infrastructure provisioning using {skill}.',
    'How do you handle scaling and performance tuning with {skill}?',
    'What logging and monitoring practices do you implement alongside {skill}?',
    'Describe how you manage access control and permissions in {skill}.',
    'How do you approach incident response in a {skill} environment?',
  ],
  'Cyber Security Analyst': [
    'Tell me about a project where you used {skill} to identify or mitigate a security threat.',
    'How do you approach vulnerability assessment and remediation with {skill}?',
    'Describe a security incident you analyzed using {skill} and what you found.',
    'How do you stay current with emerging threats relevant to {skill}?',
    'What is your methodology for conducting security audits with {skill}?',
    'Tell me about a time you implemented a security control using {skill}.',
    'How do you balance security requirements with usability when working with {skill}?',
    'What tools do you integrate with {skill} for comprehensive security monitoring?',
    'Describe how you would respond to a breach involving {skill}.',
    'How do you document and communicate findings from your {skill} security assessments?',
  ],
};

const SCENARIOS = {
  'Software Developer': 'a high-traffic e-commerce platform experiencing performance issues',
  'AI/ML Engineer': 'deploying a model that needs to scale to millions of predictions per day',
  'Data Analyst': 'analyzing a dataset with missing values and outliers to derive business insights',
  'Cloud Engineer': 'migrating a legacy on-premise system to the cloud with zero downtime',
  'Cyber Security Analyst': 'responding to a suspected data breach with potential data exfiltration',
};

function wordOverlapRatio(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

function isDuplicate(text, askedTexts) {
  const t = text.toLowerCase().trim();
  if (askedTexts.has(t)) return true;
  for (const asked of askedTexts) {
    if (wordOverlapRatio(t, asked) > 0.7) return true;
  }
  return false;
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

function getDifficultyFromScores(scores) {
  const avgScore = (
    (scores.technical || 0) +
    (scores.semantic || 0) +
    (scores.confidence || 0)
  ) / 3;

  if (avgScore >= 65) return DIFFICULTY.ADVANCED;
  if (avgScore >= 35) return DIFFICULTY.INTERMEDIATE;
  return DIFFICULTY.BEGINNER;
}

function getNextQuestionType(interviewMemory) {
  const { askedQuestions } = interviewMemory;

  if (askedQuestions.length === 0) return 'hr';

  const typeCount = {};
  QUESTION_TYPES.forEach((t) => { typeCount[t] = 0; });
  askedQuestions.forEach((q) => {
    if (typeCount[q.type] !== undefined) typeCount[q.type]++;
  });

  const shuffled = shuffleArray(QUESTION_TYPES.slice());
  const leastAsked = shuffled.sort((a, b) => typeCount[a] - typeCount[b]);
  return leastAsked[0];
}

function generateResumeQuestion(resumeSkills, difficulty, askedTexts) {
  if (!resumeSkills || resumeSkills.length === 0) return null;

  const availableSkills = resumeSkills;
  const shuffled = shuffleArray(availableSkills);

  for (const skill of shuffled) {
    const candidates = RESUME_TEMPLATES.filter(
      (t) => t.difficulty === difficulty && !isDuplicate(t.template, askedTexts)
    );
    if (candidates.length === 0) continue;

    const template = pickRandom(candidates);
    const text = template.template
      .replace('{skill}', skill);
    if (isDuplicate(text, askedTexts)) continue;
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

function generateAdaptiveQuestion(interviewMemory, difficulty, askedTexts) {
  const { answers } = interviewMemory;
  if (!answers || answers.length === 0) return null;

  const lastAnswer = answers[answers.length - 1];
  const words = (lastAnswer.answer || '').split(' ').filter((w) => w.length > 4);
  const techWords = ['react', 'node', 'python', 'api', 'database', 'cloud', 'docker', 'aws', 'ml', 'ai', 'algorithm', 'framework', 'system', 'design', 'test', 'deploy', 'pipeline', 'model', 'data', 'server'];
  const matched = words.filter((w) => techWords.some((t) => w.toLowerCase().includes(t)));

  const keyword = matched.length > 0 ? pickRandom(matched) : 'your approach';
  const scenario = SCENARIOS[interviewMemory.role] || 'a complex technical challenge';

  const candidates = ADAPTIVE_QUESTIONS.filter(
    (q) => q.difficulty <= difficulty && !isDuplicate(q.text, askedTexts)
  );
  if (candidates.length === 0) return null;

  const template = pickRandom(candidates);
  const text = template.text.replace('{keyword}', keyword).replace('{scenario}', scenario);
  if (isDuplicate(text, askedTexts)) return null;
  return {
    id: template.id + '_' + Date.now(),
    type: 'adaptive',
    difficulty: template.difficulty,
    text,
    source: 'adaptive',
  };
}

function generateTechnicalQuestion(role, difficulty, askedTexts, preferredSkill) {
  const roleQuestions = TECHNICAL_QUESTIONS[role];
  if (!roleQuestions) return null;

  let available = [];
  const skillKeys = Object.keys(roleQuestions);

  if (preferredSkill && roleQuestions[preferredSkill]) {
    const fromSkill = roleQuestions[preferredSkill].filter(
      (q) => q.difficulty === difficulty && !isDuplicate(q.text, askedTexts)
    );
    if (fromSkill.length > 0) available = fromSkill;
  }

  if (available.length === 0) {
    const shuffledSkills = shuffleArray(skillKeys);
    for (const skill of shuffledSkills) {
      const fromSkill = roleQuestions[skill].filter(
        (q) => q.difficulty === difficulty && !isDuplicate(q.text, askedTexts)
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
          (q) => q.difficulty === d && !isDuplicate(q.text, askedTexts)
        );
        if (fromSkill.length > 0) { available = fromSkill; break; }
      }
      if (available.length > 0) break;
    }
  }

  if (available.length === 0) return null;
  return { ...pickRandom(available), type: 'technical', source: 'technical' };
}

function generateHRQuestion(difficulty, askedTexts) {
  const candidates = HR_QUESTIONS.filter(
    (q) => q.difficulty <= difficulty && !isDuplicate(q.text, askedTexts)
  );
  if (candidates.length === 0) return null;
  return { ...pickRandom(candidates), type: 'hr', source: 'hr' };
}

function generateBehavioralQuestion(difficulty, askedTexts) {
  const candidates = BEHAVIORAL_QUESTIONS.filter(
    (q) => q.difficulty <= difficulty && !isDuplicate(q.text, askedTexts)
  );
  if (candidates.length === 0) return null;
  return { ...pickRandom(candidates), type: 'behavioral', source: 'behavioral' };
}

export function generateQuestion({ role, resumeSkills, interviewMemory, currentEmotion }) {
  const { askedQuestions, scores } = interviewMemory;
  const askedTexts = new Set(askedQuestions.map((q) => (q.text || '').toLowerCase().trim()));

  let difficulty = getDifficultyFromScores(scores);

  const questionType = getNextQuestionType(interviewMemory);

  let question = null;

  switch (questionType) {
    case 'hr':
      question = generateHRQuestion(difficulty, askedTexts);
      break;
    case 'resume':
      question = generateResumeQuestion(resumeSkills, difficulty, askedTexts);
      if (!question) question = generateTechnicalQuestion(role, difficulty, askedTexts, null);
      break;
    case 'behavioral':
      question = generateBehavioralQuestion(difficulty, askedTexts);
      if (!question) question = generateHRQuestion(difficulty, askedTexts);
      break;
    case 'adaptive':
      question = generateAdaptiveQuestion(interviewMemory, difficulty, askedTexts);
      if (!question) question = generateBehavioralQuestion(difficulty, askedTexts);
      break;
    case 'technical':
    default: {
      const preferredSkill = resumeSkills && resumeSkills.length > 0
        ? pickRandom(resumeSkills)
        : null;
      question = generateTechnicalQuestion(role, difficulty, askedTexts, preferredSkill);
      if (!question) question = generateBehavioralQuestion(difficulty, askedTexts);
      if (!question) question = generateHRQuestion(difficulty, askedTexts);
      break;
    }
  }

  if (!question) {
    const rolePool = ROLE_FALLBACKS[role] || ROLE_FALLBACKS['Software Developer'];
    const skill = (resumeSkills && resumeSkills.length > 0)
      ? pickRandom(resumeSkills) : pickRandom(ROLE_SKILLS[role] || ['technology']);
    const filled = rolePool.map((t) => t.replace('{skill}', skill));
    const available = filled.filter((t) => !askedTexts.has(t.toLowerCase().trim()) && !isDuplicate(t, askedTexts));
    if (available.length > 0) {
      question = {
        id: 'fallback_' + Date.now(),
        type: 'technical',
        difficulty: 1,
        text: pickRandom(available),
        source: 'role-fallback',
      };
    } else {
      const altSkill = pickRandom(['React', 'Node.js', 'Python', 'Docker', 'AWS', 'APIs', 'databases', 'testing']);
      question = {
        id: 'fallback_' + Date.now(),
        type: 'technical',
        difficulty: 1,
        text: `Can you walk me through how you approach building systems with ${altSkill}?`,
        source: 'fallback',
      };
    }
  }

  return question;
}

export function fetchAdaptiveQuestion(sessionId) {
  return fetch(`/api/interview/session/${sessionId}/next-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch adaptive question');
    return res.json();
  });
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

  let score = Math.round(
    overlapScore * 0.25 +
    lengthScore * 0.20 +
    technicalDepth * 0.30 +
    confidenceBoost +
    Math.random() * 10
  );

  if (difficulty >= 3) score = Math.min(100, score + 5);
  if (difficulty >= 4) score = Math.min(100, score + 5);

  return Math.max(10, Math.min(100, score));
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