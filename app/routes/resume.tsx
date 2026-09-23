import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import ATS from "~/components/ATS";
import Summary from "~/components/Summary";
import Details from "~/components/Details";
import { usePuterStore } from "~/lib/puter";
import { prepareInstructions } from "~/constants";

export const meta = () => [
  { title: "Resumind | Review" },
  { name: "description", content: "Detailed overview of your resume" },
];

const Resume = () => {
  const { auth, isLoading, fs, kv, ai } = usePuterStore();
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeStatus, setReanalyzeStatus] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated)
      navigate(`/auth?next=/resume/${id}`);
  }, [isLoading, auth.isAuthenticated, navigate, id]);

  const loadResume = async () => {
    const resume = await kv.get(`resume:${id}`);
    if (!resume) return;

    const data = JSON.parse(resume);
    setResumeData(data);

    const resumeBlob = await fs.read(data.resumePath);
    if (!resumeBlob) return;

    const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
    const resumeUrl = URL.createObjectURL(pdfBlob);
    setResumeUrl(resumeUrl);

    const imageBlob = await fs.read(data.imagePath);
    if (!imageBlob) return;
    const typedImageBlob = new Blob([imageBlob], { type: "image/png" });
    const imageUrl = URL.createObjectURL(typedImageBlob);
    setImageUrl(imageUrl);

    setFeedback(data.feedback);
    console.log({ resumeUrl, imageUrl, feedback: data.feedback });
  };

  useEffect(() => {
    if (id) {
      loadResume();
    }
  }, [id]);

  const handleReanalyze = async () => {
    if (!resumeData?.resumePath) return;
    setIsReanalyzing(true);
    setReanalyzeStatus("Re-analyzing resume with AI...");

    try {
      const feedbackResponse = await ai.feedback(
        resumeData.resumePath,
        prepareInstructions({
          jobTitle: resumeData.jobTitle || "",
          jobDescription: resumeData.jobDescription || "",
        })
      );

      let feedbackText = "";
      if (typeof feedbackResponse === "string") {
        feedbackText = feedbackResponse;
      } else if (feedbackResponse?.message?.content) {
        const rawContent = feedbackResponse.message.content;
        feedbackText =
          typeof rawContent === "string"
            ? rawContent
            : (rawContent[0] as { text: string })?.text || "";
      } else if ((feedbackResponse as any)?.text) {
        feedbackText = (feedbackResponse as any).text;
      } else if (typeof feedbackResponse === "object") {
        feedbackText = JSON.stringify(feedbackResponse);
      }

      let cleanJsonText = feedbackText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const firstBrace = cleanJsonText.indexOf("{");
      const lastBrace = cleanJsonText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanJsonText = cleanJsonText.substring(firstBrace, lastBrace + 1);
      }

      let parsed: any = JSON.parse(cleanJsonText);
      if (parsed && typeof parsed === "object") {
        if (parsed.feedback && typeof parsed.feedback === "object") {
          parsed = parsed.feedback;
        } else if (parsed.Feedback && typeof parsed.Feedback === "object") {
          parsed = parsed.Feedback;
        } else if (parsed.data && typeof parsed.data === "object") {
          parsed = parsed.data;
        }
      }

      const getCategory = (obj: any, keys: string[]) => {
        if (!obj || typeof obj !== "object") return null;
        for (const k of keys) {
          if (obj[k] !== undefined && obj[k] !== null) {
            const val = obj[k];
            if (typeof val === "number") {
              return { score: val, tips: [] };
            }
            if (typeof val === "object") {
              return {
                score: typeof val.score === "number" ? val.score : 75,
                tips: Array.isArray(val.tips) ? val.tips : (Array.isArray(val.suggestions) ? val.suggestions : []),
              };
            }
          }
        }
        return null;
      };

      const normalizeTips = (tipsList: any[]) => {
        if (!Array.isArray(tipsList)) return [];
        return tipsList.map((item: any) => {
          if (typeof item === "string") {
            return { type: "improve" as const, tip: item, explanation: item };
          }
          const type = item?.type === "good" ? ("good" as const) : ("improve" as const);
          const tip = item?.tip || item?.title || item?.suggestion || "Recommendation";
          const explanation = item?.explanation || item?.description || item?.detail || tip;
          return { type, tip, explanation };
        });
      };

      const atsData = getCategory(parsed, ["ATS", "ats", "atsScore"]);
      const toneData = getCategory(parsed, ["toneAndStyle", "tone_and_style", "tone", "style"]);
      const contentData = getCategory(parsed, ["content", "contentScore"]);
      const structData = getCategory(parsed, ["structure", "structureScore", "formatting"]);
      const skillsData = getCategory(parsed, ["skills", "skillsScore", "technicalSkills"]);

      const scores = [
        atsData?.score,
        toneData?.score,
        contentData?.score,
        structData?.score,
        skillsData?.score,
      ].filter((s): s is number => typeof s === "number");

      const calculatedAvg = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 75;

      const newFeedback: Feedback = {
        overallScore: typeof parsed?.overallScore === "number" ? parsed.overallScore : calculatedAvg,
        ATS: {
          score: atsData?.score ?? 75,
          tips: normalizeTips(atsData?.tips || []),
        },
        toneAndStyle: {
          score: toneData?.score ?? 75,
          tips: normalizeTips(toneData?.tips || []),
        },
        content: {
          score: contentData?.score ?? 75,
          tips: normalizeTips(contentData?.tips || []),
        },
        structure: {
          score: structData?.score ?? 75,
          tips: normalizeTips(structData?.tips || []),
        },
        skills: {
          score: skillsData?.score ?? 75,
          tips: normalizeTips(skillsData?.tips || []),
        },
      };

      const updatedData = { ...resumeData, feedback: newFeedback };
      await kv.set(`resume:${id}`, JSON.stringify(updatedData));
      setFeedback(newFeedback);
      setResumeData(updatedData);
    } catch (err) {
      console.error("Reanalysis error:", err);
      setReanalyzeStatus("Failed to re-analyze resume. Please try again.");
    } finally {
      setIsReanalyzing(false);
    }
  };

  return (
    <main className="!pt-0">
      <nav className="resume-nav flex flex-row items-center justify-between">
        <Link to="/" className="back-button">
          <img
            src="/icons/back.svg"
            alt="back arrow"
            className="w-2.5 h-2.5"
          />
          <span className="text-gray-800 text-sm font-semibold">
            Back to Homepage
          </span>
        </Link>
        <button
          onClick={handleReanalyze}
          disabled={isReanalyzing}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex flex-row items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isReanalyzing ? (
            <span>Re-analyzing...</span>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Re-analyze with AI</span>
            </>
          )}
        </button>
      </nav>
      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
          {imageUrl && resumeUrl && (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-w-xl:h-fit w-fit">
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-full"
              >
                <img
                  src={imageUrl}
                  className="w-full h-full object-contain rounded-2xl"
                  title="resume"
                  alt="resume preview"
                />
              </a>
            </div>
          )}
        </section>

        <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover">
          <div className="flex flex-row items-center justify-between">
            <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
          </div>
          {isReanalyzing && (
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow">
              <p className="text-lg font-semibold text-indigo-600 mb-2">{reanalyzeStatus}</p>
              <img src="/images/resume-scan.gif" alt="scanning" className="w-48" />
            </div>
          )}
          {!isReanalyzing && feedback ? (
            <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
              <Summary feedback={feedback} />
              <ATS
                score={feedback.ATS?.score || 0}
                suggestions={feedback.ATS?.tips || []}
              />
              <Details feedback={feedback} />
            </div>
          ) : !isReanalyzing && (
            <img
              src="/images/resume-scan-2.gif"
              alt="scanning"
              className="w-full"
            />
          )}
        </section>
      </div>
    </main>
  );
};

export default Resume;