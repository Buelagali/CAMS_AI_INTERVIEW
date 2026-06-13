import axios from 'axios';

export async function fetchQuestions(role) {
  try {
    const { data } = await axios.get('/api/interview/questions', {
      params: { role },
    });
    return data.questions;
  } catch (err) {
    console.error('Failed to fetch questions:', err);
    return getFallbackQuestions(role);
  }
}

export function getFallbackQuestions(role) {
  const banks = {
    'Software Developer': [
      { id: 1, type: 'hr', question: 'Tell me about yourself.' },
      { id: 2, type: 'technical', question: 'Explain React Hooks.' },
      { id: 3, type: 'technical', question: 'What is the difference between REST and GraphQL?' },
      { id: 4, type: 'behavioral', question: 'Describe a challenging bug you fixed.' },
      { id: 5, type: 'technical', question: 'Explain the virtual DOM.' },
      { id: 6, type: 'behavioral', question: 'How do you handle tight deadlines?' },
      { id: 7, type: 'hr', question: 'Where do you see yourself in 5 years?' },
      { id: 8, type: 'technical', question: 'What are microservices?' },
    ],
    'AI/ML Engineer': [
      { id: 1, type: 'hr', question: 'Tell me about yourself.' },
      { id: 2, type: 'technical', question: 'Explain supervised vs unsupervised learning.' },
      { id: 3, type: 'technical', question: 'What is overfitting and how to prevent it?' },
      { id: 4, type: 'technical', question: 'Explain transformers in NLP.' },
      { id: 5, type: 'behavioral', question: 'Describe an ML project you deployed.' },
      { id: 6, type: 'technical', question: 'What evaluation metrics for classification?' },
      { id: 7, type: 'behavioral', question: 'How do you handle imbalanced datasets?' },
      { id: 8, type: 'hr', question: 'Why AI/ML?' },
    ],
    'Data Analyst': [
      { id: 1, type: 'hr', question: 'Tell me about yourself.' },
      { id: 2, type: 'technical', question: 'SQL vs NoSQL differences.' },
      { id: 3, type: 'technical', question: 'What is a p-value?' },
      { id: 4, type: 'technical', question: 'How do you handle missing data?' },
      { id: 5, type: 'behavioral', question: 'Describe a data-driven decision.' },
      { id: 6, type: 'technical', question: 'Explain SQL joins.' },
      { id: 7, type: 'behavioral', question: 'How do you present to stakeholders?' },
      { id: 8, type: 'hr', question: 'What analysis tools do you use?' },
    ],
    'Cloud Engineer': [
      { id: 1, type: 'hr', question: 'Tell me about yourself.' },
      { id: 2, type: 'technical', question: 'IaaS vs PaaS vs SaaS.' },
      { id: 3, type: 'technical', question: 'How does Docker work?' },
      { id: 4, type: 'technical', question: 'Explain CI/CD pipelines.' },
      { id: 5, type: 'behavioral', question: 'Describe a cloud migration.' },
      { id: 6, type: 'technical', question: 'What is Kubernetes?' },
      { id: 7, type: 'behavioral', question: 'How do you ensure cloud security?' },
      { id: 8, type: 'hr', question: 'Which cloud providers?' },
    ],
    'Cyber Security Analyst': [
      { id: 1, type: 'hr', question: 'Tell me about yourself.' },
      { id: 2, type: 'technical', question: 'Threat vs vulnerability vs risk.' },
      { id: 3, type: 'technical', question: 'Explain OWASP Top 10.' },
      { id: 4, type: 'technical', question: 'How do you handle a breach?' },
      { id: 5, type: 'behavioral', question: 'Describe a security incident.' },
      { id: 6, type: 'technical', question: 'Why is encryption important?' },
      { id: 7, type: 'behavioral', question: 'How to stay updated on threats?' },
      { id: 8, type: 'hr', question: 'Why cybersecurity?' },
    ],
  };
  return banks[role] || banks['Software Developer'];
}
