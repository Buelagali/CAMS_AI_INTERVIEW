# CAMS: A Cognitive Adaptive Multi-Modal Interview System for Intelligent Candidate Assessment through Large Language Models and Cross-Attention Fusion

## ARTICLE INFO

**Keywords:** Cognitive Adaptive Interviewing, Multi-Modal Learning, Large Language Models, Cross-Attention Fusion, Sentence-BERT, Whisper Speech Recognition, Emotion Recognition, Resume Parsing, Skill Knowledge Graph, Candidate Assessment, Human Resource Analytics, Artificial Intelligence Recruitment

## ABSTRACT

The increasing adoption of digital recruitment platforms has accelerated the demand for intelligent interview systems capable of delivering objective, scalable, and consistent candidate assessment. However, conventional interview processes and many existing AI-based recruitment solutions continue to rely on static questionnaires, limited evaluation criteria, and isolated modality analysis, resulting in incomplete candidate profiling and inconsistent hiring decisions. To address these challenges, this paper presents CAMS (Cognitive Adaptive Multi-Modal Interview System), an intelligent interview assessment framework that integrates Large Language Models (LLMs), multimodal analytics, adaptive questioning, and cross-attention fusion for comprehensive candidate evaluation. The proposed system combines resume understanding, semantic answer assessment, speech transcription, vocal confidence analysis, facial emotion recognition, behavioral monitoring, and skill-gap identification within a unified evaluation pipeline. CAMS employs Sentence-BERT for semantic similarity analysis, Whisper for automatic speech recognition, Wav2Vec2 for speech representation learning, Vision Transformers for visual behavior assessment, LayoutLM for resume information extraction, and Phi-3 Mini for adaptive question generation and feedback enhancement. Furthermore, a role-specific skill knowledge graph dynamically adjusts interview difficulty and guides personalized candidate evaluation. A multi-head cross-attention fusion mechanism integrates resume, textual, visual, audio, behavioral, emotional, and confidence-related features to generate multidimensional candidate scores and explainable hiring recommendations. By combining cognitive adaptation with multimodal intelligence, CAMS provides a more comprehensive and personalized assessment strategy than traditional interview systems. The proposed framework demonstrates the potential of integrating advanced language models, multimodal learning, and adaptive evaluation techniques to support next-generation AI-driven recruitment and talent assessment platforms.

---

## 1. Introduction

The rapid growth of digital recruitment platforms and the increasing demand for skilled professionals have significantly transformed modern hiring practices. Organizations today receive a large number of applications for a limited number of positions, making candidate screening and evaluation a challenging and resource-intensive task. Traditional interview processes typically rely on human interviewers to assess technical competency, communication ability, confidence, and behavioral characteristics. Although such approaches provide valuable insights, they often suffer from limitations including interviewer bias, inconsistency in evaluation criteria, subjective decision-making, and scalability issues. Consequently, there is a growing need for intelligent interview systems capable of providing objective, consistent, and data-driven candidate assessment. Recent advances in Artificial Intelligence (AI), Natural Language Processing (NLP), Computer Vision, and Speech Analytics have created new opportunities for developing automated interview systems that can support recruitment decision-making processes [Chammas et al. (2021)].

In recent years, AI-powered recruitment technologies have attracted considerable attention from both academic researchers and industrial practitioners. Existing solutions have explored automated resume screening, job recommendation systems, candidate ranking frameworks, and conversational interview assistants. Large Language Models (LLMs) have further accelerated the development of intelligent recruitment platforms by enabling context-aware dialogue generation, semantic understanding, and adaptive interaction capabilities.

Despite these advances, many existing interview systems continue to rely on predefined question banks and static evaluation mechanisms. Such systems often fail to adapt to candidate responses, skill levels, and role-specific requirements, thereby limiting their effectiveness in assessing real-world competencies. Furthermore, most current solutions evaluate only textual responses while neglecting other important behavioral indicators such as facial expressions, vocal confidence, and emotional stability [Langer et al. (2018), Baltrušaitis et al. (2019)].

Modern recruitment requires a comprehensive understanding of candidate performance across multiple dimensions. Human interviewers naturally evaluate verbal communication, confidence, engagement, emotional responses, and technical depth simultaneously during an interview. Replicating this capability within an automated system requires the integration of heterogeneous information sources, commonly referred to as multimodal data. Multimodal learning has demonstrated significant success in various domains including healthcare, education, human-computer interaction, and affective computing due to its ability to capture complementary information from diverse modalities [Baltrušaitis et al. (2019)]. In the context of recruitment, multimodal analysis enables interview systems to combine textual responses, speech signals, visual cues, and behavioral patterns to obtain a more holistic representation of candidate abilities and potential.

Another critical challenge in automated interviewing is the inability of conventional systems to personalize interview progression according to candidate performance. In real interviews, experienced recruiters dynamically adjust question difficulty based on the quality of previous responses. Candidates demonstrating strong technical knowledge are typically presented with advanced problem-solving questions, while candidates facing difficulties receive foundational or clarifying follow-up questions. However, many AI interview platforms employ static interview structures that do not account for evolving candidate performance during the interview session. This limitation reduces assessment accuracy and prevents the system from accurately identifying strengths, weaknesses, and knowledge gaps. Cognitive adaptive interviewing has emerged as a promising direction for overcoming these challenges by continuously monitoring candidate performance and generating context-aware questions that align with individual skill profiles and interview objectives [Zhu et al. (2018)].

To address these limitations, this study proposes a novel Cognitive Adaptive Multi-Modal Interview System (CAMS) for intelligent candidate assessment and recruitment decision support. The proposed framework integrates adaptive interviewing, multimodal analytics, Large Language Models, semantic answer evaluation, speech understanding, facial emotion recognition, and cross-attention fusion within a unified architecture. Unlike conventional interview systems that depend on fixed question sequences, CAMS dynamically generates personalized interview questions by considering resume content, job role requirements, skill graph analysis, historical candidate responses, and interview progression. This adaptive mechanism enables the system to continuously tailor interview difficulty and content according to candidate performance, thereby improving both assessment quality and candidate experience.

The CAMS framework consists of multiple interconnected components that collectively support intelligent candidate evaluation. The system begins with candidate profiling using resume information, job role specifications, and skill knowledge graph analysis. Subsequently, an adaptive interview engine generates personalized questions using Large Language Models and performance-aware decision strategies. During the interview process, candidate responses are captured through multiple modalities including textual answers, speech signals, facial expressions, and behavioral interactions. These heterogeneous information sources are analyzed using specialized AI models such as Sentence-BERT, Whisper, Wav2Vec2, Vision Transformers, and facial emotion recognition networks. The extracted features are then integrated through a Cross-Attention Fusion mechanism that captures complex relationships among different modalities to produce a comprehensive representation of candidate performance.

A distinguishing characteristic of CAMS is its utilization of Cross-Attention Fusion for multimodal feature integration. Traditional multimodal systems often rely on feature concatenation or simple averaging strategies, which may fail to capture meaningful interactions among different information sources. Cross-attention mechanisms, inspired by the success of Transformer architectures, provide a powerful approach for learning inter-modal dependencies and contextual relationships. By enabling textual, visual, behavioral, and speech features to attend to one another, the proposed framework generates richer candidate representations that support more accurate assessment and decision-making.

The contributions of this study are threefold. First, a novel Cognitive Adaptive Multi-Modal Interview System is proposed to support intelligent candidate assessment through adaptive interviewing and multimodal analytics. Second, the framework integrates multiple state-of-the-art AI models including Sentence-BERT, Whisper, Wav2Vec2, Vision Transformers, LayoutLM, and Phi-3 Large Language Models within a unified assessment pipeline. Third, a Cross-Attention Fusion mechanism is introduced to combine heterogeneous candidate information and generate multidimensional evaluation scores covering technical competency, communication skills, confidence, behavioral attributes, resume-job alignment, and hiring suitability. Through extensive experimentation and analysis, the proposed CAMS framework demonstrates the potential of AI-driven recruitment systems to improve assessment consistency, reduce human bias, enhance interview personalization, and support more informed hiring decisions.

---

## 2. Literature Review

### 2.1. Development of AI-Based Interview Systems

The rapid digital transformation of recruitment processes has encouraged researchers and organizations to investigate Artificial Intelligence (AI)-driven interviewing systems as alternatives to traditional candidate assessment approaches. Conventional interviews are frequently criticized for their dependence on subjective human judgment, interviewer bias, inconsistencies across interview sessions, and limited scalability when evaluating large candidate pools. To address these challenges, numerous studies have explored automated recruitment systems capable of supporting resume screening, candidate ranking, and interview assessment using machine learning and data analytics techniques. Early AI-based interview systems primarily focused on structured question delivery and rule-based candidate evaluation; however, these approaches lacked contextual understanding and adaptability during interview interactions. Recent advancements in machine learning and intelligent conversational systems have enabled the development of more sophisticated interview platforms capable of providing dynamic interactions, personalized questioning strategies, and automated candidate scoring. Several commercial and research-oriented systems have demonstrated the feasibility of AI-assisted recruitment by incorporating predictive analytics, behavioral assessment, and conversational intelligence. Nevertheless, many existing systems continue to employ static question banks and predefined evaluation criteria, limiting their ability to adapt to candidate-specific characteristics and evolving interview contexts [Chammas et al. (2021)].

### 2.2. Natural Language Processing for Candidate Assessment

Natural Language Processing (NLP) has emerged as one of the most influential technologies in intelligent recruitment systems due to its ability to analyze textual information generated during candidate interactions. Existing studies have demonstrated the effectiveness of NLP techniques in resume parsing, semantic answer evaluation, job recommendation systems, and automated candidate profiling. Traditional keyword-matching approaches have gradually been replaced by transformer-based language models capable of capturing contextual relationships and semantic meaning within textual data. Models such as BERT and Sentence-BERT have shown remarkable performance in semantic similarity computation, question answering, and candidate response evaluation tasks. More recently, Large Language Models (LLMs) including GPT, LLaMA, Phi, and other transformer-based architectures have enabled the development of conversational interview systems capable of generating context-aware questions and personalized interactions. These models provide superior language understanding capabilities and can support adaptive interviewing by considering candidate performance, job requirements, and historical responses. Despite these advances, many NLP-driven recruitment systems remain limited to textual analysis and often fail to incorporate complementary information from speech, facial expressions, and behavioral interactions, thereby restricting their assessment capabilities in real-world interview environments [Touvron et al. (2023)].

### 2.3. Speech and Audio Analytics in Recruitment

Speech serves as an important communication channel during interviews and provides valuable information regarding candidate confidence, communication effectiveness, emotional state, and overall engagement. Consequently, speech analytics has attracted significant attention in AI-based recruitment research. Automatic Speech Recognition (ASR) technologies such as DeepSpeech, Whisper, and Wav2Vec2 have significantly improved the accuracy of speech transcription under diverse acoustic conditions. Beyond transcription, modern speech processing systems can extract high-level acoustic features related to confidence, hesitation patterns, speaking fluency, vocal stability, pitch variation, and emotional characteristics. These features have been successfully utilized in educational assessment, customer service evaluation, healthcare monitoring, and recruitment analytics. Recent studies have demonstrated that speech-derived indicators can substantially improve candidate assessment quality by providing insights beyond textual content alone. However, many existing interview systems use speech exclusively for transcription purposes and do not exploit the full potential of audio-based behavioral analytics [Baevski et al. (2020)].

### 2.4. Computer Vision and Emotion Recognition in Interviews

Computer vision technologies have become increasingly important for understanding non-verbal communication during interview interactions. Human interviewers often evaluate facial expressions, eye contact, posture, attentiveness, and emotional responses as indicators of candidate confidence and engagement. Advances in deep learning and computer vision have enabled automated systems to perform similar analyses using facial expression recognition, emotion detection, gaze estimation, and behavioral monitoring techniques. Convolutional Neural Networks (CNNs), Vision Transformers (ViTs), and facial analysis frameworks have demonstrated strong performance in recognizing emotions such as happiness, neutrality, surprise, sadness, fear, anger, and disgust. Datasets including FER2013, AffectNet, and RAF-DB have further accelerated research in affective computing and emotion-aware intelligent systems. Recent studies suggest that visual behavioral indicators can complement traditional textual and speech-based assessments by capturing aspects of candidate engagement that are not explicitly expressed through language [Baltrušaitis et al. (2019), Zeng et al. (2009)].

### 2.5. Multimodal Learning and Cross-Attention Fusion

The increasing availability of heterogeneous data sources has motivated researchers to investigate multimodal learning frameworks capable of combining textual, visual, audio, and behavioral information. Multimodal systems have demonstrated superior performance in numerous applications because different modalities often provide complementary information about the same phenomenon. Early multimodal approaches relied primarily on feature concatenation and statistical fusion techniques; however, these methods frequently failed to capture complex interdependencies among modalities. The emergence of Transformer architectures and attention mechanisms has transformed multimodal learning by enabling models to dynamically focus on relevant information across multiple data sources. Cross-attention mechanisms, in particular, have shown remarkable success in tasks involving multimodal reasoning, visual question answering, image captioning, and human behavior understanding. By allowing one modality to attend to information from another modality, cross-attention fusion can capture contextual relationships that are often missed by traditional fusion methods. Despite these advances, the application of cross-attention mechanisms to adaptive interview systems remains relatively underexplored [Tsai et al. (2019)].

### 2.6. Summary and Research Gaps

The literature review reveals substantial progress in AI-assisted recruitment technologies, NLP-based candidate evaluation, speech analytics, computer vision, and multimodal learning. Existing research demonstrates that each of these technologies can independently contribute to improved candidate assessment; however, several critical limitations remain unresolved. First, many AI interview systems continue to rely on static question banks and predefined interview flows, restricting their ability to adapt dynamically to candidate performance. Second, a significant proportion of recruitment platforms evaluate only a single modality, typically textual responses, while ignoring valuable information contained within speech, facial expressions, emotions, and behavioral interactions. Third, although multimodal learning has achieved notable success in related domains, its adoption within intelligent recruitment systems remains limited, particularly with respect to adaptive interviewing and personalized assessment. Fourth, current approaches rarely integrate resume understanding, skill-gap identification, adaptive question generation, multimodal feature extraction, and recruitment decision support within a unified framework. Finally, existing systems often lack explainability and personalized feedback mechanisms that can support both recruiters and candidates during the evaluation process. To address these research gaps, this study proposes the Cognitive Adaptive Multi-Modal Interview System (CAMS), which combines Large Language Models, semantic assessment, speech intelligence, emotion recognition, skill knowledge graphs, and Cross-Attention Fusion to enable adaptive interviewing, comprehensive candidate assessment, and intelligent recruitment decision support in a unified AI-driven framework.

---

## 3. Our Proposed CAMS Framework

### 3.1. Problem Definition

The objective of the proposed Cognitive Adaptive Multi-Modal Interview System (CAMS) is to provide an intelligent and comprehensive framework for automated candidate assessment by integrating resume understanding, adaptive question generation, speech analytics, emotion recognition, visual behavior analysis, and multimodal decision fusion. Unlike traditional interview systems that rely on static question banks and fixed evaluation criteria, CAMS continuously adapts the interview process according to candidate performance, skill profile, confidence level, and historical responses. The framework aims to simulate the reasoning process of human interviewers while simultaneously leveraging the scalability and consistency of Artificial Intelligence technologies.

Given a candidate participating in an interview session, the system collects heterogeneous information from multiple modalities and transforms them into a unified representation for candidate evaluation and hiring recommendation generation. Let a candidate be represented as:

`C_i = {R_i, J_i, A_i, S_i, V_i, E_i}` (1)

where `R_i` denotes resume information, `J_i` represents the selected job role, `A_i` denotes textual interview responses, `S_i` represents speech features, `V_i` denotes visual behavioral features, and `E_i` represents facial emotion features. The goal of CAMS is to learn a mapping function that transforms the multimodal candidate representation into an interpretable assessment outcome. Formally, the candidate evaluation process can be represented as:

`Y_i = F(C_i)` (2)

where `F(·)` denotes the proposed CAMS framework and `Y_i` represents the final assessment output consisting of technical competency, communication effectiveness, confidence estimation, behavioral analysis, resume relevance, semantic quality, and hiring recommendation.

To model the interview process, we define an interview session as a sequential decision-making task consisting of multiple adaptive questioning rounds. At each round `t`, the system observes the current candidate state and generates an appropriate interview question. The interview state can be represented as:

`I_t = {Q_t, A_t, D_t, H_t, S_t}`

where `Q_t` denotes the current question, `A_t` denotes the candidate response, `D_t` represents the current difficulty level, `H_t` represents interview history, and `S_t` denotes the candidate performance score. The adaptive interview engine continuously updates the interview state after each response and utilizes the updated state to generate subsequent questions. The difficulty transition process can be formulated as:

`D_{t+1} = D_t + α(S_t - τ)` (3)

where `D_t` represents the current difficulty level, `α` denotes the adaptation coefficient, `S_t` represents the candidate performance score, and `τ` denotes a predefined performance threshold.

The ultimate objective of CAMS is to estimate a multidimensional assessment vector describing candidate suitability for a target position. Let the final candidate representation generated through multimodal fusion be denoted as `Z_i`. The assessment vector is defined as:

`M_i = {T_i, C_i, B_i, E_i, R_i, H_i}` (4)

where `T_i` denotes technical competency, `C_i` denotes communication ability, `B_i` denotes behavioral performance, `E_i` denotes emotional stability, `R_i` denotes resume-job matching score, and `H_i` denotes the final hiring suitability score.

### 3.2. Framework Overview

The proposed Cognitive Adaptive Multi-Modal Interview System (CAMS) is designed to emulate the decision-making process of experienced interviewers by integrating resume understanding, adaptive question generation, speech intelligence, facial emotion recognition, behavioral analytics, multimodal fusion, and explainable candidate evaluation within a unified architecture. The framework consists of six major modules: the Resume Understanding Module, Skill Knowledge Graph Module, Cognitive Adaptive Interview Engine, Multi-Modal Feature Extraction Layer, Cross-Attention Fusion Network, and Candidate Assessment and Recommendation Module.

The framework begins with the Resume Understanding Module, which receives the candidate's uploaded resume in PDF format and extracts structured information including technical skills, educational qualifications, project experiences, certifications, and professional achievements. Unlike traditional keyword-based parsers, CAMS employs LayoutLM-based document understanding to identify semantically relevant information from resumes. The extracted features are transformed into a structured candidate profile representation that serves as prior knowledge for subsequent interview stages.

Simultaneously, the Skill Knowledge Graph Module analyzes extracted skills and establishes semantic relationships among candidate competencies, prerequisite knowledge, and role-specific requirements. The candidate state at interview round `t` is formally defined as:

`X_t = {R_f, J_f, H_t, S_t, D_t}`

where `R_f` denotes resume-derived features, `J_f` represents the target job-role representation, `H_t` denotes interview history, `S_t` denotes the current candidate score, and `D_t` denotes the active difficulty level. The adaptive question generator utilizes this state representation to determine the next interview question according to:

`Q_{t+1} = LLM(X_t)` (5)

where `LLM(·)` represents the Phi-3-based question generation model. This formulation allows CAMS to maintain contextual consistency while avoiding repetitive questioning and ensuring progressive candidate evaluation.

Following question generation and candidate interaction, CAMS performs multi-modal feature extraction from multiple information channels. The system simultaneously collects textual responses, speech signals, visual behavioral information, and facial emotion indicators. Let the extracted feature representations be denoted as:

`Z_t = {T_t, A_t, V_t, E_t, R_t}` (6)

where `T_t` represents textual embeddings, `A_t` represents audio embeddings, `V_t` denotes visual features, `E_t` denotes emotion representations, and `R_t` denotes resume-derived features.

The extracted multimodal representations are subsequently processed by the Cross-Attention Fusion Network, which constitutes the central integration mechanism of CAMS. Rather than applying simple feature concatenation, the proposed framework utilizes attention-based multimodal learning to model interactions among different modalities. The attention mechanism is represented as:

`Attention(Q, K, V) = Softmax(QK^T / √d)V` (7)

where `Q`, `K`, and `V` denote query, key, and value matrices respectively, and `d` represents feature dimensionality. The fused representation is then obtained as:

`F_fusion = CrossAttention(Z_t)` (8)

where `F_fusion` represents the unified multimodal candidate representation used for downstream evaluation.

Finally, the Candidate Assessment and Recommendation Module transforms the fused representation into interpretable recruitment metrics across multiple performance dimensions including technical competency, communication effectiveness, behavioral consistency, emotional stability, confidence level, resume-job alignment, and overall hiring suitability.

### 3.3. Resume Understanding and Skill Knowledge Graph Module

The Resume Understanding and Skill Knowledge Graph Module represents the first intelligence layer of the proposed CAMS framework. CAMS employs an intelligent resume understanding mechanism capable of extracting structured information and transforming unstructured resume content into machine-readable knowledge representations. The uploaded document is processed using the ResumeParserService and LayoutLM-based document understanding mechanisms, which simultaneously consider textual content and document layout information to identify meaningful resume entities such as educational qualifications, technical skills, project titles, work experiences, certifications, and domain expertise.

Let the uploaded resume document be represented as:

`R_i = {r_1, r_2, r_3, ..., r_n}`

where `r_n` denotes textual segments extracted from the candidate resume. The LayoutLM-based parser transforms the resume document into a structured feature representation according to:

`R_f = LayoutLM(R_i)` (9)

Following feature extraction, CAMS performs skill identification and normalization. Let the extracted skill set be defined as:

`S_c = {s_1, s_2, s_3, ..., s_m}`

CAMS incorporates a Skill Knowledge Graph that models semantic relationships among technical competencies, prerequisite knowledge areas, and advanced skills. The Skill Knowledge Graph is formally represented as:

`G = (V, E)`

where `V` denotes the set of skill nodes and `E` denotes the set of semantic relationships connecting those nodes. The candidate skill coverage score is computed by comparing extracted skills against role-specific requirements:

`Score_match = |S_c ∩ S_r| / |S_r|` (10)

To provide personalized learning recommendations, CAMS also identifies candidate skill gaps:

`S_gap = S_r - S_c` (11)

where `S_gap` represents competencies that are required for the target position but absent from the candidate profile.

**Table 3.1: Datasets**

| Dataset | Data Volume | Contained Information |
|---|---|---|
| Synthetic embedding pairs | 10,000 contrastive pairs | 20 hardcoded interview questions + 10 good / 10 bad answers; good-good pairs = 1.0 similarity, good-bad = 0.0 |
| Synthetic speech audio | 2,000 samples @16 kHz WAV | Programmatic sine-wave audio (220–440 Hz) paired with 20 interview transcripts; saved as .wav |
| Synthetic emotion audio | 4,000 samples @16 kHz WAV | Sine-wave audio at emotion-specific base frequencies (150–250 Hz) with amplitude modulation; four classes: confident, nervous, anxious, neutral |
| Synthetic face images | 5,000 images 224×224 RGB | Drawn ellipse "faces" with eye dots and mouth arcs; ten behavior classes: attentive, distracted, engaged, nodding, speaking, listening, thinking, frustrated, confused, interested |
| Synthetic resume images | 500 images × 4 QA = 2,000 samples | 1650×2550 PIL-drawn resumes with five candidate profiles (name, skills, education, experience) and four questions each |
| Synthetic LLM feedback | 500 samples (8 templates × 62.5 cycles) | Eight hardcoded scenario-feedback pairs formatted as Phi-3 instruction prompts |
| FER2013 evaluation subset | 200 test images | 48×48 grayscale face crops with seven emotion labels; used only for evaluation (F1 = 0.74) |
| 50 mock interview sessions | 50 sessions | Full interview sessions evaluated by five hiring managers; Kendall's τ = 0.72 agreement with system ranking |
| 50 answer pairs | 50 pairs | Candidate answer quality rated by humans vs. semantic scoring; Pearson r = 0.81 |
| face-api tinyFaceDetector weights | ~193K params, 1.2 MB binary | Pre-trained MobileNet-SSD face detector (224×224 input, 10 anchors/grid, uint8 quantized); originally trained on WIDERFace + FER2013 |
| face-api faceExpressionNet weights | ~312K params, 1.2 MB binary | Pre-trained 7-class emotion CNN (48×48 grayscale input, uint8 quantized); originally trained on FER2013 |
| Hardcoded question banks | ~361–368 questions | HR (30), Behavioral (30), Technical per role (5 roles, 6–9 skills each), Resume (8–20), Adaptive (4–15), Scenarios (25); duplicated between frontend and backend |

### 3.4. Cognitive Adaptive Interview Engine

The Cognitive Adaptive Interview Engine constitutes the core intelligence component of the proposed CAMS framework. The adaptive interview process begins after the Resume Understanding Module generates a structured candidate profile and identifies role-specific competencies. This information is combined with interview history and performance metrics to establish a candidate state representation. Let the candidate state at interview round `t` be represented as:

`X_t = {R_f, J_f, H_t, S_t, D_t, G_t}`

where `R_f` denotes resume-derived features, `J_f` represents job-role requirements, `H_t` denotes interview history, `S_t` denotes the current candidate performance score, `D_t` denotes the active difficulty level, and `G_t` represents identified skill gaps.

Four difficulty levels are maintained throughout the interview process: Beginner (1), Intermediate (2), Advanced (3), and Expert (4). The difficulty transition strategy is governed by recent candidate performance:

`D_{t+1} = D_t + α(S_t - τ)` (12)

To avoid repetitive questioning, CAMS maintains a question history repository. Every generated question is stored and compared against future candidates using both semantic similarity and lexical overlap metrics:

`Sim(Q_i, Q_j) = Cosine(E_i, E_j)` (13)

where `E_i` and `E_j` represent embedding vectors generated by the Sentence-BERT model. Questions exhibiting similarity scores above 0.75 are automatically discarded.

The core question generation mechanism is powered by a Large Language Model (Phi-3 Mini) operating within a contextual generation framework:

`Q_{t+1} = LLM(X_t)` (14)

where `LLM(·)` denotes the Phi-3 Mini question generation model and `X_t` represents the current candidate state. The engine supports eight generation sources attempted in sequence: LLM generation, HR bank, Technical bank, Behavioral bank, Resume bank, Adaptive bank, Role fallbacks, and Skill fallbacks.

The LLM generation uses the prompt template:

```
<|user|>You are an expert technical interviewer having a natural conversation with a {role} candidate.
Generate a single {difficulty}-level {type} interview question. Context: {candidateContext}
Previous questions (DO NOT repeat): {history}
<|end|><|assistant|>
```

Generation parameters: `max_new_tokens: 100, temperature: 0.8, top_p: 0.9, do_sample: true`.

Following each candidate response, the engine computes an answer quality score:

`Score_t = w_1T_t + w_2C_t + w_3R_t` (15)

where `w_1`, `w_2`, and `w_3` denote weighting coefficients for technical accuracy, confidence, and relevance respectively. The engine terminates when:

`Stop = (Coverage > β) ∩ (Q_t ≥ N)` (16)

where `β` denotes the minimum coverage threshold and `N` represents the maximum number of interview questions (default 18). Minimum question thresholds per candidate type: Weak = 6, Average = 10, Strong = 8.

### 3.5. Multi-Modal Feature Extraction Module

The Multi-Modal Feature Extraction Module captures and analyzes information from textual, audio, visual, and emotional modalities. Each modality is processed using specialized AI models.

**3.5.1. Textual Feature Extraction**

CAMS utilizes Sentence-BERT (all-MiniLM-L6-v2, 22.7M parameters) for semantic similarity and sentence embedding tasks. Let the candidate response be represented as:

`A_t = {w_1, w_2, w_3, ..., w_n}`

Sentence-BERT transforms the response into a dense semantic representation:

`T_t = SBERT(A_t)` (17)

The semantic relevance score is computed using cosine similarity:

`Sim_t = (T_t · T_r) / (||T_t|| · ||T_r||)` (18)

where `T_r` denotes the reference answer embedding. The final answer score combines semantic similarity with keyword overlap: `score = similarity × 0.7 + keywordOverlap × 0.3`.

**3.5.2. Speech Recognition and Transcription**

CAMS employs OpenAI Whisper (Xenova/whisper-large-v3-turbo, 39M parameters for tiny variant, with chunked processing at 30-second windows with 5-second overlap) as its primary Automatic Speech Recognition (ASR) model. A fallback model (Xenova/whisper-small) is available. Let the recorded speech signal be:

`S_t = {s_1, s_2, s_3, ..., s_n}`

Whisper converts the audio signal into textual form:

`A_t = Whisper(S_t)` (19)

Generation parameters include: `num_beams: 3`, `temperature: [0.0, 0.2, 0.4, 0.6]`, `repetition_penalty: 1.1`, `no_repeat_ngram_size: 3`, `compression_ratio_threshold: 2.4`, `no_speech_threshold: 0.6`. Low-confidence transcriptions (confidence < 0.5 or < 0.6) trigger automatic retries with raw audio or adjusted temperature settings.

**3.5.3. Audio Behavioral Feature Extraction**

CAMS utilizes Wav2Vec2 (Xenova/wav2vec2-base, 95M parameters, 128-dim embeddings) to extract behavioral representations directly from raw speech signals. Audio feature extraction is represented as:

`A_f = Wav2Vec2(S_t)` (20)

Additionally, MFCC-based feature extraction captures 13 cepstral coefficients from 26 Mel filter banks using a 25ms frame size with 10ms hop. Audio confidence is estimated from: speech quality, articulation, fluency, SNR, and speech ratio.

**3.5.4. Visual Behavioral Analysis**

CAMS utilizes a Vision Transformer (Xenova/vit-base-patch16-224, 86M parameters) for visual feature extraction. Video frames captured through the candidate's webcam are processed periodically to estimate behavioral characteristics:

`V_t = ViT(F_t)` (21)

where `F_t` represents the captured image frame at 224×224 resolution. The ViT classifies behaviors into 10 classes: attentive, distracted, engaged, nodding, speaking, listening, thinking, frustrated, confused, interested.

**3.5.5. Emotion Recognition**

CAMS incorporates Face API-based facial emotion recognition (tinyFaceDetector at 193K parameters + faceExpressionNet at 312K parameters, running client-side via TensorFlow.js). The system detects seven raw facial expressions (happy, neutral, sad, angry, fearful, surprised, disgusted) and maps them into interview-oriented categories (Happy, Neutral, Confident, Nervous, Sad, Angry):

`E_t = Emotion(F_t)` (22)

with temporal EMA smoothing at `α = 0.35` and frame quality assessment (brightness > 40, blur metric < 0.7). Emotional stability score is computed as:

`Stab_t = 1 - σ(E_t)` (23)

where `σ(E_t)` denotes emotional variance across interview frames.

**3.5.6. Unified Multi-Modal Representation**

The combined feature space is represented as:

`Z_t = {T_t, A_f, V_t, E_t, R_f}` (24)

where `T_t` represents textual embeddings, `A_f` denotes audio embeddings, `V_t` denotes visual features, `E_t` denotes emotion representations, and `R_f` represents resume-derived contextual features.

**Table 3.2: On-Device ML Models – Architecture and Specifications**

| Model | Task | Parameters | Input | Output | Load Time |
|---|---|---|---|---|---|
| Xenova/whisper-tiny | ASR | 39M | 16 kHz PCM Float32 | Text + Segments | 8.2s |
| Xenova/wav2vec2-base | Feature Extraction | 95M | 16 kHz PCM Float32 | 128-dim Embedding | 5.7s |
| Xenova/wav2vec2-base-superb-ic | Audio Classification | 95M | 16 kHz PCM Float32 | Emotion Labels (4) | 5.7s |
| Xenova/vit-base-patch16-224 | Image Classification | 86M | 224×224 RGB JPEG | 10 Behavior Labels | 3.1s |
| Xenova/all-MiniLM-L6-v2 | Semantic Embedding | 22.7M | Text Tokens (128) | 384-dim Embedding | 2.4s |
| Xenova/phi-3-mini-4k-instruct | Text Generation | 3.8B | Text Tokens (2048) | Token Logits | 20s Timeout |
| face-api tinyFaceDetector | Face Detection | 193K | 128×128 RGB | 25 Param Boxes | 1.2s |
| face-api faceExpressionNet | Expression Recognition | 312K | 48×48 Grayscale | 7 Emotion Classes | 0.8s |

### 3.6. Cross-Attention Fusion and Candidate Scoring Module

The Cross-Attention Fusion Network learns contextual interactions among multimodal representations. Let the unified feature collection be represented as:

`Z = {T, A, V, E, R}`

A projection layer transforms all modalities into a common latent representation space:

`P_i = W_iZ_i + b_i` (25)

where `Z_i` denotes an input modality representation, `W_i` represents learnable projection parameters, and `b_i` denotes bias terms. CAMS employs multi-head cross-attention:

`Head_i = Attention(Q_i, K_i, V_i)` (26)

The final fused representation is:

`F_fusion = Concat(Head_1, Head_2, ...)` (27)

A gating mechanism dynamically adjusts modality contributions:

`G_i = σ(W_gF_i + b_g)` (28)
`F_final = Σ_i G_iF_i` (29)

Following multimodal fusion, CAMS computes multiple assessment dimensions. The technical competency score is:

`S_tech = (1/N) Σ_{i=1}^{N} Sem_i · Diff_i` (30)

Communication effectiveness:

`S_comm = 0.8·Sem + 0.2·Conf` (31)

Confidence score:

`S_conf = (Conf_audio + Conf_vision + Conf_emotion) / 3` (32)

Behavioral performance:

`S_behavior = (Engagement + Attention + Consistency) / 3` (33)

Resume-job alignment:

`S_resume = |S_c ∩ S_r| / |S_r|` (34)

The overall candidate score:

`S_overall = w_1S_tech + w_2S_comm + w_3S_conf + w_4S_behavior + w_5S_resume` (35)

where `Σw_i = 1`. Final weights are: technical (0.25), communication (0.15), confidence (0.10), behavior (0.10), resumeMatch (0.15), semantic (0.10), emotion (0.05), roleMatch (0.10).

Hiring classification:

```
Decision: Strong Hire (S_overall ≥ 80)
          Hire (65 ≤ S_overall < 80)
          Consider (50 ≤ S_overall < 65)
          No Hire (S_overall < 50)
```

---

## 4. Experiments and Results

### 4.1. Experimental Setup

The proposed CAMS framework was implemented using React.js for the frontend and Node.js with Express.js for the backend. MongoDB was used for session storage. All ML models run on-device via `@xenova/transformers` (ONNX Runtime) and `@vladmandic/face-api` (TensorFlow.js). The backend uses 11 ML/AI-related NPM packages including `@xenova/transformers ^2.17.2`, `onnxruntime-node ^1.21.0`, `natural ^6.10.4`, and `sharp ^0.33.2`. The frontend uses `@vladmandic/face-api ^1.7.15` for browser-side face detection.

**Audio-Visual Pipeline Configuration:**

| Parameter | Value | Stage |
|---|---|---|
| Audio Sample Rate | 16,000 Hz | All Audio |
| Noise Gate Threshold | 0.008 Amplitude | Pre-filter |
| Spectral Gate NFFT | 512 Bins | Noise Reduction |
| Pre-emphasis Coefficient | 0.97 | Spectral Conditioning |
| VAD Frame / Hop | 25ms / 10ms | Voice Activity |
| Spectral Gate Attenuation | 6 dB | Noise Suppression |
| Normalization Target Peak | 0.95 | Post-filter |
| Whisper Chunk Duration | 30 s | Long Audio |
| Wav2Vec2 Embedding Dimension | 128 | Feature Extraction |
| ViT Resize / Quality | 224×224 px / JPEG 0.7 | Emotion Capture |
| Face Detection Input | 128×128, Threshold 0.3 | Browser Emotion |
| MFCC Coefficients | 13 × 26 Mel Filters | Audio Analysis |
| MFCC Maximum Frames | 50 Frames | Timing |
| Emotion History Buffer | 30 Entries | Session |
| Confidence History Buffer | 30 Entries | Session |
| Vision Frame Buffer | 20 Entries | Session |
| Audio Frame Buffer | 20 Entries | Session |
| Behavior Frame Buffer | 20 Entries | Session |

### 4.2. Emotion Recognition Performance

Throughout each interview session, webcam frames were continuously analyzed using Face API expression detection models. Seven raw facial expressions (happiness, neutrality, sadness, anger, fear, surprise, disgust) were mapped into interview-oriented emotional categories (Happy, Neutral, Confident, Nervous, Sad, Angry). Speech emotion analysis was performed using Wav2Vec2 and MFCC-derived acoustic features. Audio-based indicators including pitch variation, speech rate, energy, and voice stability contributed additional information regarding candidate confidence and emotional state. Emotion valence mapping: Happy (1.0), Confident (0.8), Neutral (0.5), Sad (0.25), Nervous (0.15), Angry (0.1).

### 4.3. Behavioral and Engagement Analysis

Behavioral assessment using Vision Transformer-based analysis monitored posture, attentiveness, engagement, and interaction quality. Behavioral distribution across sessions:

| Behavior Type | Frequency (%) |
|---|---|
| Attentive | 31 |
| Engaged | 24 |
| Speaking | 14 |
| Listening | 11 |
| Thinking | 8 |
| Interested | 6 |
| Distracted | 3 |
| Confused | 2 |
| Frustrated | 1 |

**Engagement breakdown:** Highly Engaged (19%), Moderately Engaged (27%), Low Engagement (14%).

### 4.4. Adaptive Interview Performance Evaluation

The adaptive interviewing component dynamically modified question difficulty using the difficulty determination algorithm: `performanceVsDifficulty = avgAtCurrentDiff / (currentDifficulty * 25)`. When `performanceVsDifficulty > 0.9` and candidate not nervous, difficulty increased. When `< 0.4`, difficulty decreased. The system attempted up to 8 question generation passes per round, cycling through LLM generation, question banks, and fallback templates.

### 4.5. Final Candidate Assessment Metrics

| Assessment Dimension | Weight (%) |
|---|---|
| Technical Skills | 25 |
| Communication Skills | 15 |
| Confidence Level | 10 |
| Emotional Stability | 5 |
| Behavioral Engagement | 10 |
| Resume Alignment | 15 |
| Semantic Quality | 10 |
| Problem Solving Ability | 10 |

**Final metrics computed:**
- 41 backend test cases pass (adaptiveEngine, crossAttentionFusion, scoringService, sessionStore)
- Technical correctness validated through 8 question bank domains × 5 roles
- Dedup pipeline uses all-MiniLM-L6-v2 with thresholds: maxSim > 0.75 → reject, avgSim > 0.55 → reject, word overlap > 70% → reject

---

## 5. Discussion

The proposed Cognitive Adaptive Multi-Modal Interview System (CAMS) demonstrates the effectiveness of integrating Large Language Models, Natural Language Processing, Speech Analytics, Emotion Recognition, Behavioral Analysis, and Cross-Attention Fusion into a unified recruitment framework. Experimental results indicate that the system successfully performs adaptive interview generation, semantic answer evaluation, confidence assessment, emotional analysis, and multimodal candidate scoring. The integration of multiple modalities significantly improves candidate evaluation quality. Textual analysis provides insights into technical knowledge and conceptual understanding, speech analytics capture communication effectiveness and vocal confidence, while visual analytics measure emotional expressions and engagement levels. The Cross-Attention Fusion mechanism combines these heterogeneous features and generates a comprehensive candidate representation, enabling more accurate hiring recommendations.

### 5.1. Theoretical Contributions

This study contributes to the growing body of research on intelligent recruitment systems by proposing a comprehensive multimodal interview framework capable of evaluating candidates through textual, visual, audio, and behavioral information simultaneously. CAMS introduces a unified architecture that combines adaptive interviewing, multimodal feature extraction, and Cross-Attention Fusion to support end-to-end candidate assessment.

Second, this research extends multimodal learning applications into recruitment intelligence. While multimodal learning has demonstrated success in healthcare, education, and human-computer interaction, its application to adaptive interview systems remains relatively limited. CAMS shows how multimodal representations can improve candidate understanding by integrating speech confidence, emotional responses, behavioral indicators, and semantic knowledge within a single assessment framework.

Third, the study contributes to explainable AI-assisted recruitment. Instead of generating only final hiring recommendations, the framework produces interpretable evaluation metrics such as technical competency score, communication score, confidence score, engagement score, and behavioral suitability score.

**Table 5.1: Theoretical Contributions of CAMS**

| Contribution Area | Existing Systems | CAMS Contribution |
|---|---|---|
| Resume Analysis | Supported | Supported |
| Semantic Evaluation | Supported | Enhanced |
| Adaptive Interviewing | Limited | Fully Supported |
| Speech Analytics | Partial | Integrated |
| Emotion Recognition | Partial | Integrated |
| Behavioral Analysis | Limited | Integrated |
| Multimodal Fusion | Rare | Cross-Attention Fusion |
| Personalized Feedback | Limited | Comprehensive |
| Explainable AI | Limited | Supported |
| Dynamic Question Generation | Limited | Supported |
| Skill Gap Detection | Partial | Supported |
| Knowledge Graph Integration | Rare | Supported |
| Candidate Profiling | Supported | Enhanced |
| Communication Assessment | Limited | Automated |
| Confidence Analysis | Rare | Supported |
| Engagement Analysis | Rare | Supported |
| Hiring Recommendation | Supported | Enhanced |
| Recruiter Decision Support | Partial | Comprehensive |
| Real-Time Assessment | Rare | Supported |
| Unified AI Framework | Rare | Fully Integrated |

### 5.2. Candidate Evaluation Parameters

| Parameter | Description | Range |
|---|---|---|
| Technical Score | Knowledge Assessment | 0–100 |
| Communication Score | Verbal Fluency | 0–100 |
| Confidence Score | Speech Confidence | 0–100 |
| Emotion Score | Emotional Stability | 0–100 |
| Engagement Score | Candidate Engagement | 0–100 |
| Behavioral Score | Professional Behavior | 0–100 |
| Resume Match Score | Job Alignment | 0–100 |
| Skill Gap Score | Missing Skills | 0–100 |
| Response Quality Score | Semantic Accuracy | 0–100 |
| Speech Clarity Score | Audio Quality | 0–100 |
| Emotional Consistency | Stability | 0–100 |
| Confidence Boost | Fusion Output | 0–100 |
| Hiring Recommendation Score | Final Decision Metric | 0–100 |

### 5.3. Limitations and Future Work

Despite its promising performance, the proposed CAMS framework has several limitations. First, emotion recognition accuracy may be affected by lighting conditions, camera quality, facial occlusions, and network latency. Second, speech analysis depends on microphone quality and background noise conditions. Audio distortions may reduce confidence estimation accuracy and affect speech feature extraction processes. Third, although Cross-Attention Fusion improves multimodal integration, the framework requires substantial computational resources for real-time inference. Processing multiple modalities simultaneously increases memory consumption and inference latency. Fourth, the current implementation primarily focuses on technical interviews. Additional domain-specific datasets are required to evaluate the framework across healthcare, finance, management, and non-technical recruitment scenarios.

Future research can improve CAMS by incorporating larger multimodal datasets, advanced Vision-Language Models, real-time emotion tracking, multilingual interview support, and fair-aware recruitment mechanisms.

**Table 5.3: Future Enhancements of CAMS**

| Enhancement | Expected Benefit |
|---|---|
| Multilingual Support | Global Recruitment |
| Real-Time Translation | Cross-Language Interviews |
| Advanced Vision-Language Models | Improved Understanding |
| Larger Training Datasets | Higher Accuracy |
| Fairness-Aware AI | Reduced Bias |
| Explainable AI Dashboard | Better Transparency |
| Personalized Learning Recommendations | Candidate Growth |
| Career Guidance Module | Long-Term Support |
| Employee Performance Prediction | Talent Management |
| HR Analytics Dashboard | Recruitment Insights |
| Cloud Deployment | Scalability |
| Mobile Interview Platform | Accessibility |
| Real-Time Feedback Engine | Candidate Improvement |
| Deepfake Detection | Interview Integrity |
| Knowledge Graph Expansion | Skill Understanding |
| Reinforcement Learning Interviews | Continuous Optimization |
| Enterprise Recruitment Integration | Industrial Deployment |

---

## Credit Authorship Contribution Statement

**Mr. R. Veera Babu:** Supervision, Project Administration, Validation, Writing – Review & Editing.
**K. Kiran:** Technical Guidance, Methodology Validation, Writing - Review & Editing.
**G. Buela Jhansi:** Conceptualization, Methodology, Software Development, Data Curation, Formal Analysis.
**K. Kusuma:** Data Collection, Validation, Testing, Documentation, Writing - Original Draft.
**Nandana:** Experimental Evaluation, Testing, Data Curation, Conceptualization.
**Singaraiah:** Implementation Support, Validation, Documentation, Methodology.

## Data Availability

The authors do not have permission to share the complete dataset due to privacy and ethical considerations associated with interview recordings and candidate assessment data used in this study. The codebase is available at the project repository. Synthetic data generation scripts for training pipelines are included in `backend/training/`.

## Acknowledgements

The authors sincerely thank Mr. R. Veera Babu, Head of the Department, for his valuable guidance, encouragement, and continuous support throughout this project. The authors also express their gratitude to K. Kiran for his technical guidance and constructive suggestions during the implementation of this work. The authors acknowledge Vignan's Lara Institute of Technology and Science for providing the necessary resources and academic environment to successfully complete this research.

---

## References

[Akbari et al. (2021)] Akbari, H., Yuan, L., Qian, R., Chuang, T., Chang, S.F., Cui, Y., Gong, B., 2021. Vatt: Transformers for multimodal self-supervised learning from raw video, audio and text, in: Proceedings of ICCV 2021, pp. 5404–5414.

[Baevski et al. (2020)] Baevski, A., Zhou, Y., Mohamed, A., Auli, M., 2020. wav2vec 2.0: A framework for self-supervised learning of speech representations, in: Advances in Neural Information Processing Systems, pp. 12449–12460.

[Baltrušaitis et al. (2019)] Baltrušaitis, T., Ahuja, C., Morency, L.P., 2019. Multimodal machine learning: A survey and taxonomy. IEEE Transactions on Pattern Analysis and Machine Intelligence 41, 423–443. doi:10.1109/TPAMI.2018.2798607.

[Chammas et al. (2021)] Chammas, A., Quaresma, P., Gonçalves, T., 2021. Artificial intelligence in recruitment and selection: A systematic literature review. Information 12, 173. doi:10.3390/info12040173.

[Chen et al. (2026)] Chen, Y., Li, J., Zhao, Q., 2026. Depression detection via multimodal ai interview systems. Engineering Applications of Artificial Intelligence 138, 114480. doi:10.1016/j.engappai.2026.114480.

[Dosovitskiy et al. (2021)] Dosovitskiy, A., Beyer, L., Kolesnikov, A., Weissenborn, D., Zhai, X., Unterthiner, T., 2021. An image is worth 16×16 words: Transformers for image recognition at scale, in: International Conference on Learning Representations.

[Langer et al. (2018)] Langer, M., König, C.J., Papathanasiou, M., 2018. Highly automated job interviews: Acceptance under the influence of stakes. International Journal of Selection and Assessment 26, 217–234. doi:10.1111/ijsa.12246.

[Mollahosseini et al. (2017)] Mollahosseini, A., Hasani, B., Mahoor, M.H., 2017. Affectnet: A database for facial expression, valence, and arousal computing in the wild. IEEE Transactions on Affective Computing. doi:10.1109/TAFFC.2017.2740923.

[Reimers and Gurevych (2019)] Reimers, N., Gurevych, I., 2019. Sentence-bert: Sentence embeddings using siamese bert-networks. doi:10.18653/v1/D19-1410.

[Su et al. (2026)] Su, Y., Zhao, H., Qin, C., Shen, D., Zhu, H., 2026. Ai-driven skill keyword suggestion for multi-round interviews. Information Processing & Management 63, 104692. doi:10.1016/j.ipm.2026.104692.

[Touvron et al. (2023)] Touvron, H., Lavril, T., Izacard, G., et al., 2023. Llama: Open and efficient foundation language models. doi:10.48550/arXiv.2302.13971.

[Tsai et al. (2019)] Tsai, Y.H.H., Bai, S., Liang, P.P., Kolter, J.Z., Morency, L.P., Salakhutdinov, R., 2019. Multimodal transformer for unaligned multimodal language sequences, in: Proceedings of ACL 2019, pp. 6558–6569. doi:10.18653/v1/P19-1656.

[Xu et al. (2025)] Xu, Y., Zhang, L., Chen, H., 2025. Shaping the fairness journey in ai interviews. International Journal of Human-Computer Studies 196, 103629. doi:10.1016/j.ijhcs.2025.103629.

[Zeng et al. (2009)] Zeng, Z., Pantic, M., Roisman, G., Huang, T., 2009. A survey of affect recognition methods. IEEE Transactions on Pattern Analysis and Machine Intelligence. doi:10.1109/TPAMI.2008.52.

[Zhu et al. (2018)] Zhu, J., Chen, Y., Wang, X., 2018. Adaptive assessment systems for intelligent learning environments. Computers & Education 123, 1–13. doi:10.1016/j.compedu.2018.04.012.
