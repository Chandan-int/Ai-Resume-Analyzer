export const resumes: Resume[] = [
  {
    id: "1",
    companyName: "Google",
    jobTitle: "Frontend Developer",
    imagePath: "/images/resume_01.png",
    resumePath: "/resumes/resume-1.pdf",
    feedback: {
      overallScore: 85,
      ATS: {
        score: 90,
        tips: [],
      },
      toneAndStyle: {
        score: 90,
        tips: [],
      },
      content: {
        score: 90,
        tips: [],
      },
      structure: {
        score: 90,
        tips: [],
      },
      skills: {
        score: 90,
        tips: [],
      },
    },
  },
  {
    id: "2",
    companyName: "Microsoft",
    jobTitle: "Cloud Engineer",
    imagePath: "/images/resume_02.png",
    resumePath: "/resumes/resume-2.pdf",
    feedback: {
      overallScore: 55,
      ATS: {
        score: 90,
        tips: [],
      },
      toneAndStyle: {
        score: 90,
        tips: [],
      },
      content: {
        score: 90,
        tips: [],
      },
      structure: {
        score: 90,
        tips: [],
      },
      skills: {
        score: 90,
        tips: [],
      },
    },
  },
  {
    id: "3",
    companyName: "Apple",
    jobTitle: "iOS Developer",
    imagePath: "/images/resume_03.png",
    resumePath: "/resumes/resume-3.pdf",
    feedback: {
      overallScore: 75,
      ATS: {
        score: 90,
        tips: [],
      },
      toneAndStyle: {
        score: 90,
        tips: [],
      },
      content: {
        score: 90,
        tips: [],
      },
      structure: {
        score: 90,
        tips: [],
      },
      skills: {
        score: 90,
        tips: [],
      },
    },
  },
];

export const AIResponseFormat = `{
  "overallScore": 85,
  "ATS": {
    "score": 88,
    "tips": [
      {
        "type": "good",
        "tip": "Strong technical keywords matching job requirements"
      },
      {
        "type": "improve",
        "tip": "Use standard header titles for better parsing"
      }
    ]
  },
  "toneAndStyle": {
    "score": 80,
    "tips": [
      {
        "type": "good",
        "tip": "Action-oriented language",
        "explanation": "Your experience section uses active verbs like Developed, Built, and Deployed."
      },
      {
        "type": "improve",
        "tip": "Quantify project outcomes",
        "explanation": "Add specific metrics like latency reductions or user count scaling."
      }
    ]
  },
  "content": {
    "score": 82,
    "tips": [
      {
        "type": "good",
        "tip": "Relevant project highlights",
        "explanation": "Machine learning and deep learning implementations are highlighted clearly."
      },
      {
        "type": "improve",
        "tip": "Elaborate on business value",
        "explanation": "Detail how your machine learning models directly solved practical problems."
      }
    ]
  },
  "structure": {
    "score": 85,
    "tips": [
      {
        "type": "good",
        "tip": "Logical section arrangement",
        "explanation": "Education, Skills, and Projects are clearly organized."
      },
      {
        "type": "improve",
        "tip": "Consistent date alignment",
        "explanation": "Ensure right-aligned dates and locations use identical formatting."
      }
    ]
  },
  "skills": {
    "score": 90,
    "tips": [
      {
        "type": "good",
        "tip": "Modern technology stack",
        "explanation": "Prominent display of Python, PyTorch, Azure, and REST APIs."
      },
      {
        "type": "improve",
        "tip": "Categorize core competencies",
        "explanation": "Group tools into Languages, Frameworks, Cloud, and Databases."
      }
    ]
  }
}`;

export const prepareInstructions = ({
  jobTitle,
  jobDescription,
  AIResponseFormat: format = AIResponseFormat,
}: {
  jobTitle: string;
  jobDescription: string;
  AIResponseFormat?: string;
}) =>
  `You are an expert ATS (Applicant Tracking System) and resume reviewer.
Analyze the attached resume for the target job title "${jobTitle || "Software Engineer"}" and description "${jobDescription || "N/A"}".
Evaluate the candidate's resume carefully across ATS compatibility, Tone & Style, Content, Structure, and Skills.

IMPORTANT: You MUST reply ONLY with a valid JSON object matching this exact structure template:
${format}

Rules:
1. Provide realistic score numbers (0-100) based on actual resume quality.
2. Provide 3-4 detailed tips for each category. Each tip in toneAndStyle, content, structure, and skills MUST contain "type" ("good" or "improve"), "tip" (short summary title), and "explanation" (detailed explanation).
3. Do not wrap in extra markdown text outside the JSON object. Return raw valid JSON only.`;